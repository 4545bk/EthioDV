import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Entry from '../models/Entry.js';
import Payment from '../models/Payment.js';
import Settings from '../models/Settings.js';
import FormData from '../models/FormData.js';
import { sendTelegramAdminPhoto, sendTelegramAdminAlert } from '../services/telegram.js';
import { getPresignedDownloadUrl } from '../services/r2.js';
import { scanReceiptWithVisionAI, cleanTelebirrTxCode } from '../services/receiptOcr.js';
import { ENV } from '../config/env.js';

const router = express.Router();

/**
 * POST /api/v1/payments/scan-receipt
 * AI Vision OCR: Instantly extracts Txn ID, amount, and bank from receipt image
 */
router.post('/scan-receipt', authenticateToken, async (req, res, next) => {
  try {
    const { imageBase64, mimeType, receiptFileKey } = req.body;

    let targetData = imageBase64;
    let targetMime = mimeType || 'image/jpeg';

    if (!targetData && receiptFileKey) {
      const downloadUrl = await getPresignedDownloadUrl(receiptFileKey);
      if (downloadUrl) {
        const fetched = await fetch(downloadUrl);
        const arrayBuf = await fetched.arrayBuffer();
        targetData = Buffer.from(arrayBuf);
      }
    }

    if (!targetData) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_IMAGE', message: 'Receipt image data is required for OCR scanning.' },
      });
    }

    const ocrResult = await scanReceiptWithVisionAI(targetData, targetMime);

    return res.json({
      success: true,
      data: ocrResult || {
        isReceipt: false,
        reasonIfInvalid: 'OCR could not process receipt',
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/payments/submit
 * Submit payment receipt and transaction code for an entry
 */
router.post('/submit', authenticateToken, async (req, res, next) => {
  try {
    const { entryId, provider, claimedTransactionCode, senderName, receiptFileKey, ocrData } = req.body;

    if (!entryId || !provider || !receiptFileKey) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Entry ID, payment provider, and receipt screenshot are required.' },
      });
    }

    const entry = await Entry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entry not found' } });
    }

    if (entry.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    }

    if (['QUEUED', 'FILING_IN_PROGRESS', 'FILED', 'CONFIRMED'].includes(entry.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_QUEUED',
          message: 'ይህ ማመልከቻ አስቀድሞ ተረጋግጦ በቅደም ተከተል ውስጥ ይገኛል። / This entry has already been verified and is in the queue.',
        },
      });
    }

    let payment = await Payment.findOne({ entryId: entry._id });
    if (payment && payment.status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_ALREADY_APPROVED',
          message: 'ክፍያዎ አስቀድሞ ጸድቋል! / Payment for this entry is already approved.',
        },
      });
    }

    // Check if code was already claimed and approved or pending elsewhere
    const cleanCode = claimedTransactionCode ? claimedTransactionCode.trim().toUpperCase() : null;
    if (cleanCode) {
      const existingPayment = await Payment.findOne({
        claimedTransactionCode: cleanCode,
        entryId: { $ne: entry._id },
        status: { $in: ['APPROVED', 'PENDING_VERIFICATION'] },
      });

      if (existingPayment) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DUPLICATE_PAYMENT_CODE',
            message: existingPayment.status === 'APPROVED'
              ? 'ይህ የግብይት ቁጥር አስቀድሞ ለሌላ ማመልከቻ ጸድቋል። / This transaction code has already been claimed and approved for another entry.'
              : 'ይህ የግብይት ቁጥር አስቀድሞ ለሌላ ማመልከቻ በመጣራት ላይ ይገኛል። / This transaction code is already pending review for another entry.',
          },
        });
      }
    }

    // Check if exact same receipt file key is reused across different entries
    const duplicateReceipt = await Payment.findOne({
      receiptFileKey,
      entryId: { $ne: entry._id },
      status: { $in: ['APPROVED', 'PENDING_VERIFICATION'] },
    });
    if (duplicateReceipt) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_RECEIPT',
          message: 'ይህ ደረሰኝ አስቀድሞ ለሌላ ማመልከቻ ገብቷል። / This receipt screenshot has already been submitted for another application.',
        },
      });
    }

    const settings = await Settings.getGlobal();
    const basePrice = settings.priceETB || 1000;
    const isDual = entry.packageTier === 'DUAL_COUPLE';
    const amountETBCents = (isDual ? (basePrice + 600) : basePrice) * 100;

    if (!payment) {
      payment = new Payment({
        entryId: entry._id,
        userId: req.user.id,
        amountETBCents,
        provider,
        claimedTransactionCode: cleanCode,
        senderName,
        receiptFileKey,
        status: 'PENDING_VERIFICATION',
      });
    } else {
      payment.provider = provider;
      payment.claimedTransactionCode = cleanCode;
      payment.senderName = senderName;
      payment.receiptFileKey = receiptFileKey;
      payment.status = 'PENDING_VERIFICATION';
      payment.rejectionReason = undefined;
    }

    // Save OCR verification fields
    if (ocrData) {
      payment.ocrTxCode = ocrData.transactionCode || undefined;
      payment.ocrAmount = ocrData.amountETB || undefined;
      payment.ocrBank = ocrData.bankName || undefined;
      payment.ocrConfidence = ocrData.confidenceScore || undefined;
      payment.ocrIsReceipt = ocrData.isReceipt !== false;
      if (payment.ocrTxCode && cleanCode && payment.ocrTxCode === cleanCode) {
        payment.ocrVerified = true;
      }
    }

    await payment.save();

    entry.status = 'PAYMENT_PENDING';
    await entry.save();

    // Fetch applicant name for rich Telegram notification
    const formData = await FormData.findOne({ entryId: entry._id });
    const applicantName = formData?.primary?.name
      ? `${formData.primary.name.firstName} ${formData.primary.name.lastName}`
      : 'Applicant';

    // OCR Telegram Badge
    let ocrBadge = '';
    if (payment.ocrVerified) {
      ocrBadge = `\n🤖 <b>AI Vision OCR:</b> ✅ Verified (${payment.ocrBank || provider} • <code>${payment.ocrTxCode}</code> • ${payment.ocrAmount || 1000} ETB)`;
    } else if (payment.ocrTxCode) {
      ocrBadge = `\n🤖 <b>AI Vision OCR:</b> ℹ️ Detected: <code>${payment.ocrTxCode}</code> (${payment.ocrBank || 'Receipt'})`;
    }

    // Send Telegram Notification with Action Buttons
    const receiptDownloadUrl = await getPresignedDownloadUrl(receiptFileKey);
    const caption = `
🆕 <b>New DV-2027 Payment Submitted</b>

👤 <b>Applicant:</b> ${applicantName}
📋 <b>Ref:</b> <code>${entry.uniqueReference}</code>
💰 <b>Amount:</b> ${(payment.amountETBCents / 100).toFixed(2)} ETB
🏦 <b>Provider:</b> ${provider}
🔢 <b>Claimed Code:</b> <code>${cleanCode || 'Not provided'}</code>${ocrBadge}
📤 <b>Sender:</b> ${senderName || 'Not specified'}
⏰ <b>Date:</b> ${new Date().toLocaleString()}
    `.trim();

    const inlineKeyboard = [
      [
        { text: '✅ Approve Payment', callback_data: `pay_app:${payment._id}` },
        { text: '❌ Reject Payment', callback_data: `pay_rej:${payment._id}` },
      ],
    ];

    if (receiptDownloadUrl && !receiptDownloadUrl.includes('local-mock')) {
      await sendTelegramAdminPhoto(receiptDownloadUrl, caption, inlineKeyboard);
    } else {
      await sendTelegramAdminAlert(caption, inlineKeyboard);
    }

    return res.json({
      success: true,
      data: {
        message: 'Payment submitted successfully. Our team will verify and approve your entry into the queue.',
        payment: {
          id: payment._id,
          status: payment.status,
          amountETB: payment.displayAmountETB,
          provider: payment.provider,
          claimedTransactionCode: payment.claimedTransactionCode,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/payments/:entryId
 * Fetch payment status for an entry
 */
router.get('/:entryId', authenticateToken, async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ entryId: req.params.entryId });
    if (!payment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } });
    }

    const receiptUrl = await getPresignedDownloadUrl(payment.receiptFileKey);

    return res.json({
      success: true,
      data: {
        id: payment._id,
        status: payment.status,
        amountETB: payment.displayAmountETB,
        provider: payment.provider,
        claimedTransactionCode: payment.claimedTransactionCode,
        senderName: payment.senderName,
        receiptUrl,
        rejectionReason: payment.rejectionReason,
        approvedAt: payment.approvedAt,
        createdAt: payment.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

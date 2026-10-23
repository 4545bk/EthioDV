import express from 'express';
import Payment from '../models/Payment.js';
import Entry from '../models/Entry.js';
import { handleTelegramUpdate } from '../services/telegramBotHandler.js';
import { ENV } from '../config/env.js';

const router = express.Router();

/**
 * POST /api/v1/webhooks/telegram
 * Handles all Telegram Bot webhook events (@DV2027EthioDv_Bot)
 */
router.post('/telegram', async (req, res) => {
  try {
    await handleTelegramUpdate(req.body);
    return res.status(200).send('OK');
  } catch (err) {
    console.error('Telegram webhook processing error:', err.message);
    return res.status(200).send('OK'); // Always return 200 to Telegram
  }
});

/**
 * POST /api/v1/webhooks/sms
 * Receives forwarded Telebirr (127) and CBE SMS from Android companion app
 */
router.post('/sms', async (req, res) => {
  try {
    const secret = req.headers['x-api-secret'] || req.query.secret;
    if (secret !== ENV.SMS_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized SMS Webhook' });
    }

    const { content, message, sender } = req.body;
    const rawSms = content || message || JSON.stringify(req.body);

    // Extract Telebirr or CBE Transaction Code
    const cleanText = rawSms.replace(/\r?\n|\r/g, ' ');
    const txnMatch =
      cleanText.match(/(?:transaction\s*number|transaction\s*no|transaction\s*id|txn\s*id|ref\s*no|ref\s*number)(?:\s+is|\s*:|\s+)?\s*([A-Z0-9]{6,16})/i) ||
      cleanText.match(/\b([A-Z0-9]*[0-9][A-Z0-9]{5,15})\b/i);

    if (!txnMatch) {
      return res.json({ status: 'ignored', message: 'No transaction code found in SMS' });
    }

    const txnCode = txnMatch[1].trim().toUpperCase();

    // Check if there is an unapproved payment claiming this code
    const pendingPayment = await Payment.findOne({
      claimedTransactionCode: txnCode,
      status: 'PENDING_VERIFICATION',
    });

    if (pendingPayment) {
      pendingPayment.status = 'APPROVED';
      if (!pendingPayment.approvedAt) {
        pendingPayment.approvedAt = new Date();
      }
      await pendingPayment.save();

      const entry = await Entry.findById(pendingPayment.entryId);
      if (entry) {
        if (['PAYMENT_PENDING', 'DRAFT', 'PAYMENT_REJECTED'].includes(entry.status)) {
          entry.status = 'QUEUED';
        }
        // CRITICAL: Preserve original approval timestamp
        if (!entry.paymentApprovedAt) {
          entry.paymentApprovedAt = pendingPayment.approvedAt;
        }
        await entry.save();

        if (entry.linkedEntryId) {
          const linkedEntry = await Entry.findById(entry.linkedEntryId);
          if (linkedEntry && ['PAYMENT_PENDING', 'DRAFT', 'PAYMENT_REJECTED'].includes(linkedEntry.status)) {
            linkedEntry.status = 'QUEUED';
            if (!linkedEntry.paymentApprovedAt) {
              linkedEntry.paymentApprovedAt = pendingPayment.approvedAt;
            }
            await linkedEntry.save();
          }
        }
      }

      console.log(`⚡ [SMS Webhook] Auto-approved payment ${pendingPayment._id} via matched SMS Txn Code ${txnCode}`);
      return res.json({ status: 'auto_approved', txnCode, paymentId: pendingPayment._id });
    }

    return res.json({ status: 'recorded_unmatched', txnCode });
  } catch (err) {
    console.error('SMS webhook error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

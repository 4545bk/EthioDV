import express from 'express';
import Payment from '../models/Payment.js';
import Entry from '../models/Entry.js';
import User from '../models/User.js';
import FormData from '../models/FormData.js';
import {
  answerTelegramCallbackQuery,
  sendTelegramUserMessage,
  notifyAdminDepositApproved,
  notifyAdminDepositRejected,
} from '../services/telegram.js';
import { ENV } from '../config/env.js';

const router = express.Router();

/**
 * POST /api/v1/webhooks/telegram
 * Handles Telegram Bot webhook events
 */
router.post('/telegram', async (req, res) => {
  try {
    const body = req.body;

    // 1. Handle Inline Button Clicks (Approve/Reject Payment)
    if (body.callback_query) {
      const cb = body.callback_query;
      const data = cb.data; // e.g. "pay_app:64f..." or "pay_rej:64f..."
      const actorName = cb.from?.first_name || 'Admin';

      if (data && (data.startsWith('pay_app:') || data.startsWith('pay_rej:'))) {
        const [action, paymentId] = data.split(':');
        const payment = await Payment.findById(paymentId);

        if (!payment) {
          await answerTelegramCallbackQuery(cb.id, '❌ Payment record not found', true);
          return res.status(200).send('OK');
        }

        if (payment.status !== 'PENDING_VERIFICATION') {
          await answerTelegramCallbackQuery(cb.id, `⚠️ Already ${payment.status}`, true);
          return res.status(200).send('OK');
        }

        const entry = await Entry.findById(payment.entryId);
        const user = await User.findById(payment.userId);

        if (action === 'pay_app') {
          payment.status = 'APPROVED';
          payment.approvedAt = new Date();
          await payment.save();

          if (entry) {
            entry.status = 'QUEUED';
            entry.paymentApprovedAt = payment.approvedAt;
            await entry.save();
          }

          if (user?.telegramChatId) {
            await sendTelegramUserMessage(
              user.telegramChatId,
              `✅ ክፍያዎ ተረጋግጧል! ማመልከቻዎ (#${entry?.uniqueReference}) በቅደም ተከተል ተመዝግቧል።`
            );
          }

          await answerTelegramCallbackQuery(cb.id, `✅ Approved by ${actorName}`, false);

          // Post to Telegram Admin Channel
          try {
            const formData = await FormData.findOne({ entryId: payment.entryId });
            const applicantName = formData?.primary?.name
              ? `${formData.primary.name.firstName || ''} ${formData.primary.name.lastName || ''}`.trim()
              : (user?.fullName || user?.name || 'Applicant');
            const queuePosition = await Entry.countDocuments({ status: 'QUEUED' });

            await notifyAdminDepositApproved({
              entryRef: entry?.uniqueReference || 'N/A',
              applicantName,
              amountETB: (payment.amountETBCents || 100000) / 100,
              provider: payment.provider,
              txCode: payment.claimedTransactionCode,
              adminName: actorName,
              queuePosition,
            });
          } catch (tgErr) {
            console.warn('Webhook telegram approve notify error:', tgErr.message);
          }
        } else {
          payment.status = 'REJECTED';
          payment.rejectionReason = 'Rejected via Telegram inline button';
          await payment.save();

          if (entry) {
            entry.status = 'PAYMENT_REJECTED';
            await entry.save();
          }

          await answerTelegramCallbackQuery(cb.id, `❌ Rejected by ${actorName}`, false);

          // Post to Telegram Admin Channel
          try {
            const formData = await FormData.findOne({ entryId: payment.entryId });
            const applicantName = formData?.primary?.name
              ? `${formData.primary.name.firstName || ''} ${formData.primary.name.lastName || ''}`.trim()
              : (user?.fullName || user?.name || 'Applicant');

            await notifyAdminDepositRejected({
              entryRef: entry?.uniqueReference || 'N/A',
              applicantName,
              amountETB: (payment.amountETBCents || 100000) / 100,
              provider: payment.provider,
              txCode: payment.claimedTransactionCode,
              reason: payment.rejectionReason,
              adminName: actorName,
            });
          } catch (tgErr) {
            console.warn('Webhook telegram reject notify error:', tgErr.message);
          }
        }
      }
      return res.status(200).send('OK');
    }

    // 2. Handle /start link_<userId> for Telegram deep linking
    if (body.message && body.message.text) {
      const text = body.message.text.trim();
      const chatId = body.message.chat?.id;
      const tgUsername = body.message.from?.username;

      if (text.startsWith('/start link_')) {
        const userId = text.replace('/start link_', '').trim();
        const user = await User.findById(userId);

        if (user) {
          user.telegramId = String(body.message.from.id);
          user.telegramChatId = String(chatId);
          user.telegramUsername = tgUsername || user.telegramUsername;
          await user.save();

          await sendTelegramUserMessage(
            chatId,
            `🎉 <b>ቴሌግራም አካውንትዎ በተሳካ ሁኔታ ተገናኝቷል!</b>\n\nከአሁን ጀምሮ የDV-2027 ማመልከቻዎ የክፍያ እና ይፋዊ ማረጋገጫ ቁጥር (Confirmation Number) እዚህ ይደርስዎታል።`
          );
        }
      }
    }

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
      pendingPayment.approvedAt = new Date();
      await pendingPayment.save();

      const entry = await Entry.findById(pendingPayment.entryId);
      if (entry) {
        entry.status = 'QUEUED';
        entry.paymentApprovedAt = pendingPayment.approvedAt;
        await entry.save();
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

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireStaff, requireSuperAdmin } from '../middleware/rbac.js';
import Entry from '../models/Entry.js';
import FormData from '../models/FormData.js';
import Payment from '../models/Payment.js';
import Refund from '../models/Refund.js';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import AuditLog from '../models/AuditLog.js';
import Settings from '../models/Settings.js';
import { getPresignedDownloadUrl } from '../services/r2.js';
import {
  sendTelegramUserMessage,
  sendTelegramAdminAlert,
  sendDailyExecutiveReport,
  notifyAdminDepositApproved,
  notifyAdminDepositRejected,
  notifyAdminEntryFiled,
} from '../services/telegram.js';
import { sendConfirmationEmail, sendUnpaidReminderEmail } from '../services/email.js';

const router = express.Router();

// All routes require Staff authentication
router.use(authenticateToken, requireStaff);

/**
 * Helper to log immutable audit actions
 */
async function recordAudit(req, { action, targetEntity, targetId, metadata }) {
  try {
    await AuditLog.create({
      actorId: req.user.id,
      actorUsername: req.currentStaff?.username || 'staff',
      actorRole: req.user.role,
      action,
      targetEntity,
      targetId,
      ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      metadata,
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

// ==================== OPERATOR FILING STATION ====================

/**
 * GET /api/v1/admin/queue
 * List queue with search, filter, and sorting
 */
router.get('/queue', async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 25 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['QUEUED', 'FILING_IN_PROGRESS', 'PAYMENT_PENDING', 'NEEDS_REVISION'] };
    }

    if (search) {
      query.uniqueReference = { $regex: search.trim(), $options: 'i' };
    }

    const total = await Entry.countDocuments(query);
    const entries = await Entry.find(query)
      .sort({ paymentApprovedAt: 1, createdAt: 1 })
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10))
      .limit(parseInt(limit, 10))
      .populate('lockedBy', 'username')
      .populate('userId', 'email telegramUsername');

    const list = await Promise.all(
      entries.map(async (e) => {
        const formData = await FormData.findOne({ entryId: e._id });
        const primary = formData?.primary;
        return {
          id: e._id,
          uniqueReference: e.uniqueReference,
          status: e.status,
          applicantName: primary?.name ? `${primary.name.firstName} ${primary.name.lastName}` : 'N/A',
          gender: primary?.gender,
          birthDate: primary?.birthDate,
          education: primary?.educationLevel,
          maritalStatus: primary?.maritalStatus,
          childrenCount: primary?.childrenCount || 0,
          paymentApprovedAt: e.paymentApprovedAt,
          lockedBy: e.lockedBy?.username || null,
          lockExpiresAt: e.lockExpiresAt,
          confirmationNumber: e.getConfirmationNumber(),
          filedAt: e.filedAt,
          createdAt: e.createdAt,
        };
      })
    );

    return res.json({
      success: true,
      data: {
        total,
        page: parseInt(page, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
        entries: list,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/queue/claim-next
 * Claims the highest priority unfiled entry, locks it for 30 minutes
 */
router.post('/queue/claim-next', async (req, res, next) => {
  try {
    const now = new Date();
    const lockExpiry = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

    // 1. Check if operator already holds an active lock
    let activeEntry = await Entry.findOne({
      lockedBy: req.user.id,
      status: 'FILING_IN_PROGRESS',
      lockExpiresAt: { $gt: now },
    });

    if (!activeEntry) {
      // Find top QUEUED entry or expired lock
      activeEntry = await Entry.findOneAndUpdate(
        {
          $or: [
            { status: 'QUEUED' },
            { status: 'FILING_IN_PROGRESS', lockExpiresAt: { $lte: now } },
          ],
        },
        {
          $set: {
            status: 'FILING_IN_PROGRESS',
            lockedBy: req.user.id,
            lockedAt: now,
            lockExpiresAt: lockExpiry,
          },
        },
        { sort: { paymentApprovedAt: 1, createdAt: 1 }, new: true }
      );
    }

    if (!activeEntry) {
      return res.json({
        success: true,
        data: { message: 'Queue is currently empty! All approved entries have been claimed or filed.', entry: null },
      });
    }

    await recordAudit(req, {
      action: 'CLAIM_ENTRY',
      targetEntity: 'Entry',
      targetId: activeEntry._id,
      metadata: { uniqueReference: activeEntry.uniqueReference },
    });

    // Fetch decrypted DS-5501 form data with signed photo URLs
    const formDataDoc = await FormData.findOne({ entryId: activeEntry._id });
    const formData = formDataDoc ? formDataDoc.getDecryptedData() : null;

    if (formData?.primary?.photoKey) {
      formData.primary.photoDownloadUrl = await getPresignedDownloadUrl(formData.primary.photoKey);
    }
    if (formData?.spouse?.photoKey) {
      formData.spouse.photoDownloadUrl = await getPresignedDownloadUrl(formData.spouse.photoKey);
    }
    if (formData?.children) {
      for (const child of formData.children) {
        if (child.photoKey) {
          child.photoDownloadUrl = await getPresignedDownloadUrl(child.photoKey);
        }
      }
    }

    return res.json({
      success: true,
      data: {
        entry: {
          id: activeEntry._id,
          uniqueReference: activeEntry.uniqueReference,
          status: activeEntry.status,
          paymentApprovedAt: activeEntry.paymentApprovedAt,
          lockExpiresAt: activeEntry.lockExpiresAt,
        },
        formData,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/queue/release/:entryId
 * Release operator lock back to QUEUED
 */
router.post('/queue/release/:entryId', async (req, res, next) => {
  try {
    const entry = await Entry.findById(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    }

    entry.status = 'QUEUED';
    entry.lockedBy = null;
    entry.lockedAt = null;
    entry.lockExpiresAt = null;
    await entry.save();

    await recordAudit(req, {
      action: 'RELEASE_ENTRY',
      targetEntity: 'Entry',
      targetId: entry._id,
      metadata: { uniqueReference: entry.uniqueReference },
    });

    return res.json({ success: true, data: { message: 'Entry released back to queue' } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/entries/:entryId/file
 * Records official State Dept confirmation number and completes filing
 */
router.post('/entries/:entryId/file', async (req, res, next) => {
  try {
    const { confirmationNumber, officialSubmissionScreenshotKey } = req.body;

    if (!confirmationNumber) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CONFIRMATION_NUMBER', message: 'Confirmation number is required.' },
      });
    }

    const cleanNum = confirmationNumber.trim().toUpperCase();
    // Validate DV confirmation format (16 characters, starts with 2027)
    const dvRegex = /^2027[A-Z0-9]{12}$/;
    if (!dvRegex.test(cleanNum)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONFIRMATION_FORMAT',
          message: 'Official DV-2027 confirmation numbers must be 16 characters long and start with "2027". Example: 20271O0DZWY3DOV9',
        },
      });
    }

    const entry = await Entry.findById(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entry not found' } });
    }

    entry.setConfirmationNumber(cleanNum);
    entry.status = 'CONFIRMED';
    entry.officialSubmissionScreenshotKey = officialSubmissionScreenshotKey || null;
    entry.filedBy = req.user.id;
    entry.filedAt = new Date();
    entry.lockedBy = null;
    entry.lockedAt = null;
    entry.lockExpiresAt = null;
    await entry.save();

    await recordAudit(req, {
      action: 'MARK_FILED',
      targetEntity: 'Entry',
      targetId: entry._id,
      metadata: { uniqueReference: entry.uniqueReference, confirmationHash: entry.confirmationNumberHash },
    });

    // Notify Applicant via Telegram and Email
    const user = await User.findById(entry.userId);
    const formData = await FormData.findOne({ entryId: entry._id });
    const applicantName = formData?.primary?.name
      ? `${formData.primary.name.firstName} ${formData.primary.name.lastName}`
      : 'Applicant';
    const yearOfBirth = formData?.primary?.birthDate?.year || 'N/A';

    // Resolve official submission screenshot download URL if present
    let screenshotUrl = null;
    if (entry.officialSubmissionScreenshotKey) {
      try {
        screenshotUrl = await getPresignedDownloadUrl(entry.officialSubmissionScreenshotKey);
      } catch (err) {
        console.warn('Could not generate screenshot download URL for notification:', err.message);
      }
    }

    if (user?.telegramChatId) {
      await sendTelegramUserMessage(
        user.telegramChatId,
        `
🎉 <b>እንኳን ደስ አለዎት! የDV-2027 ማመልከቻዎ በተሳካ ሁኔታ ገብቷል።</b>

👤 <b>Applicant:</b> ${applicantName}
📋 <b>Ref:</b> <code>${entry.uniqueReference}</code>
🔢 <b>Confirmation Number:</b> <code>${cleanNum}</code>
📅 <b>Year of Birth:</b> ${yearOfBirth}
${screenshotUrl ? `\n📸 <b>ይፋዊ የስክሪንሾት ማረጋገጫ (Official Screenshot):</b>\n<a href="${screenshotUrl}">ስክሪንሾቱን እዚህ ተጭነው ያውርዱ / View & Download Screenshot</a>\n` : ''}
⚠️ ይህን የማረጋገጫ ቁጥር በጥንቃቄ ያስቀምጡ! ውጤቱ በሜይ ወር በ dvprogram.state.gov ይፋ ይሆናል።
        `.trim()
      );
    }

    if (user?.email) {
      await sendConfirmationEmail(user.email, {
        applicantName,
        confirmationNumber: cleanNum,
        yearOfBirth,
        entryRef: entry.uniqueReference,
        screenshotUrl,
      });
    }

    // Post to Telegram Admin Channel
    try {
      const operatorName = req.user?.fullName || req.user?.name || req.user?.email || 'Operator';
      await notifyAdminEntryFiled({
        entryRef: entry.uniqueReference,
        applicantName,
        confirmationNumber: cleanNum,
        operatorName,
      });
    } catch (tgErr) {
      console.warn('Telegram channel post error (entry filed):', tgErr.message);
    }

    return res.json({
      success: true,
      data: {
        message: 'Entry successfully marked filed and confirmation number delivered to applicant.',
        confirmationNumber: cleanNum,
        filedAt: entry.filedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==================== SUPER ADMIN FINANCIAL & PAYMENTS ====================

/**
 * GET /api/v1/admin/payments
 * List payments for review
 */
router.get('/payments', requireSuperAdmin, async (req, res, next) => {
  try {
    const { status = 'PENDING_VERIFICATION' } = req.query;
    const payments = await Payment.find({ status })
      .sort({ createdAt: -1 })
      .populate('entryId', 'uniqueReference status')
      .populate('userId', 'email telegramUsername');

    const list = await Promise.all(
      payments.map(async (p) => {
        const receiptUrl = await getPresignedDownloadUrl(p.receiptFileKey);
        return {
          id: p._id,
          entryId: p.entryId?._id,
          entryRef: p.entryId?.uniqueReference,
          amountETB: p.displayAmountETB,
          provider: p.provider,
          claimedTransactionCode: p.claimedTransactionCode,
          senderName: p.senderName,
          ocrTxCode: p.ocrTxCode,
          ocrAmount: p.ocrAmount,
          ocrBank: p.ocrBank,
          ocrConfidence: p.ocrConfidence,
          ocrVerified: p.ocrVerified,
          ocrIsReceipt: p.ocrIsReceipt,
          receiptUrl,
          status: p.status,
          userEmail: p.userId?.email,
          userTelegram: p.userId?.telegramUsername,
          createdAt: p.createdAt,
        };
      })
    );

    return res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/payments/:paymentId/approve
 * Super Admin approves a payment
 */
router.post('/payments/:paymentId/approve', requireSuperAdmin, async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } });
    }

    const wasAlreadyApproved = payment.status === 'APPROVED';

    payment.status = 'APPROVED';
    payment.approvedBy = req.user.id;
    if (!payment.approvedAt) {
      payment.approvedAt = new Date();
    }
    await payment.save();

    const entry = await Entry.findById(payment.entryId);
    if (entry) {
      if (['PAYMENT_PENDING', 'DRAFT', 'PAYMENT_REJECTED'].includes(entry.status)) {
        entry.status = 'QUEUED';
      }
      // CRITICAL: Preserve original approval timestamp so rank never jumps backwards
      if (!entry.paymentApprovedAt) {
        entry.paymentApprovedAt = payment.approvedAt;
      }
      await entry.save();
    }

    if (wasAlreadyApproved) {
      return res.json({ success: true, data: { message: 'Payment was already approved. Queue position preserved.' } });
    }

    await recordAudit(req, {
      action: 'APPROVE_PAYMENT',
      targetEntity: 'Payment',
      targetId: payment._id,
      metadata: { entryRef: entry?.uniqueReference, amount: payment.amountETBCents },
    });

    // Notify user directly if linked to bot
    const user = await User.findById(payment.userId);
    if (user?.telegramChatId) {
      await sendTelegramUserMessage(
        user.telegramChatId,
        `✅ ክፍያዎ ተረጋግጧል! ማመልከቻዎ (#${entry?.uniqueReference}) በቅደም ተከተል ተመዝግቧል።`
      );
    }

    // Post to Telegram Admin Channel (Live operational audit)
    try {
      const formData = await FormData.findOne({ entryId: payment.entryId });
      const applicantName = formData?.primary?.name
        ? `${formData.primary.name.firstName || ''} ${formData.primary.name.lastName || ''}`.trim()
        : (user?.fullName || user?.name || 'Applicant');
      const adminName = req.user?.fullName || req.user?.name || req.user?.email || 'Super Admin';
      const queuePosition = await Entry.countDocuments({ status: 'QUEUED' });

      await notifyAdminDepositApproved({
        entryRef: entry?.uniqueReference || 'N/A',
        applicantName,
        amountETB: (payment.amountETBCents || 100000) / 100,
        provider: payment.provider,
        txCode: payment.claimedTransactionCode,
        adminName,
        queuePosition,
      });
    } catch (tgErr) {
      console.warn('Telegram channel post error (deposit approve):', tgErr.message);
    }

    return res.json({ success: true, data: { message: 'Payment approved. Entry placed in queue.' } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/payments/:paymentId/reject
 * Super Admin rejects a payment
 */
router.post('/payments/:paymentId/reject', requireSuperAdmin, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } });
    }

    payment.status = 'REJECTED';
    payment.rejectionReason = reason || 'Payment transfer could not be verified.';
    await payment.save();

    const entry = await Entry.findById(payment.entryId);
    if (entry) {
      entry.status = 'PAYMENT_REJECTED';
      await entry.save();
    }

    await recordAudit(req, {
      action: 'REJECT_PAYMENT',
      targetEntity: 'Payment',
      targetId: payment._id,
      metadata: { reason },
    });

    const user = await User.findById(payment.userId);
    if (user?.telegramChatId) {
      await sendTelegramUserMessage(
        user.telegramChatId,
        `❌ የክፍያ ማረጋገጫዎ ውድቅ ተደርጓል (#${entry?.uniqueReference}): ${payment.rejectionReason}። እባክዎ ትክክለኛውን ደረሰኝ በድጋሚ ይላኩ።`
      );
    }

    // Post to Telegram Admin Channel (Live operational audit)
    try {
      const formData = await FormData.findOne({ entryId: payment.entryId });
      const applicantName = formData?.primary?.name
        ? `${formData.primary.name.firstName || ''} ${formData.primary.name.lastName || ''}`.trim()
        : (user?.fullName || user?.name || 'Applicant');
      const adminName = req.user?.fullName || req.user?.name || req.user?.email || 'Super Admin';

      await notifyAdminDepositRejected({
        entryRef: entry?.uniqueReference || 'N/A',
        applicantName,
        amountETB: (payment.amountETBCents || 100000) / 100,
        provider: payment.provider,
        txCode: payment.claimedTransactionCode,
        reason: payment.rejectionReason,
        adminName,
      });
    } catch (tgErr) {
      console.warn('Telegram channel post error (deposit reject):', tgErr.message);
    }

    return res.json({ success: true, data: { message: 'Payment rejected.' } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/analytics
 * Comprehensive financial and funnel analytics
 */
router.get('/analytics', requireSuperAdmin, async (req, res, next) => {
  try {
    const settings = await Settings.getGlobal();

    // 1. Gross Revenue
    const approvedPayments = await Payment.find({ status: 'APPROVED' });
    const grossRevenueCents = approvedPayments.reduce((acc, p) => acc + (p.amountETBCents || 0), 0);
    const grossRevenueETB = grossRevenueCents / 100;

    // 2. Counts
    const totalUsers = await User.countDocuments();
    const totalDrafts = await Entry.countDocuments({ status: 'DRAFT' });
    const totalSubmitted = await Entry.countDocuments({ status: { $ne: 'DRAFT' } });
    const totalPaid = approvedPayments.length;
    const totalFiled = await Entry.countDocuments({ status: { $in: ['FILED', 'CONFIRMED'] } });
    const totalQueued = await Entry.countDocuments({ status: 'QUEUED' });

    // 3. Refunds
    const processedRefunds = await Refund.find({ status: 'PROCESSED' });
    const totalRefundsCents = processedRefunds.reduce((acc, r) => acc + (r.requestedAmountCents || 0), 0);
    const totalRefundsETB = totalRefundsCents / 100;

    // 4. Filing Direct Costs (USD fee modeled in ETB)
    const directFilingCostETB = totalFiled * (settings.usdFilingFeePerEntry || 0) * (settings.usdToEtbExchangeRate || 125);

    // 5. Net Profit
    const netProfitETB = grossRevenueETB - (directFilingCostETB + totalRefundsETB);

    return res.json({
      success: true,
      data: {
        financials: {
          grossRevenueETB,
          directFilingCostETB,
          totalRefundsETB,
          netProfitETB,
          usdToEtbExchangeRate: settings.usdToEtbExchangeRate,
        },
        counts: {
          totalUsers,
          totalDrafts,
          totalSubmitted,
          totalPaid,
          totalQueued,
          totalFiled,
        },
        funnel: {
          step1_registered: totalUsers,
          step2_submittedForm: totalSubmitted,
          step3_paymentApproved: totalPaid,
          step4_officiallyFiled: totalFiled,
          conversionRateOverall: totalUsers > 0 ? ((totalFiled / totalUsers) * 100).toFixed(1) + '%' : '0%',
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/audit-logs
 * Read immutable audit logs
 */
router.get('/audit-logs', requireSuperAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10))
      .limit(parseInt(limit, 10));

    const total = await AuditLog.countDocuments();

    return res.json({
      success: true,
      data: {
        total,
        page: parseInt(page, 10),
        logs,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/telegram-report
 * Trigger immediate daily executive report dispatch to Telegram channel
 */
router.post('/telegram-report', requireSuperAdmin, async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalApprovedCount,
      approvedTodayCount,
      pendingPaymentsCount,
      filedCount,
      queuedCount,
      settings,
    ] = await Promise.all([
      Payment.countDocuments({ status: 'APPROVED' }),
      Payment.countDocuments({ status: 'APPROVED', approvedAt: { $gte: today } }),
      Payment.countDocuments({ status: 'PENDING_VERIFICATION' }),
      Entry.countDocuments({ status: { $in: ['FILED', 'CONFIRMED'] } }),
      Entry.countDocuments({ status: { $in: ['QUEUED', 'FILING_IN_PROGRESS'] } }),
      Settings.getGlobal(),
    ]);

    const revenueETB = totalApprovedCount * settings.priceETB;

    const tgRes = await sendDailyExecutiveReport({
      revenueETB,
      approvedToday: approvedTodayCount,
      totalApproved: totalApprovedCount,
      pendingPayments: pendingPaymentsCount,
      filedCount,
      queuedCount,
      maxDailyCapacity: settings.maxDailyCapacity,
    });

    return res.json({
      success: true,
      data: {
        message: 'Executive daily report dispatched to Telegram channel.',
        telegramResult: tgRes,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/reminders/send-unpaid-reminders
 * Dispatch email and Telegram reminder to all applicants who haven't completed payment
 */
router.post('/reminders/send-unpaid-reminders', requireSuperAdmin, async (req, res, next) => {
  try {
    const unpaidEntries = await Entry.find({ status: 'PAYMENT_PENDING' }).populate('userId');

    let emailSent = 0;
    let telegramSent = 0;

    for (const entry of unpaidEntries) {
      const user = entry.userId;
      if (!user) continue;

      const formData = await FormData.findOne({ entryId: entry._id });
      const applicantName = formData?.primary?.name
        ? `${formData.primary.name.firstName || ''} ${formData.primary.name.lastName || ''}`.trim()
        : (user.fullName || user.email || 'Applicant');

      // 1. Send Email reminder if user has email
      if (user.email) {
        try {
          const emailRes = await sendUnpaidReminderEmail(user.email, {
            applicantName,
            entryRef: entry.uniqueReference,
          });
          if (emailRes.success) emailSent++;
        } catch (emErr) {
          console.warn(`Email reminder failed for ${user.email}:`, emErr.message);
        }
      }

      // 2. Send Telegram reminder if user linked Telegram bot
      if (user.telegramChatId) {
        try {
          const tgText = `👋 <b>ሰላም ${applicantName}!</b>\n\nየDV-2027 ማመልከቻዎ (#${entry.uniqueReference}) 90% ተሞልቶ ተቀምጧል።\n\nየቅድመ-ምዝገባ ተራዎን (Priority Queue) አሁኑኑ በማስያዝ የሎተሪው ድረ-ገጽ እንደተከፈተ በመጀመሪያው ሰዓት እንዲገባ ያድርጉ።\n\n🌐 <a href="https://ethiodv-rho.vercel.app/">ክፍያውን አጠናቅቅ (1,000 ETB)</a>\n📞 ጥያቄ ካለዎት: 0949478933`;
          const tgRes = await sendTelegramUserMessage(user.telegramChatId, tgText);
          if (tgRes.ok) telegramSent++;
        } catch (tgErr) {
          console.warn(`Telegram reminder failed for ${user.telegramChatId}:`, tgErr.message);
        }
      }
    }

    return res.json({
      success: true,
      data: {
        totalUnpaidChecked: unpaidEntries.length,
        emailSent,
        telegramSent,
        message: `Reminders dispatched successfully! (${emailSent} emails, ${telegramSent} Telegram messages)`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==================== ENTRIES MANAGEMENT & FULL FORM DATA ====================

/**
 * GET /api/v1/admin/entries
 * List all applications with filtering, search, and pagination
 */
router.get('/entries', async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (search) {
      query.uniqueReference = { $regex: search.trim(), $options: 'i' };
    }

    const total = await Entry.countDocuments(query);
    const entries = await Entry.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10))
      .limit(parseInt(limit, 10))
      .populate('userId', 'email fullName telegramUsername')
      .populate('lockedBy', 'username');

    const list = await Promise.all(
      entries.map(async (e) => {
        const formData = await FormData.findOne({ entryId: e._id });
        const payment = await Payment.findOne({ entryId: e._id }).sort({ createdAt: -1 });
        const primary = formData?.primary;

        let primaryPhotoUrl = null;
        if (primary?.photoKey) {
          try {
            primaryPhotoUrl = await getPresignedDownloadUrl(primary.photoKey);
          } catch (err) {
            // ignore
          }
        }

        return {
          id: e._id,
          uniqueReference: e.uniqueReference,
          status: e.status,
          applicantName: primary?.name
            ? `${primary.name.firstName || ''} ${primary.name.lastName || ''}`.trim()
            : (e.userId?.fullName || 'N/A'),
          applicantEmail: primary?.email || e.userId?.email || 'N/A',
          gender: primary?.gender || 'N/A',
          birthDate: primary?.birthDate || null,
          education: primary?.educationLevel || 'N/A',
          maritalStatus: primary?.maritalStatus || 'UNMARRIED',
          childrenCount: primary?.childrenCount || 0,
          paymentStatus: payment?.status || 'UNPAID',
          paymentAmountETB: payment?.displayAmountETB || 0,
          paymentProvider: payment?.provider || null,
          claimedTransactionCode: payment?.claimedTransactionCode || null,
          primaryPhotoUrl,
          confirmationNumber: e.getConfirmationNumber ? e.getConfirmationNumber() : null,
          paymentApprovedAt: e.paymentApprovedAt,
          filedAt: e.filedAt,
          createdAt: e.createdAt,
        };
      })
    );

    return res.json({
      success: true,
      data: {
        total,
        page: parseInt(page, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
        entries: list,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/entries/:entryId/full-data
 * Fetch decrypted form data and presigned download URLs for all photos
 */
router.get('/entries/:entryId/full-data', async (req, res, next) => {
  try {
    const entry = await Entry.findById(req.params.entryId).populate('userId', 'email fullName telegramUsername');
    if (!entry) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entry not found' } });
    }

    const formDataDoc = await FormData.findOne({ entryId: entry._id });
    const formData = formDataDoc ? formDataDoc.getDecryptedData() : null;

    const photos = [];

    if (formData?.primary?.photoKey) {
      try {
        const url = await getPresignedDownloadUrl(formData.primary.photoKey);
        formData.primary.photoDownloadUrl = url;
        photos.push({
          role: 'Primary Applicant',
          name: `${formData.primary.name?.firstName || ''} ${formData.primary.name?.lastName || ''}`.trim(),
          photoUrl: url,
          filename: `photo_primary_${entry.uniqueReference}.jpg`,
        });
      } catch (e) {
        console.warn('Presigned URL error for primary photo:', e.message);
      }
    }

    if (formData?.spouse?.photoKey) {
      try {
        const url = await getPresignedDownloadUrl(formData.spouse.photoKey);
        formData.spouse.photoDownloadUrl = url;
        photos.push({
          role: 'Spouse',
          name: `${formData.spouse.name?.firstName || ''} ${formData.spouse.name?.lastName || ''}`.trim(),
          photoUrl: url,
          filename: `photo_spouse_${entry.uniqueReference}.jpg`,
        });
      } catch (e) {
        console.warn('Presigned URL error for spouse photo:', e.message);
      }
    }

    if (formData?.children && Array.isArray(formData.children)) {
      for (let i = 0; i < formData.children.length; i++) {
        const child = formData.children[i];
        if (child.photoKey) {
          try {
            const url = await getPresignedDownloadUrl(child.photoKey);
            child.photoDownloadUrl = url;
            photos.push({
              role: `Child #${i + 1}`,
              name: `${child.name?.firstName || ''} ${child.name?.lastName || ''}`.trim(),
              photoUrl: url,
              filename: `photo_child_${i + 1}_${entry.uniqueReference}.jpg`,
            });
          } catch (e) {
            console.warn(`Presigned URL error for child ${i + 1} photo:`, e.message);
          }
        }
      }
    }

    const payment = await Payment.findOne({ entryId: entry._id }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        entry: {
          id: entry._id,
          uniqueReference: entry.uniqueReference,
          status: entry.status,
          confirmationNumber: entry.getConfirmationNumber ? entry.getConfirmationNumber() : null,
          officialSubmissionScreenshotKey: entry.officialSubmissionScreenshotKey,
          paymentApprovedAt: entry.paymentApprovedAt,
          filedAt: entry.filedAt,
          createdAt: entry.createdAt,
          user: entry.userId,
        },
        formData,
        payment,
        photos,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/entries/:entryId
 * Delete entry and associated form data & payments
 */
router.delete('/entries/:entryId', requireSuperAdmin, async (req, res, next) => {
  try {
    const entry = await Entry.findById(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entry not found' } });
    }

    await FormData.deleteMany({ entryId: entry._id });
    await Payment.deleteMany({ entryId: entry._id });
    await Entry.findByIdAndDelete(entry._id);

    await recordAudit(req, {
      action: 'DELETE_ENTRY',
      targetEntity: 'Entry',
      targetId: entry._id,
      metadata: { uniqueReference: entry.uniqueReference },
    });

    return res.json({
      success: true,
      data: { message: `Entry #${entry.uniqueReference} deleted successfully.` },
    });
  } catch (err) {
    next(err);
  }
});

// ==================== USERS & CLIENTS MANAGEMENT ====================

/**
 * GET /api/v1/admin/users
 * Super Admin list all registered users with normal vs paid status, joined timestamp, and search
 */
router.get('/users', requireSuperAdmin, async (req, res, next) => {
  try {
    const { search, type, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { email: { $regex: search.trim(), $options: 'i' } },
        { fullName: { $regex: search.trim(), $options: 'i' } },
        { telegramUsername: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10))
      .limit(parseInt(limit, 10));

    const list = await Promise.all(
      users.map(async (u) => {
        const entries = await Entry.find({ userId: u._id }).sort({ createdAt: -1 });
        const hasApprovedPayment = await Payment.exists({ userId: u._id, status: 'APPROVED' });
        const hasPaidEntry = entries.some((e) =>
          ['QUEUED', 'FILING_IN_PROGRESS', 'CONFIRMED', 'FILED'].includes(e.status)
        );
        const isPaid = !!(hasApprovedPayment || hasPaidEntry);

        return {
          id: u._id,
          email: u.email || 'N/A',
          fullName: u.fullName || 'N/A',
          telegramUsername: u.telegramUsername || null,
          authProvider: u.authProvider,
          userType: isPaid ? 'PAID' : 'NORMAL',
          isPaid,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt || u.updatedAt,
          entriesCount: entries.length,
          entries: entries.map((e) => ({
            id: e._id,
            uniqueReference: e.uniqueReference,
            status: e.status,
            createdAt: e.createdAt,
          })),
        };
      })
    );

    let filteredList = list;
    if (type === 'PAID') {
      filteredList = list.filter((u) => u.isPaid);
    } else if (type === 'NORMAL') {
      filteredList = list.filter((u) => !u.isPaid);
    }

    return res.json({
      success: true,
      data: {
        total,
        page: parseInt(page, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
        users: filteredList,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/users/:userId
 * Super Admin deletes a user and associated data
 */
router.delete('/users/:userId', requireSuperAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const userEntries = await Entry.find({ userId: user._id });
    const entryIds = userEntries.map((e) => e._id);

    await FormData.deleteMany({ entryId: { $in: entryIds } });
    await Payment.deleteMany({ userId: user._id });
    await Entry.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(user._id);

    await recordAudit(req, {
      action: 'DELETE_USER',
      targetEntity: 'User',
      targetId: user._id,
      metadata: { email: user.email, telegramUsername: user.telegramUsername },
    });

    return res.json({
      success: true,
      data: { message: `User ${user.email || user.telegramUsername || user._id} deleted successfully.` },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/recent-activity
 * Returns latest live updates (today, yesterday, this week)
 */
router.get('/recent-activity', async (req, res, next) => {
  try {
    const [recentPayments, recentEntries, recentUsers] = await Promise.all([
      Payment.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'email fullName'),
      Entry.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'email fullName'),
      User.find().sort({ createdAt: -1 }).limit(10),
    ]);

    const activities = [];

    recentPayments.forEach((p) => {
      activities.push({
        id: `pay_${p._id}`,
        type: 'PAYMENT',
        title: p.status === 'APPROVED' ? 'Payment Approved' : 'Payment Submitted',
        description: `${p.claimedTransactionCode || 'Tx'} • ${p.displayAmountETB || 1000} ETB (${p.provider})`,
        timestamp: p.createdAt,
        badge: p.status,
      });
    });

    recentEntries.forEach((e) => {
      activities.push({
        id: `ent_${e._id}`,
        type: 'ENTRY',
        title: e.status === 'CONFIRMED' ? 'Entry Confirmed & Filed' : 'Application Created',
        description: `Ref #${e.uniqueReference} • ${e.userId?.email || 'Applicant'}`,
        timestamp: e.createdAt,
        badge: e.status,
      });
    });

    recentUsers.forEach((u) => {
      activities.push({
        id: `user_${u._id}`,
        type: 'USER',
        title: 'New Client Registered',
        description: `${u.email || u.telegramUsername || 'Applicant'} joined`,
        timestamp: u.createdAt,
        badge: 'NEW',
      });
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.json({
      success: true,
      data: activities.slice(0, 15),
    });
  } catch (err) {
    next(err);
  }
});

export default router;

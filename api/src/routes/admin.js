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
import { sendTelegramUserMessage, sendTelegramAdminAlert, sendDailyExecutiveReport } from '../services/telegram.js';
import { sendConfirmationEmail } from '../services/email.js';

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

    if (user?.telegramChatId) {
      await sendTelegramUserMessage(
        user.telegramChatId,
        `
🎉 <b>እንኳን ደስ አለዎት! የDV-2027 ማመልከቻዎ በተሳካ ሁኔታ ገብቷል።</b>

👤 <b>Applicant:</b> ${applicantName}
📋 <b>Ref:</b> <code>${entry.uniqueReference}</code>
🔢 <b>Confirmation Number:</b> <code>${cleanNum}</code>
📅 <b>Year of Birth:</b> ${yearOfBirth}

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
      });
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

    payment.status = 'APPROVED';
    payment.approvedBy = req.user.id;
    payment.approvedAt = new Date();
    await payment.save();

    const entry = await Entry.findById(payment.entryId);
    if (entry) {
      entry.status = 'QUEUED';
      entry.paymentApprovedAt = payment.approvedAt;
      await entry.save();
    }

    await recordAudit(req, {
      action: 'APPROVE_PAYMENT',
      targetEntity: 'Payment',
      targetId: payment._id,
      metadata: { entryRef: entry?.uniqueReference, amount: payment.amountETBCents },
    });

    // Notify user
    const user = await User.findById(payment.userId);
    if (user?.telegramChatId) {
      await sendTelegramUserMessage(
        user.telegramChatId,
        `✅ ክፍያዎ ተረጋግጧል! ማመልከቻዎ (#${entry?.uniqueReference}) በቅደም ተከተል ተመዝግቧል።`
      );
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

export default router;

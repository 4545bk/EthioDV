import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Entry from '../models/Entry.js';
import Payment from '../models/Payment.js';
import Refund from '../models/Refund.js';
import { sendTelegramAdminAlert } from '../services/telegram.js';

const router = express.Router();

/**
 * POST /api/v1/refunds/request
 * Request refund under official policy:
 * - 50% for voluntary withdrawal before filing has occurred (QUEUED)
 * - 100% if team cannot file before deadline
 * - 0% after entry has been filed
 */
router.post('/request', authenticateToken, async (req, res, next) => {
  try {
    const { entryId, reason, payoutAccountDetails } = req.body;

    if (!entryId || !reason || !payoutAccountDetails) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Entry ID, reason, and payout account details are required.' },
      });
    }

    const entry = await Entry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entry not found' } });
    }

    if (entry.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    }

    // Verify refund eligibility
    if (entry.status === 'FILED' || entry.status === 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INELIGIBLE_FOR_REFUND',
          message: 'This entry has already been officially submitted to the US Department of State. Per our terms of service, no refunds can be issued after filing.',
        },
      });
    }

    if (entry.status !== 'QUEUED' && entry.status !== 'FILING_IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_FOR_REFUND',
          message: `Refund cannot be requested for an entry in ${entry.status} status.`,
        },
      });
    }

    const payment = await Payment.findOne({ entryId: entry._id, status: 'APPROVED' });
    if (!payment) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_APPROVED_PAYMENT', message: 'No approved payment found for this entry.' },
      });
    }

    // Check if refund already requested
    const existingRefund = await Refund.findOne({ entryId: entry._id });
    if (existingRefund && existingRefund.status !== 'REJECTED') {
      return res.status(400).json({
        success: false,
        error: { code: 'REFUND_ALREADY_REQUESTED', message: 'A refund request is already pending review for this entry.' },
      });
    }

    // Determine percentage (50% voluntary withdrawal)
    const refundPercentage = 50;
    const requestedAmountCents = Math.round((payment.amountETBCents * refundPercentage) / 100);

    const refund = new Refund({
      entryId: entry._id,
      userId: req.user.id,
      paymentId: payment._id,
      requestedAmountCents,
      refundPercentage,
      reason,
      payoutAccountDetails,
      status: 'REQUESTED',
    });
    await refund.save();

    entry.status = 'REFUND_PENDING';
    await entry.save();

    // Alert Telegram Admin
    await sendTelegramAdminAlert(`
⚠️ <b>New Refund Request Submitted</b>

📋 <b>Ref:</b> <code>${entry.uniqueReference}</code>
💰 <b>Refund Amount (50%):</b> ${(requestedAmountCents / 100).toFixed(2)} ETB
🏦 <b>Payout To:</b> ${payoutAccountDetails.bankOrProvider} (${payoutAccountDetails.accountOrPhone}) - ${payoutAccountDetails.accountHolderName}
📝 <b>Reason:</b> ${reason}
🔗 Review in Admin Dashboard.
    `.trim());

    return res.json({
      success: true,
      data: {
        message: 'Refund request submitted. It will be reviewed by admin within 24 hours.',
        refundId: refund._id,
        requestedAmountETB: (requestedAmountCents / 100).toFixed(2),
        refundPercentage,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/refunds/:entryId
 * Fetch refund status for an entry
 */
router.get('/:entryId', authenticateToken, async (req, res, next) => {
  try {
    const refund = await Refund.findOne({ entryId: req.params.entryId });
    if (!refund) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No refund request found' } });
    }

    return res.json({
      success: true,
      data: {
        id: refund._id,
        status: refund.status,
        requestedAmountETB: (refund.requestedAmountCents / 100).toFixed(2),
        refundPercentage: refund.refundPercentage,
        payoutAccountDetails: refund.payoutAccountDetails,
        createdAt: refund.createdAt,
        processedAt: refund.processedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

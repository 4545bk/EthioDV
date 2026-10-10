import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Entry from '../models/Entry.js';

const router = express.Router();

/**
 * GET /api/v1/queue/status/:entryId
 * Fetch dynamic queue position and status timeline
 */
router.get('/status/:entryId', authenticateToken, async (req, res, next) => {
  try {
    const entry = await Entry.findById(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entry not found' } });
    }

    // Must be entry owner or staff
    const isOwner = entry.userId.toString() === req.user.id;
    const isStaff = req.user.role === 'operator' || req.user.role === 'superadmin';
    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    let position = null;
    let totalInQueue = 0;

    if (entry.status === 'QUEUED' || entry.status === 'FILING_IN_PROGRESS') {
      totalInQueue = await Entry.countDocuments({ status: { $in: ['QUEUED', 'FILING_IN_PROGRESS'] } });

      if (entry.status === 'FILING_IN_PROGRESS') {
        position = 1; // Currently being filed by an operator!
      } else if (entry.paymentApprovedAt) {
        const aheadCount = await Entry.countDocuments({
          status: 'QUEUED',
          paymentApprovedAt: { $lt: entry.paymentApprovedAt },
        });
        position = aheadCount + 1;
      }
    }

    // Total filed count
    const totalFiled = await Entry.countDocuments({ status: { $in: ['FILED', 'CONFIRMED'] } });

    return res.json({
      success: true,
      data: {
        entryId: entry._id,
        uniqueReference: entry.uniqueReference,
        status: entry.status,
        position,
        totalInQueue,
        totalFiled,
        paymentApprovedAt: entry.paymentApprovedAt,
        filedAt: entry.filedAt,
        confirmationNumber: entry.getConfirmationNumber(),
        estimatedHoursRemaining: position ? Math.ceil(position / 16) : null, // ~16 entries per operational hour across 2 operators
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

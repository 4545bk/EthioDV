import express from 'express';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { authenticateToken } from '../middleware/auth.js';
import Entry from '../models/Entry.js';
import FormData from '../models/FormData.js';
import Payment from '../models/Payment.js';
import { getPresignedDownloadUrl } from '../services/r2.js';

const router = express.Router();

/**
 * Generate unique human-readable reference e.g. "DV27-8K3P"
 */
function generateEntryReference() {
  return `DV27-${nanoid(6).toUpperCase()}`;
}

/**
 * Calculate identity hash to detect duplicate entries
 */
function calculateIdentityHash(primary) {
  if (!primary || !primary.name || !primary.birthDate) return null;
  const str = `${primary.name.lastName || ''}:${primary.name.firstName || ''}:${primary.birthDate.year || ''}:${primary.birthDate.month || ''}:${primary.birthDate.day || ''}`.toUpperCase().trim();
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * POST /api/v1/entries
 * Initialize a new entry draft
 */
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const entry = new Entry({
      userId: req.user.id,
      uniqueReference: generateEntryReference(),
      status: 'DRAFT',
    });
    await entry.save();

    const formData = new FormData({
      entryId: entry._id,
      primary: {
        birthCountry: 'Ethiopia',
        eligibilityCountry: 'Ethiopia',
        residenceCountry: 'Ethiopia',
      },
    });
    await formData.save();

    return res.status(201).json({
      success: true,
      data: {
        entry: {
          id: entry._id,
          uniqueReference: entry.uniqueReference,
          status: entry.status,
          createdAt: entry.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/entries
 * List all entries for the current applicant
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const entries = await Entry.find({ userId: req.user.id }).sort({ createdAt: -1 });

    const results = await Promise.all(
      entries.map(async (e) => {
        const formData = await FormData.findOne({ entryId: e._id });
        const payment = await Payment.findOne({ entryId: e._id });
        const primaryName = formData?.primary?.name;
        const applicantName = primaryName ? `${primaryName.firstName || ''} ${primaryName.lastName || ''}`.trim() : 'Draft Entry';

        return {
          id: e._id,
          uniqueReference: e.uniqueReference,
          status: e.status,
          applicantName,
          hasPhoto: Boolean(formData?.primary?.photoKey),
          paymentStatus: payment?.status || 'UNPAID',
          paymentApprovedAt: e.paymentApprovedAt,
          confirmationNumber: e.getConfirmationNumber(),
          filedAt: e.filedAt,
          createdAt: e.createdAt,
        };
      })
    );

    return res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/entries/:id
 * Fetch detailed entry with decrypted form data and photo signed URLs
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entry not found' } });
    }

    // Authorization: User must own the entry or be staff
    const isOwner = entry.userId.toString() === req.user.id;
    const isStaff = req.user.role === 'operator' || req.user.role === 'superadmin';

    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    const formDataDoc = await FormData.findOne({ entryId: entry._id });
    const formData = formDataDoc ? formDataDoc.getDecryptedData() : null;

    // Attach signed download URLs for photos
    if (formData && formData.primary && formData.primary.photoKey) {
      formData.primary.photoDownloadUrl = await getPresignedDownloadUrl(formData.primary.photoKey);
    }
    if (formData && formData.spouse && formData.spouse.photoKey) {
      formData.spouse.photoDownloadUrl = await getPresignedDownloadUrl(formData.spouse.photoKey);
    }
    if (formData && formData.children && Array.isArray(formData.children)) {
      for (const child of formData.children) {
        if (child.photoKey) {
          child.photoDownloadUrl = await getPresignedDownloadUrl(child.photoKey);
        }
      }
    }

    // Attach screenshot if filed
    let screenshotUrl = null;
    if (entry.officialSubmissionScreenshotKey) {
      screenshotUrl = await getPresignedDownloadUrl(entry.officialSubmissionScreenshotKey);
    }

    const payment = await Payment.findOne({ entryId: entry._id });

    return res.json({
      success: true,
      data: {
        entry: {
          id: entry._id,
          uniqueReference: entry.uniqueReference,
          status: entry.status,
          paymentApprovedAt: entry.paymentApprovedAt,
          confirmationNumber: entry.getConfirmationNumber(),
          officialSubmissionScreenshotUrl: screenshotUrl,
          filedAt: entry.filedAt,
          revisionReason: entry.revisionReason,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        },
        formData,
        payment: payment
          ? {
              id: payment._id,
              status: payment.status,
              amountETB: payment.displayAmountETB,
              provider: payment.provider,
              claimedTransactionCode: payment.claimedTransactionCode,
              rejectionReason: payment.rejectionReason,
              approvedAt: payment.approvedAt,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/entries/:id/draft
 * Auto-save form draft data
 */
router.put('/:id/draft', authenticateToken, async (req, res, next) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entry not found' } });
    }

    if (entry.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    }

    // Cannot modify submitted/filed entry drafts unless in NEEDS_REVISION or DRAFT
    if (entry.status !== 'DRAFT' && entry.status !== 'NEEDS_REVISION') {
      return res.status(400).json({
        success: false,
        error: { code: 'CANNOT_MODIFY', message: 'This entry has already been submitted and cannot be modified.' },
      });
    }

    let formData = await FormData.findOne({ entryId: entry._id });
    if (!formData) {
      formData = new FormData({ entryId: entry._id });
    }

    const { primary, spouse, children } = req.body;

    if (primary) {
      // Handle non-encrypted fields
      if (primary.name) formData.primary.name = primary.name;
      if (primary.gender) formData.primary.gender = primary.gender;
      if (primary.birthDate) formData.primary.birthDate = primary.birthDate;
      if (primary.birthCity) formData.primary.birthCity = primary.birthCity;
      if (primary.isBirthCityUnknown !== undefined) formData.primary.isBirthCityUnknown = primary.isBirthCityUnknown;
      if (primary.birthCountry) formData.primary.birthCountry = primary.birthCountry;
      if (primary.eligibilityCountry) formData.primary.eligibilityCountry = primary.eligibilityCountry;
      if (primary.isClaimingAlternateChargeability !== undefined) formData.primary.isClaimingAlternateChargeability = primary.isClaimingAlternateChargeability;
      if (primary.chargeabilityExplanation) formData.primary.chargeabilityExplanation = primary.chargeabilityExplanation;
      if (primary.photoKey) formData.primary.photoKey = primary.photoKey;
      if (primary.residenceCountry) formData.primary.residenceCountry = primary.residenceCountry;
      if (primary.email) formData.primary.email = primary.email;
      if (primary.educationLevel) formData.primary.educationLevel = primary.educationLevel;
      if (primary.maritalStatus) formData.primary.maritalStatus = primary.maritalStatus;
      if (primary.childrenCount !== undefined) formData.primary.childrenCount = primary.childrenCount;

      // Handle encrypted fields securely
      formData.setSensitiveFields({
        passport: primary.passport,
        mailingAddress: primary.mailingAddress,
        phone: primary.phone,
      });
    }

    if (spouse !== undefined) formData.spouse = spouse;
    if (children !== undefined) formData.children = children;

    await formData.save();

    return res.json({
      success: true,
      data: { message: 'Draft auto-saved successfully', updatedAt: formData.updatedAt },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/entries/:id/submit
 * Finalize form draft and advance to PAYMENT_PENDING with duplicate check
 */
router.post('/:id/submit', authenticateToken, async (req, res, next) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entry not found' } });
    }

    if (entry.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    }

    const formData = await FormData.findOne({ entryId: entry._id });
    if (!formData || !formData.primary || !formData.primary.name?.lastName || !formData.primary.name?.firstName) {
      return res.status(400).json({
        success: false,
        error: { code: 'INCOMPLETE_FORM', message: 'Please complete all required fields before submitting.' },
      });
    }

    if (!formData.primary.photoKey) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PHOTO', message: 'A compliant photograph is required for submission.' },
      });
    }

    // Duplicate detection check
    const idHash = calculateIdentityHash(formData.primary);
    entry.identityHash = idHash;

    if (idHash) {
      const existingDuplicate = await Entry.findOne({
        _id: { $ne: entry._id },
        identityHash: idHash,
        status: { $in: ['QUEUED', 'FILING_IN_PROGRESS', 'FILED', 'CONFIRMED'] },
      });

      if (existingDuplicate) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_APPLICANT_ENTRY',
            message: 'A Diversity Visa application for this exact name and birth date has already been filed or queued. Entering more than once per lottery year causes automatic disqualification by the US State Department.',
          },
        });
      }
    }

    entry.status = 'PAYMENT_PENDING';
    await entry.save();

    return res.json({
      success: true,
      data: {
        message: 'Form submitted successfully. Please proceed to payment.',
        entryId: entry._id,
        status: entry.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

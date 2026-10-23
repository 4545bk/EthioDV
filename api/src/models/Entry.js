import mongoose from 'mongoose';
import { encryptField, decryptField, hashSearchField } from '../services/crypto.js';

const EntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'SUBMITTED',
        'PAYMENT_PENDING',
        'PAYMENT_REJECTED',
        'QUEUED',
        'FILING_IN_PROGRESS',
        'NEEDS_REVISION',
        'FILED',
        'CONFIRMED',
        'REFUND_PENDING',
        'REFUNDED',
        'CANCELLED',
      ],
      default: 'DRAFT',
      index: true,
    },
    uniqueReference: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    // Priority timestamp for deterministic queue rank
    paymentApprovedAt: {
      type: Date,
      index: true,
    },
    // Operator Lock Mechanism
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    lockExpiresAt: {
      type: Date,
      default: null,
    },
    revisionReason: {
      type: String,
    },
    // Official State Department Output (Field-Level Encrypted)
    confirmationNumberEncrypted: {
      type: String,
    },
    confirmationNumberHash: {
      type: String,
      index: true,
    },
    officialSubmissionScreenshotKey: {
      type: String,
    },
    filedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
    },
    filedAt: {
      type: Date,
    },
    // Duplicate Detection Hash: SHA256(lastName + firstName + birthYear + birthMonth + birthDay)
    identityHash: {
      type: String,
      index: true,
    },
    // Links Husband & Wife dual-entries together so one payment approves both
    linkedEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Entry',
      default: null,
      index: true,
    },
    isDualSpouseMirror: {
      type: Boolean,
      default: false,
    },
    packageTier: {
      type: String,
      enum: ['SINGLE', 'FAMILY', 'DUAL_COUPLE'],
      default: 'SINGLE',
    },
    // B2B Partner / Sub-Agent Attribution
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    submissionChannel: {
      type: String,
      enum: ['WEB_DIRECT', 'TELEGRAM_MINIAPP', 'B2B_AGENT'],
      default: 'WEB_DIRECT',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for primary queue sorting
EntrySchema.index({ status: 1, paymentApprovedAt: 1 });
EntrySchema.index({ userId: 1, createdAt: -1 });

// Method to set confirmation number securely
EntrySchema.methods.setConfirmationNumber = function (confNum) {
  if (!confNum) return;
  const clean = confNum.trim().toUpperCase();
  this.confirmationNumberEncrypted = encryptField(clean);
  this.confirmationNumberHash = hashSearchField(clean);
};

// Method to read decrypted confirmation number
EntrySchema.methods.getConfirmationNumber = function () {
  if (!this.confirmationNumberEncrypted) return null;
  return decryptField(this.confirmationNumberEncrypted);
};

const Entry = mongoose.models.Entry || mongoose.model('Entry', EntrySchema);
export default Entry;

import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    actorUsername: {
      type: String,
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: [
        'APPROVE_PAYMENT',
        'REJECT_PAYMENT',
        'CLAIM_ENTRY',
        'RELEASE_ENTRY',
        'MARK_FILED',
        'VIEW_PII',
        'PROCESS_REFUND',
        'UPDATE_SETTINGS',
      ],
      required: true,
      index: true,
    },
    targetEntity: {
      type: String,
      enum: ['Entry', 'Payment', 'Refund', 'Settings'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable append-only log
  }
);

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;

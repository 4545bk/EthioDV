import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema(
  {
    entryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Entry',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amountETBCents: {
      type: Number,
      required: true,
      default: 100000, // 1000 ETB in cents
    },
    provider: {
      type: String,
      enum: ['TELEBIRR', 'CBE_TRANSFER', 'CBE_BIRR'],
      required: true,
    },
    claimedTransactionCode: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    senderName: {
      type: String,
      trim: true,
    },
    receiptFileKey: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING_VERIFICATION', 'APPROVED', 'REJECTED'],
      default: 'PENDING_VERIFICATION',
      index: true,
    },
    rejectionReason: {
      type: String,
    },
    // AI Vision OCR Fields
    ocrTxCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    ocrAmount: {
      type: Number,
    },
    ocrBank: {
      type: String,
    },
    ocrConfidence: {
      type: Number,
    },
    ocrVerified: {
      type: Boolean,
      default: false,
    },
    ocrIsReceipt: {
      type: Boolean,
      default: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for display amount in Birr
PaymentSchema.virtual('displayAmountETB').get(function () {
  return (this.amountETBCents / 100).toFixed(2);
});

PaymentSchema.set('toJSON', { virtuals: true });

const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
export default Payment;

import mongoose from 'mongoose';

const RefundSchema = new mongoose.Schema(
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
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    requestedAmountCents: {
      type: Number,
      required: true,
    },
    refundPercentage: {
      type: Number,
      enum: [50, 100],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSED'],
      default: 'REQUESTED',
      index: true,
    },
    payoutAccountDetails: {
      bankOrProvider: { type: String, required: true },
      accountOrPhone: { type: String, required: true },
      accountHolderName: { type: String, required: true },
    },
    payoutReceiptFileKey: {
      type: String,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Refund = mongoose.models.Refund || mongoose.model('Refund', RefundSchema);
export default Refund;

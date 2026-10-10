import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const StaffSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['operator', 'superadmin'],
      default: 'operator',
      required: true,
    },
    totpSecret: {
      type: String, // Base32 secret for Authenticator apps
      required: true,
    },
    totpEnabled: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

StaffSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

const Staff = mongoose.models.Staff || mongoose.model('Staff', StaffSchema);
export default Staff;

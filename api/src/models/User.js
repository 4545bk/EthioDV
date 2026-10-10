import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    telegramId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    telegramChatId: {
      type: String,
      sparse: true,
    },
    telegramUsername: {
      type: String,
      trim: true,
    },
    telegramFirstName: {
      type: String,
      trim: true,
    },
    preferredLanguage: {
      type: String,
      enum: ['am', 'en'],
      default: 'am',
    },
    role: {
      type: String,
      enum: ['applicant'],
      default: 'applicant',
    },
    passwordHash: {
      type: String,
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ['email', 'google', 'telegram', 'otp'],
      default: 'email',
    },
    fullName: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String,
    },
    otpCodeHash: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.methods.comparePassword = async function (plainPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPassword, this.passwordHash);
};

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;

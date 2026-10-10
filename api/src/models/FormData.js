import mongoose from 'mongoose';
import { encryptField, decryptField } from '../services/crypto.js';

const DerivativeSchema = new mongoose.Schema(
  {
    name: {
      lastName: { type: String, trim: true },
      firstName: { type: String, trim: true },
      middleName: { type: String, trim: true, default: '' },
      hasNoMiddleName: { type: Boolean, default: false },
    },
    gender: { type: String, enum: ['M', 'F'] },
    birthDate: {
      year: Number,
      month: Number,
      day: Number,
    },
    birthCity: { type: String, trim: true },
    isBirthCityUnknown: { type: Boolean, default: false },
    birthCountry: { type: String, default: 'Ethiopia' },
    photoKey: { type: String }, // R2 Storage Key
  },
  { _id: false }
);

const FormDataSchema = new mongoose.Schema(
  {
    entryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Entry',
      required: true,
      unique: true,
      index: true,
    },
    // Part 1: Primary Entrant
    primary: {
      name: {
        lastName: { type: String, trim: true },
        firstName: { type: String, trim: true },
        middleName: { type: String, trim: true, default: '' },
        hasNoMiddleName: { type: Boolean, default: false },
      },
      gender: { type: String, enum: ['M', 'F'] },
      birthDate: {
        year: Number,
        month: Number,
        day: Number,
      },
      birthCity: { type: String, trim: true },
      isBirthCityUnknown: { type: Boolean, default: false },
      birthCountry: { type: String, default: 'Ethiopia' },
      eligibilityCountry: { type: String, default: 'Ethiopia' },
      isClaimingAlternateChargeability: { type: Boolean, default: false },
      chargeabilityExplanation: { type: String, trim: true },

      // Biometrics
      photoKey: { type: String }, // R2 Storage Key

      // Optional Passport (Encrypted)
      passportEncrypted: {
        type: String,
      },

      // Contact & Address (Encrypted)
      mailingAddressEncrypted: {
        type: String,
      },
      residenceCountry: { type: String, default: 'Ethiopia' },
      phoneEncrypted: {
        type: String,
      },
      email: { type: String, lowercase: true, trim: true },

      educationLevel: {
        type: String,
        enum: [
          'PRIMARY_ONLY',
          'HIGH_SCHOOL_NO_DEGREE',
          'HIGH_SCHOOL_DEGREE',
          'VOCATIONAL_SCHOOL',
          'SOME_UNIVERSITY',
          'UNIVERSITY_DEGREE',
          'SOME_GRADUATE',
          'MASTERS_DEGREE',
          'SOME_DOCTORATE',
          'DOCTORATE_DEGREE',
        ],
      },
      maritalStatus: {
        type: String,
        enum: [
          'UNMARRIED',
          'MARRIED_NON_US_CITIZEN',
          'MARRIED_US_CITIZEN',
          'DIVORCED',
          'WIDOWED',
          'LEGALLY_SEPARATED',
        ],
      },
      childrenCount: { type: Number, min: 0, max: 20, default: 0 },
    },

    // Part 2: Derivatives (Conditional)
    spouse: DerivativeSchema,
    children: [DerivativeSchema],
  },
  {
    timestamps: true,
  }
);

// Decryption helper method for authorized operator/user view
FormDataSchema.methods.getDecryptedData = function () {
  const plain = this.toObject();
  if (plain.primary) {
    if (plain.primary.passportEncrypted) {
      plain.primary.passport = decryptField(plain.primary.passportEncrypted, true);
      delete plain.primary.passportEncrypted;
    }
    if (plain.primary.mailingAddressEncrypted) {
      plain.primary.mailingAddress = decryptField(plain.primary.mailingAddressEncrypted, true);
      delete plain.primary.mailingAddressEncrypted;
    }
    if (plain.primary.phoneEncrypted) {
      plain.primary.phone = decryptField(plain.primary.phoneEncrypted, false);
      delete plain.primary.phoneEncrypted;
    }
  }
  return plain;
};

// Encryption helper method before saving
FormDataSchema.methods.setSensitiveFields = function ({ passport, mailingAddress, phone }) {
  if (passport !== undefined) {
    this.primary.passportEncrypted = passport ? encryptField(passport) : null;
  }
  if (mailingAddress !== undefined) {
    this.primary.mailingAddressEncrypted = mailingAddress ? encryptField(mailingAddress) : null;
  }
  if (phone !== undefined) {
    this.primary.phoneEncrypted = phone ? encryptField(phone) : null;
  }
};

const FormData = mongoose.models.FormData || mongoose.model('FormData', FormDataSchema);
export default FormData;

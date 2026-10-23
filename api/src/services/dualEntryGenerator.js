import crypto from 'crypto';
import Entry from '../models/Entry.js';
import FormData from '../models/FormData.js';

/**
 * Calculate deterministic identity hash for an entrant
 */
function calculateIdentityHash(name, birthDate) {
  if (!name || !birthDate) return null;
  const str = `${name.lastName || ''}:${name.firstName || ''}:${birthDate.year || ''}:${birthDate.month || ''}:${birthDate.day || ''}`.toUpperCase().trim();
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Automatically creates or updates a mirrored secondary entry for the spouse
 * Legally doubles the married couple's winning chances under US State Dept rules
 *
 * @param {object} primaryEntry - Mongoose Entry document
 * @param {object} primaryFormData - Mongoose FormData document or plain object
 * @param {string} spouseEducationLevel - Education level of spouse as primary entrant
 * @param {object} session - Optional Mongoose transaction session
 * @returns {Promise<object>} The newly generated or updated mirrored Entry document
 */
export async function createMirroredSpouseEntry(primaryEntry, primaryFormData, spouseEducationLevel = 'HIGH_SCHOOL_DEGREE', session = null) {
  const primary = primaryFormData.primary;
  const spouse = primaryFormData.spouse;
  const children = primaryFormData.children || [];

  if (!spouse || !spouse.name?.firstName || !spouse.name?.lastName) {
    throw new Error('Spouse first name and last name are required to generate a Dual-Couple entry.');
  }

  // 1. Calculate identity hash for the spouse as primary entrant
  const spouseIdentityHash = calculateIdentityHash(spouse.name, spouse.birthDate);

  // Check if spouse was already entered as a primary entrant elsewhere
  if (spouseIdentityHash) {
    const existingDuplicate = await Entry.findOne({
      identityHash: spouseIdentityHash,
      status: { $in: ['PAYMENT_PENDING', 'QUEUED', 'FILING_IN_PROGRESS', 'FILED', 'CONFIRMED'] },
    });

    if (existingDuplicate && String(existingDuplicate._id) !== String(primaryEntry._id) && String(existingDuplicate._id) !== String(primaryEntry.linkedEntryId)) {
      throw new Error('A primary Diversity Visa application for the spouse already exists in the system.');
    }
  }

  const mirrorOptions = session ? { session } : {};
  const mirrorReference = `${primaryEntry.uniqueReference}-S`;

  // 2. Find or create the mirrored Entry record
  let mirrorEntry = null;
  if (primaryEntry.linkedEntryId) {
    mirrorEntry = await Entry.findById(primaryEntry.linkedEntryId);
  }
  if (!mirrorEntry) {
    mirrorEntry = await Entry.findOne({ uniqueReference: mirrorReference });
  }

  if (mirrorEntry) {
    mirrorEntry.status = primaryEntry.status;
    mirrorEntry.packageTier = 'DUAL_COUPLE';
    mirrorEntry.isDualSpouseMirror = true;
    mirrorEntry.linkedEntryId = primaryEntry._id;
    mirrorEntry.agentId = primaryEntry.agentId || null;
    mirrorEntry.submissionChannel = primaryEntry.submissionChannel || 'WEB_DIRECT';
    mirrorEntry.identityHash = spouseIdentityHash;
    mirrorEntry.paymentApprovedAt = primaryEntry.paymentApprovedAt || null;
    await mirrorEntry.save(mirrorOptions);
  } else {
    mirrorEntry = new Entry({
      userId: primaryEntry.userId,
      uniqueReference: mirrorReference, // e.g., #DV27-K3RKY6-S
      status: primaryEntry.status,
      packageTier: 'DUAL_COUPLE',
      isDualSpouseMirror: true,
      linkedEntryId: primaryEntry._id,
      agentId: primaryEntry.agentId || null,
      submissionChannel: primaryEntry.submissionChannel || 'WEB_DIRECT',
      identityHash: spouseIdentityHash,
      paymentApprovedAt: primaryEntry.paymentApprovedAt || null,
    });
    await mirrorEntry.save(mirrorOptions);
  }

  // Link primary entry back to the mirror entry
  primaryEntry.linkedEntryId = mirrorEntry._id;
  primaryEntry.packageTier = 'DUAL_COUPLE';
  await primaryEntry.save(mirrorOptions);

  // 3. Swap Primary and Spouse in the mirrored FormData
  let mirroredFormData = await FormData.findOne({ entryId: mirrorEntry._id });
  if (!mirroredFormData) {
    mirroredFormData = new FormData({ entryId: mirrorEntry._id });
  }

  mirroredFormData.primary = {
    name: {
      lastName: spouse.name.lastName,
      firstName: spouse.name.firstName,
      middleName: spouse.name.middleName || '',
      hasNoMiddleName: Boolean(spouse.name.hasNoMiddleName),
    },
    gender: spouse.gender,
    birthDate: {
      year: spouse.birthDate?.year,
      month: spouse.birthDate?.month,
      day: spouse.birthDate?.day,
    },
    birthCity: spouse.birthCity,
    isBirthCityUnknown: Boolean(spouse.isBirthCityUnknown),
    birthCountry: spouse.birthCountry || 'Ethiopia',
    eligibilityCountry: spouse.birthCountry || primary.eligibilityCountry || 'Ethiopia',
    isClaimingAlternateChargeability: false,

    // Biometrics
    photoKey: spouse.photoKey,

    // Inherit shared family contact & encrypted address from primary
    mailingAddressEncrypted: primary.mailingAddressEncrypted,
    residenceCountry: primary.residenceCountry || 'Ethiopia',
    phoneEncrypted: primary.phoneEncrypted,
    email: primary.email,

    educationLevel: spouseEducationLevel || primaryFormData.spouseEducationLevel || 'HIGH_SCHOOL_DEGREE',
    maritalStatus: primary.maritalStatus,
    childrenCount: primary.childrenCount || children.length,
  };

  mirroredFormData.spouse = {
    name: {
      lastName: primary.name.lastName,
      firstName: primary.name.firstName,
      middleName: primary.name.middleName || '',
      hasNoMiddleName: Boolean(primary.name.hasNoMiddleName),
    },
    gender: primary.gender,
    birthDate: {
      year: primary.birthDate?.year,
      month: primary.birthDate?.month,
      day: primary.birthDate?.day,
    },
    birthCity: primary.birthCity,
    isBirthCityUnknown: Boolean(primary.isBirthCityUnknown),
    birthCountry: primary.birthCountry || 'Ethiopia',
    photoKey: primary.photoKey,
  };

  mirroredFormData.children = children; // Identical children list

  await mirroredFormData.save(mirrorOptions);

  return mirrorEntry;
}

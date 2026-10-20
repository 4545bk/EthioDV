import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'global_config',
      unique: true,
    },
    brandName: {
      type: String,
      default: 'EthioDV-FillTrack',
    },
    priceETB: {
      type: Number,
      default: 1000,
    },
    telebirr: {
      phone: { type: String, default: '0949478933' },
      name: { type: String, default: 'EthioDV-FillTrack Service' },
    },
    cbe: {
      accountNumber: { type: String, default: '1000301164328' },
      accountName: { type: String, default: 'EthioDV-FillTrack Service' },
    },
    cbeBirr: {
      phone: { type: String, default: '0949478933' },
      name: { type: String, default: 'EthioDV-FillTrack Service' },
    },
    intakeEnabled: {
      type: Boolean,
      default: true,
    },
    maxDailyCapacity: {
      type: Number,
      default: 160,
    },
    disclaimerText: {
      type: String,
      default: 'EthioDV-FillTrack is an independent application assistance service and is NOT affiliated with, endorsed by, or operated by the United States Government or the U.S. Department of State. The official Diversity Visa lottery entry is free of charge at dvprogram.state.gov. Our fee is solely for form preparation, document verification, and manual filing assistance.',
    },
    // USD Filing expense modeling (for financial profit calculation)
    usdFilingFeePerEntry: {
      type: Number,
      default: 0, // State Dept entry is $0, but virtual card buffer or tech tool fee can be set here
    },
    usdToEtbExchangeRate: {
      type: Number,
      default: 125.0, // Bank / Parallel benchmark for cost reporting
    },
  },
  {
    timestamps: true,
  }
);

// Helper to get or create global settings
SettingsSchema.statics.getGlobal = async function () {
  let settings = await this.findOne({ key: 'global_config' });
  if (!settings) {
    settings = await this.create({
      key: 'global_config',
      telebirr: { phone: '0949478933', name: 'EthioDV-FillTrack Service' },
      cbe: { accountNumber: '1000301164328', accountName: 'EthioDV-FillTrack Service' },
    });
  } else {
    // Automatically migrate placeholder demo accounts to user's real accounts
    let updated = false;
    if (!settings.cbe?.accountNumber || settings.cbe.accountNumber === '1000123456789') {
      if (!settings.cbe) settings.cbe = {};
      settings.cbe.accountNumber = '1000301164328';
      updated = true;
    }
    if (!settings.telebirr?.phone || settings.telebirr.phone === '0911234567') {
      if (!settings.telebirr) settings.telebirr = {};
      settings.telebirr.phone = '0949478933';
      updated = true;
    }
    if (updated) {
      await settings.save();
    }
  }
  return settings;
};

const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
export default Settings;

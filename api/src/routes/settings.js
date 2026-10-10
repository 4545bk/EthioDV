import express from 'express';
import Settings from '../models/Settings.js';
import Entry from '../models/Entry.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';

const router = express.Router();

/**
 * GET /api/v1/settings
 * Public endpoint to fetch active pricing, bank payment details, and US Gov disclaimer
 */
router.get('/', async (req, res, next) => {
  try {
    const settings = await Settings.getGlobal();

    // Check remaining daily capacity
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const approvedToday = await Entry.countDocuments({
      paymentApprovedAt: { $gte: today },
    });

    const isCapacityFull = approvedToday >= settings.maxDailyCapacity;

    return res.json({
      success: true,
      data: {
        brandName: settings.brandName,
        priceETB: settings.priceETB,
        telebirr: settings.telebirr,
        cbe: settings.cbe,
        cbeBirr: settings.cbeBirr,
        disclaimerText: settings.disclaimerText,
        intakeEnabled: settings.intakeEnabled && !isCapacityFull,
        isCapacityFull,
        approvedToday,
        maxDailyCapacity: settings.maxDailyCapacity,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/settings
 * Super Admin updates platform settings
 */
router.put('/', authenticateToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const settings = await Settings.getGlobal();
    const { brandName, priceETB, telebirr, cbe, cbeBirr, intakeEnabled, maxDailyCapacity, usdToEtbExchangeRate } = req.body;

    if (brandName) settings.brandName = brandName;
    if (priceETB) settings.priceETB = parseInt(priceETB, 10);
    if (telebirr) settings.telebirr = telebirr;
    if (cbe) settings.cbe = cbe;
    if (cbeBirr) settings.cbeBirr = cbeBirr;
    if (intakeEnabled !== undefined) settings.intakeEnabled = intakeEnabled;
    if (maxDailyCapacity) settings.maxDailyCapacity = parseInt(maxDailyCapacity, 10);
    if (usdToEtbExchangeRate) settings.usdToEtbExchangeRate = parseFloat(usdToEtbExchangeRate);

    await settings.save();

    return res.json({
      success: true,
      data: { message: 'Settings updated successfully', settings },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

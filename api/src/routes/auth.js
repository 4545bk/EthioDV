import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { ENV } from '../config/env.js';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import { sendOtpEmail } from '../services/email.js';
import { authenticateToken } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimit.js';
import { generateBase32Secret, verifyTotp, getTotpUri } from '../utils/totp.js';

const router = express.Router();

/**
 * Helper to generate JWT token and cookie
 */
function issueUserToken(res, { id, email, role, telegramUsername }) {
  const token = jwt.sign(
    { id, email, role, telegramUsername },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN }
  );

  // Set HTTP-Only Cookie
  res.cookie('dv_token', token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return token;
}

// ==================== APPLICANT AUTHENTICATION ====================

/**
 * POST /api/v1/auth/otp/request
 * Request 6-digit email OTP
 */
router.post('/otp/request', rateLimiter({ maxRequests: 5, windowMs: 10 * 60 * 1000 }), async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Please provide a valid email address.' },
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpCodeHash = await bcrypt.hash(otpCode, 10);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = new User({ email: cleanEmail, role: 'applicant' });
    }

    user.otpCodeHash = otpCodeHash;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    const emailResult = await sendOtpEmail(cleanEmail, otpCode);

    return res.json({
      success: true,
      data: {
        message: 'A 6-digit verification code has been sent to your email.',
        email: cleanEmail,
        isMocked: Boolean(emailResult?.mocked || emailResult?.sandboxRestricted),
        isSandboxRestricted: Boolean(emailResult?.sandboxRestricted),
        devOtpCode: (emailResult?.sandboxRestricted || !ENV.RESEND_API_KEY || ENV.NODE_ENV !== 'production') ? otpCode : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/otp/verify
 * Verify 6-digit OTP and establish session
 */
router.post('/otp/verify', rateLimiter({ maxRequests: 10, windowMs: 10 * 60 * 1000 }), async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Email and 6-digit code are required.' },
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user || !user.otpCodeHash || !user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_OTP', message: 'No pending verification found. Please request a new code.' },
      });
    }

    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        error: { code: 'OTP_EXPIRED', message: 'This code has expired. Please request a new one.' },
      });
    }

    const isMatch = await bcrypt.compare(String(code).trim(), user.otpCodeHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: { code: 'INCORRECT_CODE', message: 'Incorrect verification code. Please check and try again.' },
      });
    }

    // Mark verified and clear OTP
    user.emailVerified = true;
    user.otpCodeHash = undefined;
    user.otpExpiresAt = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const token = issueUserToken(res, {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          telegramLinked: Boolean(user.telegramId),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/telegram
 * Verify Telegram Web Widget authentication
 */
router.post('/telegram', async (req, res, next) => {
  try {
    const { id, first_name, username, photo_url, auth_date, hash } = req.body;

    if (!id || !hash || !ENV.TELEGRAM_BOT_TOKEN) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TELEGRAM_DATA', message: 'Telegram authentication data is incomplete.' },
      });
    }

    // 1. Verify Telegram Hash
    const secretKey = crypto.createHash('sha256').update(ENV.TELEGRAM_BOT_TOKEN).digest();
    const dataCheckArr = [];
    for (const [key, val] of Object.entries(req.body)) {
      if (key !== 'hash' && val !== undefined) {
        dataCheckArr.push(`${key}=${val}`);
      }
    }
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (hmac !== hash) {
      return res.status(401).json({
        success: false,
        error: { code: 'TELEGRAM_HASH_MISMATCH', message: 'Telegram signature validation failed.' },
      });
    }

    // 2. Check auth_date freshness (within 24 hours)
    const nowEpoch = Math.floor(Date.now() / 1000);
    if (nowEpoch - parseInt(auth_date, 10) > 86400) {
      return res.status(401).json({
        success: false,
        error: { code: 'TELEGRAM_AUTH_EXPIRED', message: 'Telegram login session has expired.' },
      });
    }

    // 3. Upsert user
    let user = await User.findOne({ telegramId: String(id) });
    if (!user) {
      user = new User({
        telegramId: String(id),
        telegramChatId: String(id),
        telegramUsername: username,
        telegramFirstName: first_name,
        role: 'applicant',
      });
    } else {
      user.telegramUsername = username;
      user.telegramFirstName = first_name;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = issueUserToken(res, {
      id: user._id.toString(),
      telegramUsername: user.telegramUsername,
      role: user.role,
    });

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          telegramUsername: user.telegramUsername,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          email: user.email,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==================== UNIFIED AUTHENTICATION (APPLICANTS & ADMINS) ====================

/**
 * POST /api/v1/auth/signup
 * Applicant email & password registration
 */
router.post('/signup', rateLimiter({ maxRequests: 10, windowMs: 15 * 60 * 1000 }), async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Please provide a valid email address.' },
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters.' },
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if account already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser && existingUser.passwordHash) {
      return res.status(400).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'An account with this email already exists. Please sign in.' },
      });
    }

    const existingStaff = await Staff.findOne({ email: cleanEmail });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_RESERVED', message: 'This email is reserved. Please sign in directly.' },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user = existingUser;
    if (user) {
      user.passwordHash = passwordHash;
      user.fullName = fullName || user.fullName;
      user.authProvider = 'email';
    } else {
      user = new User({
        email: cleanEmail,
        passwordHash,
        fullName: fullName || '',
        role: 'applicant',
        authProvider: 'email',
        emailVerified: false,
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = issueUserToken(res, {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/login
 * Unified Login: Automatically distinguishes Superadmin, Operator, and Applicant
 */
router.post('/login', rateLimiter({ maxRequests: 15, windowMs: 15 * 60 * 1000 }), async (req, res, next) => {
  try {
    const identifier = req.body.identifier || req.body.email || req.body.username;
    const { password, totpCode } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CREDENTIALS', message: 'Email/username and password are required.' },
      });
    }

    const cleanId = String(identifier).trim().toLowerCase();

    // 1. Check Staff collection first (Superadmin & Operator)
    const staff = await Staff.findOne({
      $or: [{ username: cleanId }, { email: cleanId }],
      isActive: true,
    });

    if (staff) {
      const isMatch = await staff.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email/username or password.' },
        });
      }

      // Check TOTP 2FA if enabled
      if (staff.totpEnabled) {
        if (!totpCode) {
          return res.status(403).json({
            success: false,
            error: { code: 'TOTP_REQUIRED', message: 'Please enter the 6-digit code from your Authenticator app.' },
            requires2FA: true,
          });
        }

        const isValidTotp = verifyTotp(staff.totpSecret, totpCode);
        if (!isValidTotp) {
          return res.status(401).json({
            success: false,
            error: { code: 'INVALID_TOTP', message: 'Invalid 2FA code. Please check your Authenticator app.' },
            requires2FA: true,
          });
        }
      }

      staff.lastLoginAt = new Date();
      await staff.save();

      const token = issueUserToken(res, {
        id: staff._id.toString(),
        username: staff.username,
        email: staff.email,
        role: staff.role, // 'superadmin' | 'operator'
      });

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: staff._id,
            username: staff.username,
            email: staff.email,
            role: staff.role,
            totpEnabled: staff.totpEnabled,
          },
          // Keep staff key for backward compatibility
          staff: {
            id: staff._id,
            username: staff.username,
            email: staff.email,
            role: staff.role,
            totpEnabled: staff.totpEnabled,
          },
        },
      });
    }

    // 2. Check Applicant collection
    const user = await User.findOne({ email: cleanId });
    if (user && user.passwordHash) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email/username or password.' },
        });
      }

      user.lastLoginAt = new Date();
      await user.save();

      const token = issueUserToken(res, {
        id: user._id.toString(),
        email: user.email,
        role: user.role, // 'applicant'
      });

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          },
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email/username or password.' },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/google
 * 1-Click Google OAuth Sign In & Sign Up
 */
router.post('/google', rateLimiter({ maxRequests: 20, windowMs: 15 * 60 * 1000 }), async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CREDENTIAL', message: 'Google credential token is required.' },
      });
    }

    // Verify Google ID token via Google TokenInfo API
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!googleRes.ok) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_GOOGLE_TOKEN', message: 'Failed to verify Google token.' },
      });
    }

    const payload = await googleRes.json();
    const { email, name, picture, sub: googleId } = payload;

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Google token payload is missing email or user ID.' },
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Check if email matches Staff member
    const staff = await Staff.findOne({ email: cleanEmail, isActive: true });
    if (staff) {
      staff.lastLoginAt = new Date();
      await staff.save();

      const token = issueUserToken(res, {
        id: staff._id.toString(),
        username: staff.username,
        email: staff.email,
        role: staff.role,
      });

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: staff._id,
            username: staff.username,
            email: staff.email,
            role: staff.role,
          },
        },
      });
    }

    // 2. Find or create Applicant User
    let user = await User.findOne({ email: cleanEmail });
    if (user) {
      if (!user.googleId) user.googleId = googleId;
      if (!user.profilePicture && picture) user.profilePicture = picture;
      if (!user.fullName && name) user.fullName = name;
      user.emailVerified = true;
    } else {
      user = new User({
        email: cleanEmail,
        fullName: name || '',
        googleId,
        profilePicture: picture || '',
        role: 'applicant',
        authProvider: 'google',
        emailVerified: true,
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = issueUserToken(res, {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          profilePicture: user.profilePicture,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Legacy Staff Login Route Alias
router.post('/staff/login', (req, res, next) => {
  // Delegate directly to unified login
  req.body.identifier = req.body.username || req.body.email;
  return router.handle(req, res, next);
});

/**
 * POST /api/v1/auth/staff/setup-2fa
 * Generate QR code and secret for staff 2FA setup
 */
router.post('/staff/setup-2fa', authenticateToken, async (req, res, next) => {
  try {
    if (!req.currentStaff) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Staff only' } });
    }

    const secret = generateBase32Secret();
    const uri = getTotpUri(req.currentStaff.username, secret, 'DVFillTrack-Admin');
    const qrCodeDataUrl = await QRCode.toDataURL(uri);

    // Save temporary secret to staff document
    req.currentStaff.totpSecret = secret;
    await req.currentStaff.save();

    return res.json({
      success: true,
      data: {
        secret,
        qrCode: qrCodeDataUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/staff/verify-2fa
 * Confirm 2FA setup with first code
 */
router.post('/staff/verify-2fa', authenticateToken, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!req.currentStaff) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Staff only' } });
    }

    const isValid = verifyTotp(req.currentStaff.totpSecret, code);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CODE', message: 'Invalid 2FA code. Setup not confirmed.' },
      });
    }

    req.currentStaff.totpEnabled = true;
    await req.currentStaff.save();

    return res.json({
      success: true,
      data: { message: '2FA has been successfully activated on your account.' },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/me
 * Get current session profile
 */
router.get('/me', authenticateToken, async (req, res) => {
  if (req.currentUser) {
    return res.json({
      success: true,
      data: {
        id: req.currentUser._id,
        email: req.currentUser.email,
        role: req.currentUser.role,
        preferredLanguage: req.currentUser.preferredLanguage,
        telegramUsername: req.currentUser.telegramUsername,
        telegramLinked: Boolean(req.currentUser.telegramId),
      },
    });
  }

  if (req.currentStaff) {
    return res.json({
      success: true,
      data: {
        id: req.currentStaff._id,
        username: req.currentStaff.username,
        email: req.currentStaff.email,
        role: req.currentStaff.role,
        totpEnabled: req.currentStaff.totpEnabled,
      },
    });
  }

  return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
});

/**
 * POST /api/v1/auth/logout
 * Clear session cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('dv_token');
  res.json({ success: true, data: { message: 'Logged out successfully' } });
});

export default router;

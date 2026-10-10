import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import User from '../models/User.js';
import Staff from '../models/Staff.js';

/**
 * Middleware to authenticate Applicant or Staff via JWT
 */
export async function authenticateToken(req, res, next) {
  let token = null;

  // Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers.cookie) {
    // Check session cookie
    const cookies = req.headers.cookie.split(';');
    for (const c of cookies) {
      const [name, val] = c.trim().split('=');
      if (name === 'dv_token' || name === 'token') {
        token = val;
        break;
      }
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    req.user = decoded;

    // Attach entity reference if needed
    if (decoded.role === 'applicant') {
      const user = await User.findById(decoded.id).select('-otpCodeHash');
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User account not found' },
        });
      }
      req.currentUser = user;
    } else if (decoded.role === 'operator' || decoded.role === 'superadmin') {
      const staff = await Staff.findById(decoded.id).select('-passwordHash');
      if (!staff || !staff.isActive) {
        return res.status(401).json({
          success: false,
          error: { code: 'STAFF_INACTIVE', message: 'Staff account inactive or disabled' },
        });
      }
      req.currentStaff = staff;
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Session expired or invalid token' },
    });
  }
}

/**
 * Optional authentication middleware (sets req.user if token present, doesn't block if missing)
 */
export async function optionalAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (token) {
    try {
      req.user = jwt.verify(token, ENV.JWT_SECRET);
    } catch {
      // Ignore invalid token in optional auth
    }
  }
  next();
}

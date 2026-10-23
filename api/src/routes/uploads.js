import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { getPresignedUploadUrl, getStorageProvider, uploadBufferToCloudinary, getPresignedDownloadUrl } from '../services/storage.js';
import { validatePhotoBiometrics } from '../services/photoBiometricValidator.js';

const router = express.Router();

// On Vercel / serverless runtime, process.cwd() is read-only (/var/task). Use os.tmpdir() (/tmp) when serverless.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const MOCK_UPLOAD_DIR = isServerless
  ? path.join(os.tmpdir(), 'uploads_mock')
  : path.join(process.cwd(), 'uploads_mock');

try {
  if (!fs.existsSync(MOCK_UPLOAD_DIR)) {
    fs.mkdirSync(MOCK_UPLOAD_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[Uploads] Could not initialize local mock directory (safe to ignore if using cloud storage):', err.message);
}

/**
 * POST /api/v1/uploads/presign
 * Generates direct S3 / R2 presigned PUT upload URL or internal upload path
 */
router.post('/presign', optionalAuth, async (req, res, next) => {
  try {
    const { category, mimeType } = req.body;
    const allowedCategories = ['photos', 'passports', 'receipts', 'confirmations'];

    if (!category || !allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CATEGORY', message: 'Category must be one of: ' + allowedCategories.join(', ') },
      });
    }

    const { uploadUrl, fileKey, isLocalMock } = await getPresignedUploadUrl(category, mimeType || 'image/jpeg');

    return res.json({
      success: true,
      data: {
        uploadUrl,
        fileKey,
        isLocalMock,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/uploads/validate-photo-biometrics
 * Automated AI Biometric Pre-Check Gatekeeper
 * Strictly checks for glasses, non-white backgrounds, shadows, tilt, and head ratios
 */
router.post('/validate-photo-biometrics', optionalAuth, async (req, res, next) => {
  try {
    const { imageBase64, mimeType, fileKey } = req.body;

    let targetData = imageBase64;
    let targetMime = mimeType || 'image/jpeg';

    if (!targetData && fileKey) {
      const downloadUrl = await getPresignedDownloadUrl(fileKey);
      if (downloadUrl) {
        const fetched = await fetch(downloadUrl);
        const arrayBuf = await fetched.arrayBuffer();
        targetData = Buffer.from(arrayBuf);
      }
    }

    if (!targetData) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_IMAGE', message: 'Photo image data is required for biometric validation.' },
      });
    }

    const biometricResult = await validatePhotoBiometrics(targetData, targetMime);

    return res.json({
      success: true,
      data: biometricResult,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Unified direct PUT upload endpoint
 * Handles Cloudinary uploads or local mock storage
 */
router.put('/direct', express.raw({ type: '*/*', limit: '10mb' }), async (req, res, next) => {
  try {
    const fileKey = req.query.key;
    if (!fileKey) {
      return res.status(400).json({ success: false, error: { message: 'Missing key parameter' } });
    }

    const provider = getStorageProvider();
    const contentType = req.headers['content-type'] || 'image/jpeg';

    let buffer = req.body;
    if (typeof buffer === 'string') {
      buffer = Buffer.from(buffer);
    } else if (!Buffer.isBuffer(buffer)) {
      buffer = Buffer.from(buffer || '');
    }

    if (provider === 'cloudinary') {
      await uploadBufferToCloudinary(buffer, fileKey, contentType);
      return res.status(200).json({ success: true, message: 'Uploaded to Cloudinary successfully', fileKey });
    }

    // Local disk mock fallback
    const safeFilename = encodeURIComponent(String(fileKey)).replace(/%/g, '_');
    const targetPath = path.join(MOCK_UPLOAD_DIR, safeFilename);
    if (!fs.existsSync(MOCK_UPLOAD_DIR)) {
      fs.mkdirSync(MOCK_UPLOAD_DIR, { recursive: true });
    }
    fs.writeFileSync(targetPath, buffer);
    return res.status(200).json({ success: true, message: 'Upload successful', fileKey });
  } catch (err) {
    console.error('[Upload Direct Error]:', err.message);
    return res.status(500).json({ success: false, error: { message: err.message || 'Direct upload failed' } });
  }
});

/**
 * Local mock PUT endpoint for development when R2 is not configured
 */
router.put('/local-mock', express.raw({ type: '*/*', limit: '10mb' }), (req, res) => {
  const fileKey = req.query.key;
  if (!fileKey) {
    return res.status(400).send('Missing key parameter');
  }

  const safeFilename = encodeURIComponent(String(fileKey)).replace(/%/g, '_');
  const targetPath = path.join(MOCK_UPLOAD_DIR, safeFilename);

  if (!fs.existsSync(MOCK_UPLOAD_DIR)) {
    fs.mkdirSync(MOCK_UPLOAD_DIR, { recursive: true });
  }
  fs.writeFileSync(targetPath, req.body);
  return res.status(200).send('Mock upload successful');
});

/**
 * Local mock GET endpoint for development viewing
 */
router.get('/local-mock', (req, res) => {
  const fileKey = req.query.key;
  if (!fileKey) {
    return res.status(400).send('Missing key parameter');
  }

  const safeFilename = encodeURIComponent(String(fileKey)).replace(/%/g, '_');
  const targetPath = path.join(MOCK_UPLOAD_DIR, safeFilename);

  if (fs.existsSync(targetPath)) {
    return res.sendFile(targetPath);
  }
  return res.status(404).send('File not found in local mock');
});

export default router;

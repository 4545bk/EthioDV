import express from 'express';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/auth.js';
import { getPresignedUploadUrl, getStorageProvider, uploadBufferToCloudinary } from '../services/storage.js';

const router = express.Router();
const MOCK_UPLOAD_DIR = path.join(process.cwd(), 'uploads_mock');

if (!fs.existsSync(MOCK_UPLOAD_DIR)) {
  fs.mkdirSync(MOCK_UPLOAD_DIR, { recursive: true });
}

/**
 * POST /api/v1/uploads/presign
 * Generates direct S3 / R2 presigned PUT upload URL
 */
router.post('/presign', authenticateToken, async (req, res, next) => {
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
 * Unified direct PUT upload endpoint
 * Handles Cloudinary uploads or local mock storage
 */
router.put('/direct', express.raw({ type: '*/*', limit: '10mb' }), async (req, res, next) => {
  try {
    const fileKey = req.query.key;
    if (!fileKey) {
      return res.status(400).send('Missing key parameter');
    }

    const provider = getStorageProvider();
    const contentType = req.headers['content-type'] || 'image/jpeg';

    if (provider === 'cloudinary') {
      await uploadBufferToCloudinary(req.body, fileKey, contentType);
      return res.status(200).json({ success: true, message: 'Uploaded to Cloudinary successfully' });
    }

    // Local disk mock fallback
    const safeFilename = encodeURIComponent(String(fileKey)).replace(/%/g, '_');
    const targetPath = path.join(MOCK_UPLOAD_DIR, safeFilename);
    fs.writeFileSync(targetPath, req.body);
    return res.status(200).send('Local upload successful');
  } catch (err) {
    next(err);
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

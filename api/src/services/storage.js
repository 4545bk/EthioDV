import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v2 as cloudinary } from 'cloudinary';
import { nanoid } from 'nanoid';
import { ENV } from '../config/env.js';

// 1. Configure Cloudflare R2 if available
let s3Client = null;
if (ENV.R2_ACCOUNT_ID && ENV.R2_ACCESS_KEY_ID && ENV.R2_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${ENV.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ENV.R2_ACCESS_KEY_ID,
      secretAccessKey: ENV.R2_SECRET_ACCESS_KEY,
    },
  });
}

// 2. Configure Cloudinary if available (Zero credit card requirement)
let isCloudinaryConfigured = false;
if (ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_API_KEY && ENV.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET,
    secure: true,
  });
  isCloudinaryConfigured = true;
}

/**
 * Determine active storage provider
 */
export function getStorageProvider() {
  if (isCloudinaryConfigured) return 'cloudinary';
  if (s3Client) return 'r2';
  return 'local_mock';
}

/**
 * Generate upload URL for client direct or relay upload
 * @param {string} category - 'photos' | 'passports' | 'receipts' | 'confirmations'
 * @param {string} mimeType - e.g. 'image/jpeg', 'image/png'
 * @returns {Promise<{ uploadUrl: string, fileKey: string, provider: string }>}
 */
export async function getPresignedUploadUrl(category, mimeType = 'image/jpeg') {
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'application/pdf' ? 'pdf' : 'jpg';
  const fileKey = `${category}/${Date.now()}_${nanoid(10)}.${extension}`;
  const provider = getStorageProvider();

  // Mode A: Cloudflare R2 direct client PUT
  if (provider === 'r2') {
    const command = new PutObjectCommand({
      Bucket: ENV.R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: mimeType,
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    return { uploadUrl, fileKey, isLocalMock: false, provider: 'r2' };
  }

  // Mode B: Cloudinary or Local Mock (client PUTs binary to backend /direct endpoint)
  return {
    uploadUrl: `/api/v1/uploads/direct?key=${encodeURIComponent(fileKey)}`,
    fileKey,
    isLocalMock: provider === 'local_mock',
    provider,
  };
}

/**
 * Upload binary buffer to Cloudinary
 * @param {Buffer} buffer
 * @param {string} fileKey
 * @param {string} mimeType
 */
export async function uploadBufferToCloudinary(buffer, fileKey, mimeType = 'image/jpeg') {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary credentials not configured in environment');
  }

  return new Promise((resolve, reject) => {
    // Determine resource type: images vs pdf raw
    const resourceType = mimeType.includes('pdf') ? 'raw' : 'image';
    const cleanPublicId = fileKey.replace(/\.[^/.]+$/, ''); // Remove extension

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: cleanPublicId,
        resource_type: resourceType,
        folder: 'dvfilltrack',
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Generate download / viewing URL for a stored fileKey
 * @param {string} fileKey - Key or stored URL
 * @returns {Promise<string>}
 */
export async function getPresignedDownloadUrl(fileKey) {
  if (!fileKey) return null;

  // If already an absolute HTTPS URL (e.g. from Cloudinary), return it directly
  if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
    return fileKey;
  }

  const provider = getStorageProvider();

  // Mode A: Cloudinary
  if (provider === 'cloudinary') {
    const cleanPublicId = fileKey.replace(/\.[^/.]+$/, '');
    return cloudinary.url(`dvfilltrack/${cleanPublicId}`, { secure: true });
  }

  // Mode B: Cloudflare R2
  if (provider === 'r2') {
    const command = new GetObjectCommand({
      Bucket: ENV.R2_BUCKET_NAME,
      Key: fileKey,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 900 });
  }

  // Mode C: Local Mock Disk
  return `/api/v1/uploads/local-mock?key=${encodeURIComponent(fileKey)}`;
}

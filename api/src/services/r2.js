// Unified storage proxy: Re-exports from storage.js (supports Cloudinary, Cloudflare R2, and local fallback)
export {
  getStorageProvider,
  getPresignedUploadUrl,
  uploadBufferToCloudinary,
  getPresignedDownloadUrl,
} from './storage.js';

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust multi-path dotenv loading (works whether run from root, api, or Vercel serverless)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'api/.env') });

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: process.env.PORT || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'https://ethiodv-rho.vercel.app',
  APP_URL: process.env.APP_URL || 'https://ethiodv-rho.vercel.app',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://betremariyamgizaw_db_user:0GtX02N73UXKdP3z@ethiodv.vfjw9gd.mongodb.net/ethiodv?retryWrites=true&w=majority',
  
  // Security & JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev-super-secret-jwt-key-dvfilltrack-2027-change-in-prod-min32chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Field-Level Encryption Master Key (32-byte hex or string)
  FLE_MASTER_KEY: process.env.FLE_MASTER_KEY || 'e4b39fa1d7c802b8491f6c039ab42ce51908d2416b7e80a5f93c104e7681d45a',
  
  // Cloudflare R2 Storage (Requires foreign credit/debit card)
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || '',
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || 'dvfilltrack-secure-docs',
  R2_PUBLIC_DOMAIN: process.env.R2_PUBLIC_DOMAIN || '', // Empty by default: private bucket!
  
  // Cloudinary Storage (Recommended: 100% Free, NO credit card needed)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  
  // Telegram Bots (Client Bot: @DV2027EthioDv_Bot & Admin Channel Bot)
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_ADMIN_BOT_TOKEN: process.env.TELEGRAM_ADMIN_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || 'ethiodv_tg_secret_123456',
  
  // Email Service (Resend)
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  FROM_EMAIL: process.env.FROM_EMAIL || 'support@dvfilltrack.com',
  
  // Android SMS Forwarder Webhook
  SMS_WEBHOOK_SECRET: process.env.SMS_WEBHOOK_SECRET || 'dvfilltrack_sms_secret_849201',
  
  // Google OAuth 2.0 (1-Click Google Sign In / Sign Up)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  
  // Google Gemini AI (Receipt OCR & Automation)
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  
  // Business Settings Defaults
  DEFAULT_PRICE_ETB: parseInt(process.env.DEFAULT_PRICE_ETB || '1000', 10),
  DV_YEAR: 'DV-2027',
  MAX_DAILY_ENTRIES: parseInt(process.env.MAX_DAILY_ENTRIES || '160', 10),
};

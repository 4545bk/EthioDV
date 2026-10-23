import { connectDB } from '../config/db.js';
import { startTelegramPolling } from '../services/telegramBotWorker.js';

console.log('🤖 Starting EthioDV Telegram Bot (@DV2027EthioDv_Bot)...');

connectDB()
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    startTelegramPolling();
    console.log('⚡ Bot is actively listening for Telegram updates! Send /start to @DV2027EthioDv_Bot');
  })
  .catch((err) => {
    console.error('❌ Failed to connect to database for bot:', err.message);
    process.exit(1);
  });

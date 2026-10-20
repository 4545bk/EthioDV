import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { ENV } from './src/config/env.js';
import Staff from './src/models/Staff.js';
import Settings from './src/models/Settings.js';
import bcrypt from 'bcryptjs';
import { generateBase32Secret } from './src/utils/totp.js';

// Auto-seed default staff accounts in development if not present
async function seedDefaultAccounts() {
  try {
    const adminCount = await Staff.countDocuments({ role: 'superadmin' });
    if (adminCount === 0) {
      const passwordHash = await bcrypt.hash('Admin2027!Pass', 10);
      const admin = new Staff({
        username: 'admin',
        email: 'admin@dvfilltrack.com',
        passwordHash,
        role: 'superadmin',
        totpSecret: generateBase32Secret(),
        totpEnabled: false, // Initial login can proceed or set up 2FA
      });
      await admin.save();
      console.log('👑 [Default Superadmin Created]: username=admin password=Admin2027!Pass');
    }

    const opCount = await Staff.countDocuments({ role: 'operator' });
    if (opCount === 0) {
      const passwordHash = await bcrypt.hash('Operator2027!Pass', 10);
      const op = new Staff({
        username: 'operator1',
        email: 'operator1@dvfilltrack.com',
        passwordHash,
        role: 'operator',
        totpSecret: generateBase32Secret(),
        totpEnabled: false,
      });
      await op.save();
      console.log('👤 [Default Operator Created]: username=operator1 password=Operator2027!Pass');
    }

    await Settings.getGlobal();
  } catch (err) {
    console.warn('Seed initialization notice:', err.message);
  }
}

// Standalone server for local development or traditional hosting
if (!process.env.VERCEL) {
  const port = process.env.PORT || ENV.PORT || 5000;
  connectDB()
    .then(async () => {
      await seedDefaultAccounts();
      app.listen(port, () => {
        console.log(`🚀 EthioDV-FillTrack API Server listening on port ${port}`);
      });
    })
    .catch((err) => {
      console.error('Could not connect to database on startup:', err.message);
      app.listen(port, () => {
        console.log(`⚠️ API Server listening on port ${port} (Waiting for MongoDB connection...)`);
      });
    });
}

// Export Express app directly for Vercel / serverless runtime
export default app;



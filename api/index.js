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

// Ensure database connection middleware for serverless invocations
const serverlessHandler = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed database connection in serverless handler:', err.message);
  }
  return app(req, res);
};

// Start standalone HTTP server when executed locally
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  connectDB()
    .then(async () => {
      await seedDefaultAccounts();
      app.listen(ENV.PORT, () => {
        console.log(`🚀 EthioDV-FillTrack API Server listening on http://localhost:${ENV.PORT}`);
      });
    })
    .catch((err) => {
      console.error('Could not connect to database on startup:', err.message);
      // Still listen so health and mock routes respond
      app.listen(ENV.PORT, () => {
        console.log(`⚠️ API Server listening on http://localhost:${ENV.PORT} (Waiting for MongoDB connection...)`);
      });
    });
}

export default serverlessHandler;

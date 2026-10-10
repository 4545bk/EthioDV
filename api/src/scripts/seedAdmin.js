import { connectDB } from '../config/db.js';
import Staff from '../models/Staff.js';
import bcrypt from 'bcryptjs';
import { generateBase32Secret } from '../utils/totp.js';

async function main() {
  await connectDB();
  const password = 'EthioDV@2027#Secure!';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await Staff.findOneAndUpdate(
    { username: 'admin' },
    {
      username: 'admin',
      email: 'admin@ethiodv.com',
      passwordHash: passwordHash,
      role: 'superadmin',
      totpSecret: generateBase32Secret(),
      totpEnabled: false,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  console.log('ADMIN_ACCOUNT_CREATED_SUCCESS:', {
    email: admin.email,
    username: admin.username,
    role: admin.role,
  });
  process.exit(0);
}

main().catch(err => {
  console.error('SEED_ADMIN_ERR:', err);
  process.exit(1);
});

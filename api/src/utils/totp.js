import crypto from 'crypto';

// Base32 character set (RFC 4648)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random Base32 secret string (160 bits / 32 chars)
 */
export function generateBase32Secret(length = 32) {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE32_CHARS[bytes[i] % 32];
  }
  return result;
}

/**
 * Decode base32 string to Buffer
 */
function base32ToBuffer(base32) {
  const clean = base32.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generate TOTP code for a given timestamp and secret
 */
export function generateTotp(secret, timeStep = 30, windowOffset = 0) {
  const key = base32ToBuffer(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep) + windowOffset;

  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (codeInt % 1000000).toString().padStart(6, '0');
  return otp;
}

/**
 * Verify a 6-digit TOTP code with +/- 1 time step drift tolerance (90s window)
 */
export function verifyTotp(secret, code) {
  if (!secret || !code) return false;
  const cleanCode = String(code).trim();
  for (const offset of [-1, 0, 1]) {
    if (generateTotp(secret, 30, offset) === cleanCode) {
      return true;
    }
  }
  return false;
}

/**
 * Generate otpauth:// URI for Authenticator apps
 */
export function getTotpUri(username, secret, issuer = 'DVFillTrack') {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(username)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

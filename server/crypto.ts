import crypto from 'node:crypto';

export interface HashedPasswordResult {
  salt: string;
  hash: string;
  version: string;
}

const ITERATIONS = 100000;
const KEYLEN = 64;
const DIGEST = 'sha512';

/**
 * Generates a unique 32-byte cryptographically secure salt and hashes the password.
 */
export function hashPassword(password: string): HashedPasswordResult {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return {
    salt,
    hash,
    version: 'pbkdf2-sha512-v1',
  };
}

/**
 * Verifies a password against the stored salt and hash using timing-safe comparison.
 */
export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  if (!password || !salt || !storedHash) return false;
  try {
    const computedHash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
    const computedBuf = Buffer.from(computedHash, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (computedBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, storedBuf);
  } catch {
    return false;
  }
}

/**
 * Creates a cryptographically random session/access token for unlocked task sessions.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

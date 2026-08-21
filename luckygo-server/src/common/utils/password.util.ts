import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  }).toString('hex');
  return [SCRYPT_PREFIX, SCRYPT_COST, SCRYPT_BLOCK_SIZE, SCRYPT_PARALLELIZATION, salt, derived].join('$');
}

export function passwordMatches(input: string, stored?: string | null): boolean {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length === 6 && parts[0] === SCRYPT_PREFIX) {
    const [, costRaw, blockSizeRaw, parallelizationRaw, salt, expected] = parts;
    const cost = Number(costRaw);
    const blockSize = Number(blockSizeRaw);
    const parallelization = Number(parallelizationRaw);
    if (!Number.isSafeInteger(cost) || !Number.isSafeInteger(blockSize) || !Number.isSafeInteger(parallelization) || !salt || !expected) {
      return false;
    }
    const derived = scryptSync(input, salt, expected.length / 2, { N: cost, r: blockSize, p: parallelization });
    const expectedBuffer = Buffer.from(expected, 'hex');
    return expectedBuffer.length === derived.length && timingSafeEqual(expectedBuffer, derived);
  }
  // Existing local rows use SHA-256. They are rehashed to scrypt after a successful login.
  const legacy = Buffer.from(createHash('sha256').update(input).digest('hex'));
  const candidate = Buffer.from(stored);
  return legacy.length === candidate.length && timingSafeEqual(legacy, candidate);
}

export function needsPasswordRehash(stored?: string | null): boolean {
  return !stored?.startsWith(`${SCRYPT_PREFIX}$`);
}

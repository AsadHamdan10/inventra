import crypto from 'crypto';
import { env } from './env';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const VERSION_PREFIX = 'v2:';

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = env.FINANCIAL_ENCRYPT_KEY;
  const keyBuf = Buffer.from(raw, 'utf8');

  cachedKey =
    keyBuf.length === KEY_LENGTH
      ? keyBuf
      : crypto.createHash('sha256').update(keyBuf).digest();

  return cachedKey;
}

export function encryptFinancialData(
  value: number | string | null | undefined
): string {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  const plaintext = String(value);

  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    getKey(),
    iv
  );

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  const payload = Buffer.concat([
    iv,
    authTag,
    ciphertext,
  ]);

  return VERSION_PREFIX + payload.toString('base64');
}

export function decryptFinancialData(
  value: string | number | null | undefined
): number {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (!value.startsWith(VERSION_PREFIX)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  const raw = Buffer.from(
    value.slice(VERSION_PREFIX.length),
    'base64'
  );

  const iv = raw.subarray(0, IV_LENGTH);

  const authTag = raw.subarray(
    IV_LENGTH,
    IV_LENGTH + AUTH_TAG_LENGTH
  );

  const ciphertext = raw.subarray(
    IV_LENGTH + AUTH_TAG_LENGTH
  );

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    iv
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');

  return Number(decrypted);
}

export function safeDecryptFinancial(
  value: string | number | null | undefined
): number {
  try {
    return decryptFinancialData(value);
  } catch (err) {
    console.error(
      '[financialCrypto]',
      err
    );

    return 0;
  }
}

export function encryptFinancialIfNonZero(
  value: number | null | undefined
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === 0
  ) {
    return null;
  }

  return encryptFinancialData(value);
}
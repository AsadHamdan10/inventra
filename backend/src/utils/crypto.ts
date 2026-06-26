/**
 * Field-level encryption utilities — AES-256-GCM
 * ───────────────────────────────────────────────
 * Used to encrypt sensitive business data (GSTIN, PAN, phone, address,
 * bank account numbers, etc.) before it is written to PostgreSQL, and to
 * decrypt it again only when it needs to be shown to an authorized user.
 *
 * Why GCM and not CBC:
 *   GCM is an *authenticated* cipher — it produces a 16-byte auth tag that
 *   detects any tampering with the ciphertext. CBC has no integrity check,
 *   so a corrupted or maliciously modified ciphertext silently decrypts to
 *   garbage instead of failing loudly. For financial/business-identity data
 *   (GSTIN, bank account numbers) that distinction matters.
 *
 * Stored format (single string, safe to put in a `Text` column):
 *   "v1:" + base64( iv[12] + authTag[16] + ciphertext )
 *
 * The "v1:" version prefix exists so that if the algorithm or KDF ever
 * changes again, old and new ciphertexts can coexist during a migration —
 * decryptData() branches on it instead of guessing.
 *
 * Legacy v0 (no prefix) values produced by the older AES-256-CBC
 * implementation are still readable — see decryptLegacyCbc() — so existing
 * encrypted rows do not need to be force-migrated before this file is
 * deployed. Run the migration script to re-encrypt them to v1 when convenient.
 */

import crypto from 'crypto';
import { env } from './env';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96-bit IV is the recommended/most efficient size for GCM
const AUTH_TAG_LENGTH = 16;
const VERSION_PREFIX = 'v1:';

// Legacy CBC settings — only used for decrypting pre-existing data.
const LEGACY_ALGORITHM = 'aes-256-cbc';
const LEGACY_IV_LENGTH = 16;

let cachedKey: Buffer | null = null;

/**
 * Derive the 32-byte AES key from ENCRYPT_KEY.
 * If the env var is already exactly 32 bytes it's used as-is; otherwise
 * it's hashed with SHA-256 to fold it into the right length. Cached after
 * first call since this never changes during the process lifetime.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = env.ENCRYPT_KEY;
  const keyBuf = Buffer.from(raw, 'utf8');
  cachedKey = keyBuf.length === KEY_LENGTH ? keyBuf : crypto.createHash('sha256').update(keyBuf).digest();
  return cachedKey;
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns '' for empty/null input so callers can store NULL-equivalent
 * values without special-casing.
 */
export function encryptData(plaintext: string): string {
  if (plaintext === null || plaintext === undefined || plaintext === '') return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, ciphertext]);
  return VERSION_PREFIX + payload.toString('base64');
}

/** Decrypt a v1 (AES-256-GCM) blob. Throws on auth-tag mismatch or corruption. */
function decryptGcm(b64: string): string {
  const key = getKey();
  const raw = Buffer.from(b64, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Decrypt a legacy v0 (AES-256-CBC) blob, for rows written before the
 * GCM migration. Remove this once the backfill migration has run and
 * been verified against production data.
 */
function decryptLegacyCbc(b64: string): string {
  const key = getKey();
  const raw = Buffer.from(b64, 'base64');
  const iv = raw.subarray(0, LEGACY_IV_LENGTH);
  const ciphertext = raw.subarray(LEGACY_IV_LENGTH);
  const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Decrypt a blob produced by encryptData() (or the legacy encryptor).
 *
 * Throws DecryptionError on failure instead of silently returning the raw
 * blob — a financial app should never display ciphertext-as-if-plaintext
 * to a user without anyone noticing. Callers that want a non-throwing
 * variant should use safeDecrypt().
 */
export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

export function decryptData(blob: string): string {
  if (!blob) return '';

  if (blob.startsWith(VERSION_PREFIX)) {
    try {
      return decryptGcm(blob.slice(VERSION_PREFIX.length));
    } catch (err) {
      throw new DecryptionError(`Failed to decrypt v1 value: ${(err as Error).message}`);
    }
  }

  // No version prefix → either a legacy CBC blob or genuinely unencrypted
  // plaintext left over from before encryption existed on this field.
  try {
    return decryptLegacyCbc(blob);
  } catch {
    // Not a valid CBC blob either — most likely this really is plaintext
    // (e.g. a record created before encryption was added to this column,
    // or a value that was never encrypted in the first place). Returning
    // it as-is keeps old records readable during migration; the migration
    // script (see migration/encryptExistingData.ts) re-encrypts these.
    return blob;
  }
}

/**
 * Decrypt without throwing. Logs failures via console.error so they are
 * visible in server logs, and returns a clearly-marked placeholder instead
 * of either crashing the request or silently showing ciphertext/garbage.
 */
export function safeDecrypt(val: string | null | undefined): string {
  if (!val) return '';
  try {
    return decryptData(val);
  } catch (err) {
    console.error('[crypto] safeDecrypt failed:', (err as Error).message);
    return '[unreadable]';
  }
}

/** Encrypt only if value is non-empty; returns null for empty/blank input (matches nullable DB columns). */
export function encryptIfPresent(val: string | undefined | null): string | null {
  if (!val || val.trim() === '') return null;
  return encryptData(val.trim());
}

// ────────────────────────────────────────────────────────────────────────
// Blind index (deterministic lookup hash)
// ────────────────────────────────────────────────────────────────────────
// AES-GCM uses a random IV per call, which is correct for security but
// means the same plaintext never produces the same ciphertext twice — so
// you cannot do `WHERE encrypted_col = ?` to enforce uniqueness or to look
// a record up by GSTIN/email/etc.
//
// The standard fix (used by SAP, NetSuite-style ERPs, and most field-level
// encryption libraries) is a "blind index": a separate deterministic HMAC
// of the normalized plaintext, stored in its own indexed column alongside
// the encrypted value. The HMAC key is distinct from the encryption key,
// so possessing the lookup hash alone never helps decrypt the data, and
// the hash never appears anywhere in application responses — it exists
// purely for `WHERE` clauses.
//
// Usage pattern for a field like User.gstin:
//   gstinEnc:  encryptIfPresent(gstin)       // Text column, shown to user
//   gstinHash: blindIndex(gstin)             // Text/varchar column, @unique or indexed
// Lookups become: prisma.user.findFirst({ where: { gstinHash: blindIndex(input) } })

function getLookupKey(): Buffer {
  // Deliberately derived from the same ENCRYPT_KEY but domain-separated
  // with a fixed label, so it is a different key than the AES key even
  // though it comes from the same secret.
  return crypto.createHash('sha256').update(getKey()).update('blind-index-v1').digest();
}

/**
 * Deterministic lookup hash for an encrypted-but-searchable field.
 * Always normalize input the same way before hashing (e.g. `.toUpperCase().trim()`
 * for GSTIN/PAN) so that equivalent values produce the same hash.
 * Returns null for empty input so it can go straight into a nullable column.
 */
export function blindIndex(val: string | undefined | null): string | null {
  if (!val || val.trim() === '') return null;
  return crypto.createHmac('sha256', getLookupKey()).update(val.trim()).digest('hex');
}
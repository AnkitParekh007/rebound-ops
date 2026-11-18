import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { closeSync, fsyncSync, openSync, readSync, rmSync, statSync, writeSync } from 'node:fs';

/**
 * Optional password protection for backup files.
 *
 * Construction (no custom cryptography; Node's OpenSSL primitives only):
 *   - key derivation: scrypt (RFC 7914) with a random 16-byte salt per file;
 *   - encryption: AES-256-GCM with a random 12-byte IV per file;
 *   - the plaintext header (format version, KDF parameters, salt, IV and
 *     non-secret metadata) is bound to the ciphertext as additional
 *     authenticated data, so any change to it fails authentication.
 *
 * File layout:
 *   "RBOBAK\x01\n" (8 bytes) | header length (uint32 BE) | header JSON | ciphertext | GCM tag (16 bytes)
 *
 * Passwords are never written to disk or logs. The decrypted output is only
 * kept if the authentication tag verifies; otherwise it is removed.
 */

export const ENCRYPTED_MAGIC = Buffer.from('RBOBAK\x01\n', 'latin1');
const TAG_LENGTH = 16;
const CHUNK = 1 << 20;
export const MIN_PASSWORD_LENGTH = 10;

export interface EncryptedBackupHeader {
  format: 'reboundops-encrypted-backup';
  version: 1;
  kdf: { name: 'scrypt'; N: number; r: number; p: number; salt: string; keyLength: 32 };
  cipher: { name: 'aes-256-gcm'; iv: string };
  createdAt: string;
  /** Schema version of the database inside (non-secret, authenticated). */
  schemaVersion: number;
  appVersion: string;
}

export class BackupCryptoError extends Error {
  readonly code: 'wrong_password_or_damaged' | 'unsupported' | 'malformed' | 'weak_password';
  constructor(message: string, code: BackupCryptoError['code']) {
    super(message);
    this.code = code;
    this.name = 'BackupCryptoError';
  }
}

/** Default work factor: ~128 MiB memory, well under a second on current laptops. */
export const DEFAULT_SCRYPT = { N: 1 << 17, r: 8, p: 1 } as const;

function deriveKey(password: string, kdf: EncryptedBackupHeader['kdf']): Buffer {
  const maxmem = 128 * kdf.N * kdf.r * 2;
  return scryptSync(password.normalize('NFC'), Buffer.from(kdf.salt, 'base64'), kdf.keyLength, { N: kdf.N, r: kdf.r, p: kdf.p, maxmem });
}

export function isEncryptedBackup(file: string): boolean {
  const fd = openSync(file, 'r');
  try {
    const head = Buffer.alloc(ENCRYPTED_MAGIC.length);
    const n = readSync(fd, head, 0, head.length, 0);
    return n === head.length && timingSafeEqual(head, ENCRYPTED_MAGIC);
  } finally {
    closeSync(fd);
  }
}

/** Reads and checks the plaintext header (no password needed). */
export function readEncryptedHeader(file: string): { header: EncryptedBackupHeader; headerBytes: Buffer; bodyStart: number } {
  const size = statSync(file).size;
  const fd = openSync(file, 'r');
  try {
    const pre = Buffer.alloc(ENCRYPTED_MAGIC.length + 4);
    if (readSync(fd, pre, 0, pre.length, 0) !== pre.length || !pre.subarray(0, ENCRYPTED_MAGIC.length).equals(ENCRYPTED_MAGIC)) {
      throw new BackupCryptoError('This is not a password-protected ReboundOps backup.', 'malformed');
    }
    const len = pre.readUInt32BE(ENCRYPTED_MAGIC.length);
    if (len < 2 || len > 64 * 1024 || pre.length + len + TAG_LENGTH > size) {
      throw new BackupCryptoError('The protected backup header is damaged.', 'malformed');
    }
    const headerBytes = Buffer.alloc(len);
    readSync(fd, headerBytes, 0, len, pre.length);
    let header: EncryptedBackupHeader;
    try {
      header = JSON.parse(headerBytes.toString('utf8')) as EncryptedBackupHeader;
    } catch {
      throw new BackupCryptoError('The protected backup header is damaged.', 'malformed');
    }
    if (header.format !== 'reboundops-encrypted-backup' || header.version !== 1) {
      throw new BackupCryptoError('This protected backup was made by a newer ReboundOps. Update ReboundOps first.', 'unsupported');
    }
    const k = header.kdf;
    if (k?.name !== 'scrypt' || k.keyLength !== 32 || !Number.isInteger(k.N) || k.N < 1 << 14 || k.N > 1 << 20 || (k.N & (k.N - 1)) !== 0 || k.r < 1 || k.r > 32 || k.p < 1 || k.p > 4) {
      throw new BackupCryptoError('The protected backup uses unsupported key settings.', 'unsupported');
    }
    if (header.cipher?.name !== 'aes-256-gcm' || Buffer.from(header.cipher.iv, 'base64').length !== 12 || Buffer.from(k.salt, 'base64').length < 16) {
      throw new BackupCryptoError('The protected backup uses unsupported encryption settings.', 'unsupported');
    }
    return { header, headerBytes, bodyStart: pre.length + len };
  } finally {
    closeSync(fd);
  }
}

export function checkPasswordStrength(password: string): void {
  if (typeof password !== 'string' || [...password].length < MIN_PASSWORD_LENGTH) {
    throw new BackupCryptoError(`Use a backup password of at least ${MIN_PASSWORD_LENGTH} characters.`, 'weak_password');
  }
}

/** Encrypts `plainFile` into `outFile` (which must not exist). */
export function encryptBackupFile(
  plainFile: string,
  outFile: string,
  password: string,
  meta: { schemaVersion: number; appVersion: string; createdAt?: string },
  scrypt: { N: number; r: number; p: number } = DEFAULT_SCRYPT,
): EncryptedBackupHeader {
  checkPasswordStrength(password);
  const header: EncryptedBackupHeader = {
    format: 'reboundops-encrypted-backup',
    version: 1,
    kdf: { name: 'scrypt', ...scrypt, salt: randomBytes(16).toString('base64'), keyLength: 32 },
    cipher: { name: 'aes-256-gcm', iv: randomBytes(12).toString('base64') },
    createdAt: meta.createdAt ?? new Date().toISOString(),
    schemaVersion: meta.schemaVersion,
    appVersion: meta.appVersion,
  };
  const headerBytes = Buffer.from(JSON.stringify(header), 'utf8');
  const key = deriveKey(password, header.kdf);
  const cipher = createCipheriv('aes-256-gcm', key, Buffer.from(header.cipher.iv, 'base64'));
  cipher.setAAD(headerBytes);
  const out = openSync(outFile, 'wx', 0o600);
  const inp = openSync(plainFile, 'r');
  let ok = false;
  try {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(headerBytes.length);
    writeSync(out, ENCRYPTED_MAGIC);
    writeSync(out, len);
    writeSync(out, headerBytes);
    const buf = Buffer.alloc(CHUNK);
    let pos = 0;
    for (;;) {
      const n = readSync(inp, buf, 0, CHUNK, pos);
      if (n === 0) break;
      pos += n;
      writeSync(out, cipher.update(buf.subarray(0, n)));
    }
    writeSync(out, cipher.final());
    writeSync(out, cipher.getAuthTag());
    fsyncSync(out);
    ok = true;
  } finally {
    closeSync(inp);
    closeSync(out);
    key.fill(0);
    if (!ok) rmSync(outFile, { force: true });
  }
  return header;
}

/**
 * Decrypts and authenticates `file` into `outFile` (which must not exist).
 * On a wrong password or any tampering, `outFile` is removed and a
 * BackupCryptoError is thrown; no unauthenticated plaintext is left behind.
 */
export function decryptBackupFile(file: string, outFile: string, password: string): EncryptedBackupHeader {
  const { header, headerBytes, bodyStart } = readEncryptedHeader(file);
  const size = statSync(file).size;
  const bodyEnd = size - TAG_LENGTH;
  const fd = openSync(file, 'r');
  let out: number | null = null;
  let ok = false;
  const key = deriveKey(password, header.kdf);
  try {
    const tag = Buffer.alloc(TAG_LENGTH);
    readSync(fd, tag, 0, TAG_LENGTH, bodyEnd);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(header.cipher.iv, 'base64'));
    decipher.setAAD(headerBytes);
    decipher.setAuthTag(tag);
    out = openSync(outFile, 'wx', 0o600);
    const buf = Buffer.alloc(CHUNK);
    let pos = bodyStart;
    while (pos < bodyEnd) {
      const n = readSync(fd, buf, 0, Math.min(CHUNK, bodyEnd - pos), pos);
      if (n === 0) break;
      pos += n;
      writeSync(out, decipher.update(buf.subarray(0, n)));
    }
    try {
      writeSync(out, decipher.final());
    } catch {
      throw new BackupCryptoError('The password is wrong or the backup file was damaged or changed.', 'wrong_password_or_damaged');
    }
    fsyncSync(out);
    ok = true;
    return header;
  } finally {
    key.fill(0);
    closeSync(fd);
    if (out !== null) closeSync(out);
    if (!ok) rmSync(outFile, { force: true });
  }
}

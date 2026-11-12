/**
 * Operations store backups (R0 FND-06). A backup is a consistent SQLite copy
 * (`VACUUM INTO`) in `<data dir>/operations/backups/`, with a JSON manifest
 * beside it. A restore accepts only a backup name (never a path) and checks
 * the file against its manifest's SHA-256 before the store checks integrity,
 * schema version and layout and replaces its records in one transaction.
 *
 * Backups hold the same records as the store and nothing else: the store
 * holds no provider keys or tokens, and the manifest holds counts and hashes,
 * never payloads. They are not encrypted (roadmap gap S3).
 */
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OperationsStore } from './store.js';

export const BACKUP_DIRECTORY = join('operations', 'backups');
export const BACKUP_FORMAT = 'reboundops-operations-backup';
export const BACKUP_NAME_RE = /^operations-\d{8}T\d{9}Z(?:-\d{1,3})?\.sqlite$/;

export type BackupReason = 'manual' | 'pre_restore';

export interface BackupManifest {
  readonly format: typeof BACKUP_FORMAT;
  readonly formatVersion: 1;
  readonly name: string;
  readonly createdAt: string;
  readonly reason: BackupReason;
  readonly schemaVersion: number;
  readonly sha256: string;
  readonly bytes: number;
  readonly entities: number;
  readonly events: number;
}

export class BackupNotFoundError extends Error {
  constructor() { super('No backup with that name.'); this.name = 'BackupNotFoundError'; }
}
export class BackupHashMismatchError extends Error {
  constructor() { super('The backup file does not match its manifest; it may be damaged or edited. Nothing was changed.'); this.name = 'BackupHashMismatchError'; }
}

const sha256File = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

function backupDir(dataDir: string): string {
  const dir = join(dataDir, BACKUP_DIRECTORY);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') chmodSync(dir, 0o700);
  return dir;
}

function stamp(at: Date): string {
  // 2026-11-12T13:45:01.234Z → 20261112T134501234Z
  return at.toISOString().replace(/[-:.]/g, '');
}

export function createBackup(store: OperationsStore, dataDir: string, reason: BackupReason, now: Date = new Date()): BackupManifest {
  const dir = backupDir(dataDir);
  let name = `operations-${stamp(now)}.sqlite`;
  for (let i = 1; existsSync(join(dir, name)); i++) name = `operations-${stamp(now)}-${i}.sqlite`;
  const file = join(dir, name);
  store.backupTo(file);
  const manifest: BackupManifest = {
    format: BACKUP_FORMAT, formatVersion: 1, name, createdAt: now.toISOString(), reason,
    schemaVersion: store.schemaVersion, sha256: sha256File(file), bytes: readFileSync(file).length,
    ...store.counts()
  };
  writeFileSync(`${file}.json`, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  return manifest;
}

function readManifest(dir: string, name: string): BackupManifest | null {
  try {
    const m = JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8')) as Partial<BackupManifest>;
    const valid = m.format === BACKUP_FORMAT && m.formatVersion === 1 && m.name === name &&
      typeof m.sha256 === 'string' && /^[a-f0-9]{64}$/.test(m.sha256) &&
      Number.isSafeInteger(m.schemaVersion) && typeof m.createdAt === 'string';
    return valid ? (m as BackupManifest) : null;
  } catch {
    return null;
  }
}

/** Backups with a readable manifest and file, newest first. */
export function listBackups(dataDir: string): BackupManifest[] {
  const dir = join(dataDir, BACKUP_DIRECTORY);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => BACKUP_NAME_RE.test(f))
    .map((f) => readManifest(dir, f))
    .filter((m): m is BackupManifest => m !== null)
    .sort((a, b) => b.name.localeCompare(a.name));
}

/**
 * The verified file for a backup name. Only a bare name matching the backup
 * pattern is accepted, so a path, `..` or another file can never be named;
 * the file must match its manifest's SHA-256.
 */
export function verifiedBackupFile(dataDir: string, name: string): { file: string; manifest: BackupManifest } {
  if (!BACKUP_NAME_RE.test(name)) throw new BackupNotFoundError();
  const dir = join(dataDir, BACKUP_DIRECTORY);
  const file = join(dir, name);
  const manifest = existsSync(file) ? readManifest(dir, name) : null;
  if (!manifest) throw new BackupNotFoundError();
  if (sha256File(file) !== manifest.sha256) throw new BackupHashMismatchError();
  return { file, manifest };
}

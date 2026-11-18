import { chmodSync, copyFileSync, existsSync, mkdtempSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { LATEST_SCHEMA_VERSION } from './migrations.ts';
import { DATABASE_FILE, Store } from './store.ts';

/**
 * Whole-database backup and restore.
 *
 * A backup is a consistent SQLite snapshot (`VACUUM INTO`) holding everything:
 * profile, jobs, applications, activity, drafts, screening answers, contacts,
 * reminders, stored resume originals and AI settings (never API keys, which are
 * read from the environment only).
 *
 * Restore runs only while ReboundOps is stopped. It validates the backup in a
 * scratch copy first, then moves the current database aside (never deleting it)
 * and puts the backup in its place.
 */

export const LOCK_FILE = 'api.lock';
const SQLITE_MAGIC = Buffer.from('SQLite format 3\0', 'latin1');

export class BackupError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'BackupError';
  }
}

export interface BackupCheck {
  schemaVersion: number;
  counts: Record<string, number>;
}

/** Validates a backup file without modifying it. Throws BackupError with a readable reason. */
export function verifyBackup(file: string, scratchDir: string): BackupCheck {
  if (!existsSync(file)) throw new BackupError('The backup file does not exist.');
  const head = Buffer.alloc(16);
  const bytes = readFileSync(file);
  bytes.copy(head, 0, 0, 16);
  if (!head.equals(SQLITE_MAGIC)) throw new BackupError('This is not a ReboundOps backup (not an SQLite database).');

  let schemaVersion: number;
  const ro = new DatabaseSync(file, { readOnly: true });
  try {
    const integrity = ro.prepare('PRAGMA integrity_check').get() as { integrity_check?: string } | undefined;
    if (integrity?.integrity_check !== 'ok') throw new BackupError('The backup file is damaged (integrity check failed).');
    const hasMigrations = ro.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").get();
    if (!hasMigrations) throw new BackupError('This SQLite file is not a ReboundOps backup.');
    const row = ro.prepare('SELECT MAX(version) AS v FROM schema_migrations').get() as { v: number | null } | undefined;
    schemaVersion = row?.v ?? 0;
  } catch (err) {
    if (err instanceof BackupError) throw err;
    throw new BackupError(`The backup could not be read: ${(err as Error).message}`, { cause: err });
  } finally {
    ro.close();
  }
  if (schemaVersion > LATEST_SCHEMA_VERSION) {
    throw new BackupError(`The backup was made by a newer ReboundOps (schema ${schemaVersion}; this version supports ${LATEST_SCHEMA_VERSION}). Update ReboundOps first.`);
  }
  if (schemaVersion < 1) throw new BackupError('The backup contains no ReboundOps data.');

  // Open a scratch copy as a real store: runs any pending migrations and validates every record.
  const dir = mkdtempSync(join(scratchDir, '.restore-check-'));
  try {
    copyFileSync(file, join(dir, DATABASE_FILE));
    const store = new Store({ dataDir: dir });
    try {
      return { schemaVersion, counts: store.validateAll() };
    } catch (err) {
      throw new BackupError(`The backup contains records this version cannot read: ${(err as Error).message}`, { cause: err });
    } finally {
      store.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Marks the data directory as in use by a running server. Returns a release function. */
export function acquireLock(dataDir: string): () => void {
  const file = join(dataDir, LOCK_FILE);
  const other = runningPid(dataDir);
  if (other !== null && other !== process.pid) throw new BackupError(`Another ReboundOps (process ${other}) is using ${dataDir}.`);
  writeFileSync(file, String(process.pid), { mode: 0o600 });
  return () => {
    try {
      if (readFileSync(file, 'utf8').trim() === String(process.pid)) unlinkSync(file);
    } catch {
      // Already gone.
    }
  };
}

/** PID of a live server using this data directory, or null (stale locks are ignored). */
export function runningPid(dataDir: string): number | null {
  const file = join(dataDir, LOCK_FILE);
  if (!existsSync(file)) return null;
  const pid = Number(readFileSync(file, 'utf8').trim());
  return Number.isInteger(pid) && pid > 0 && pidAlive(pid) ? pid : null;
}

export interface RestoreResult extends BackupCheck {
  restoredTo: string;
  previousSavedAs: string | null;
}

/**
 * Replaces the database in `dataDir` with a verified backup. The previous
 * database (and its WAL files) is renamed, never deleted. Refuses while a
 * server is running against the same directory.
 */
export function restoreBackup(backupFile: string, dataDir: string, now: () => Date = () => new Date()): RestoreResult {
  const pid = runningPid(dataDir);
  if (pid !== null) throw new BackupError(`ReboundOps is running (process ${pid}). Stop it before restoring.`);
  const check = verifyBackup(backupFile, dataDir);

  const target = join(dataDir, DATABASE_FILE);
  let previousSavedAs: string | null = null;
  if (existsSync(target)) {
    // Fold the WAL into the main file so the saved copy is self-contained.
    const db = new DatabaseSync(target);
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    } finally {
      db.close();
    }
    const stamp = now().toISOString().replace(/[:.]/g, '-');
    previousSavedAs = `${target}.pre-restore-${stamp}`;
    renameSync(target, previousSavedAs);
    for (const suffix of ['-wal', '-shm']) if (existsSync(target + suffix)) renameSync(target + suffix, previousSavedAs + suffix);
  }
  const staging = `${target}.restoring`;
  copyFileSync(backupFile, staging);
  try {
    chmodSync(staging, 0o600);
  } catch {
    // Best effort on file systems without POSIX permissions.
  }
  renameSync(staging, target);
  // Bring an older backup up to the current schema now, so the first start is clean.
  const store = new Store({ dataDir });
  store.close();
  return { ...check, restoredTo: target, previousSavedAs };
}


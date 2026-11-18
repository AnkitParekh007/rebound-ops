import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  rmSync,
  statfsSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { BackupCryptoError, decryptBackupFile, isEncryptedBackup } from './backup-crypto.ts';
import { LATEST_SCHEMA_VERSION } from './migrations.ts';
import { DATABASE_FILE, Store } from './store.ts';

/**
 * Whole-database backup and restore.
 *
 * A backup is a consistent SQLite snapshot (`VACUUM INTO`) holding everything:
 * profile, jobs, applications, activity, drafts, screening answers, contacts,
 * reminders, stored resume originals and AI settings (never API keys, which are
 * read from the environment only). A backup may optionally be wrapped in
 * password-based authenticated encryption (see backup-crypto.ts).
 *
 * Restore runs only while ReboundOps is stopped, and is crash-safe:
 *   1. take the data-directory lock (so no server can start meanwhile);
 *   2. decrypt (if needed) and fully validate the backup in a scratch copy;
 *   3. check free disk space;
 *   4. stage the replacement next to the live database, migrate and validate it;
 *   5. write a restore journal, move the current database aside, move the
 *      staged one into place, remove the journal.
 * If anything fails after step 5 begins, the journal lets the next start (or
 * the same call's error handler) put the original database back. The current
 * database is never deleted.
 */

export const LOCK_FILE = 'api.lock';
export const RESTORE_JOURNAL = 'restore.journal';
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
  encrypted: boolean;
}

function readHead(file: string, n: number): Buffer {
  const fd = openSync(file, 'r');
  try {
    const buf = Buffer.alloc(n);
    const read = readSync(fd, buf, 0, n, 0);
    return buf.subarray(0, read);
  } finally {
    closeSync(fd);
  }
}

/** Validates a plain SQLite backup without modifying it. Throws BackupError with a readable reason. */
function verifyPlainBackup(file: string, scratchDir: string): Omit<BackupCheck, 'encrypted'> {
  if (!readHead(file, 16).equals(SQLITE_MAGIC)) throw new BackupError('This is not a ReboundOps backup (not an SQLite database).');

  let schemaVersion: number;
  let ro: DatabaseSync | undefined;
  try {
    ro = new DatabaseSync(file, { readOnly: true });
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
    ro?.close();
  }
  if (schemaVersion > LATEST_SCHEMA_VERSION) {
    throw new BackupError(`The backup was made by a newer ReboundOps (schema ${schemaVersion}; this version supports ${LATEST_SCHEMA_VERSION}). Update ReboundOps first.`);
  }
  if (schemaVersion < 1) throw new BackupError('The backup contains no ReboundOps data.');

  // Open a scratch copy as a real store: runs any pending migrations and validates every record.
  const dir = mkdtempSync(join(scratchDir, '.restore-check-'));
  try {
    copyFileSync(file, join(dir, DATABASE_FILE));
    let store: Store | undefined;
    try {
      store = new Store({ dataDir: dir });
      return { schemaVersion, counts: store.validateAll() };
    } catch (err) {
      throw new BackupError(`The backup contains records this version cannot read: ${(err as Error).message}`, { cause: err });
    } finally {
      store?.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export interface VerifyOptions {
  /** Required for encrypted backups. Never logged or stored. */
  password?: string;
}

/**
 * Produces a plain SQLite file for `file` inside `workDir`: the file itself when
 * unencrypted, or a decrypted private copy. The caller removes `workDir`.
 */
function plainCopy(file: string, workDir: string, options: VerifyOptions): { plain: string; encrypted: boolean } {
  if (!existsSync(file)) throw new BackupError('The backup file does not exist.');
  if (statSync(file).size === 0) throw new BackupError('The backup file is empty.');
  if (!isEncryptedBackup(file)) return { plain: file, encrypted: false };
  if (!options.password) throw new BackupError('This backup is password-protected. Enter its password to continue.');
  const plain = join(workDir, 'decrypted.sqlite');
  try {
    decryptBackupFile(file, plain, options.password);
  } catch (err) {
    if (err instanceof BackupCryptoError) throw new BackupError(err.message, { cause: err });
    throw new BackupError(`The protected backup could not be read: ${(err as Error).message}`, { cause: err });
  }
  return { plain, encrypted: true };
}

/** Validates a backup (plain or encrypted) without modifying it. Throws BackupError with a readable reason. */
export function verifyBackup(file: string, scratchDir: string, options: VerifyOptions = {}): BackupCheck {
  if (!existsSync(scratchDir)) mkdirSync(scratchDir, { recursive: true, mode: 0o700 });
  const work = mkdtempSync(join(scratchDir, '.restore-verify-'));
  try {
    const { plain, encrypted } = plainCopy(file, work, options);
    return { ...verifyPlainBackup(plain, scratchDir), encrypted };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ */
/* Data-directory lock                                                 */
/* ------------------------------------------------------------------ */

export type LockPurpose = 'server' | 'restore';

interface LockInfo {
  pid: number;
  purpose: LockPurpose;
  host: string;
  at: string;
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function readLock(file: string): LockInfo | null {
  let text: string;
  try {
    text = readFileSync(file, 'utf8').trim();
  } catch {
    return null;
  }
  // v0.1.0 lock files hold only the PID.
  if (/^\d+$/.test(text)) return { pid: Number(text), purpose: 'server', host: hostname(), at: '' };
  try {
    const v = JSON.parse(text) as Partial<LockInfo>;
    if (typeof v.pid === 'number' && Number.isInteger(v.pid) && v.pid > 0) {
      return { pid: v.pid, purpose: v.purpose === 'restore' ? 'restore' : 'server', host: String(v.host ?? ''), at: String(v.at ?? '') };
    }
  } catch {
    // Unreadable: treated as stale below.
  }
  return null;
}

/** A lock is held when its process is alive on this host. Locks from another host are respected. */
function lockHeld(info: LockInfo | null): boolean {
  if (!info) return false;
  if (info.host && info.host !== hostname()) return true;
  return pidAlive(info.pid);
}

function describeHolder(info: LockInfo, dataDir: string): string {
  return info.purpose === 'restore'
    ? `A restore (process ${info.pid}) is in progress in ${dataDir}.`
    : `Another ReboundOps (process ${info.pid}) is using ${dataDir}.`;
}

/**
 * Takes the exclusive data-directory lock. The lock file is created with
 * O_EXCL, so two processes starting at the same moment cannot both win; a
 * stale lock (holder no longer running) is replaced. Returns a release function.
 */
export function acquireLock(dataDir: string, purpose: LockPurpose = 'server'): () => void {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const file = join(dataDir, LOCK_FILE);
  const info: LockInfo = { pid: process.pid, purpose, host: hostname(), at: new Date().toISOString() };
  const body = JSON.stringify(info);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const fd = openSync(file, 'wx', 0o600);
      try {
        writeSync(fd, body);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      return () => {
        try {
          const current = readLock(file);
          if (current?.pid === process.pid) unlinkSync(file);
        } catch {
          // Already gone.
        }
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
    const existing = readLock(file);
    if (existing && existing.pid === process.pid && existing.host === hostname()) {
      throw new BackupError(`This process already holds the ReboundOps lock for ${dataDir}.`);
    }
    if (lockHeld(existing)) throw new BackupError(describeHolder(existing!, dataDir));
    // Stale: move it aside atomically so only one contender removes it, then retry.
    const aside = `${file}.stale-${process.pid}-${attempt}`;
    try {
      renameSync(file, aside);
      rmSync(aside, { force: true });
    } catch {
      // Someone else replaced it first; loop and re-check.
    }
  }
  throw new BackupError(`Could not take the ReboundOps lock for ${dataDir}. Try again.`);
}

/** PID of a live process (server or restore) using this data directory, or null (stale locks are ignored). */
export function runningPid(dataDir: string): number | null {
  const info = readLock(join(dataDir, LOCK_FILE));
  return lockHeld(info) ? info!.pid : null;
}

/* ------------------------------------------------------------------ */
/* Restore                                                             */
/* ------------------------------------------------------------------ */

export interface RestoreResult extends BackupCheck {
  restoredTo: string;
  previousSavedAs: string | null;
}

interface Journal {
  target: string;
  staged: string;
  previousSavedAs: string | null;
  phase: 'swapping';
}

/** Test seam: each hook runs at the named step and may throw to simulate a crash or I/O failure. */
export interface RestoreFaults {
  afterStage?: () => void;
  afterMoveAside?: () => void;
  beforeFinalRename?: () => void;
}

export interface RestoreOptions extends VerifyOptions {
  now?: () => Date;
  /** Free bytes available in the data directory; injectable for tests. */
  freeBytes?: (dir: string) => number;
  faults?: RestoreFaults;
}

function defaultFreeBytes(dir: string): number {
  const s = statfsSync(dir);
  return Number(s.bavail) * Number(s.bsize);
}

function fsyncFile(path: string): void {
  try {
    const fd = openSync(path, 'r');
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  } catch {
    // Best effort.
  }
}

function writeJournal(dataDir: string, j: Journal): void {
  const file = join(dataDir, RESTORE_JOURNAL);
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(j), { mode: 0o600 });
  fsyncFile(tmp);
  renameSync(tmp, file);
}

function moveWith(from: string, to: string): void {
  renameSync(from, to);
  for (const suffix of ['-wal', '-shm']) if (existsSync(from + suffix)) renameSync(from + suffix, to + suffix);
}

export interface RecoveryReport {
  action: 'none' | 'rolled_back' | 'completed';
  detail: string;
}

/**
 * Finishes or undoes a restore that was interrupted between moving the old
 * database aside and removing the journal. Safe to call on every start.
 * Leftover staging files from an interrupted restore are removed; the
 * pre-restore copy of the database is always kept.
 */
export function recoverInterruptedRestore(dataDir: string): RecoveryReport {
  const file = join(dataDir, RESTORE_JOURNAL);
  if (!existsSync(file)) {
    // Staging leftovers without a journal never replaced anything.
    for (const leftover of [`${join(dataDir, DATABASE_FILE)}.restoring`]) rmSync(leftover, { force: true });
    rmSync(`${file}.tmp`, { force: true });
    return { action: 'none', detail: 'No interrupted restore.' };
  }
  let j: Journal;
  try {
    j = JSON.parse(readFileSync(file, 'utf8')) as Journal;
  } catch {
    throw new BackupError(`The restore journal in ${dataDir} is unreadable. Do not delete any files; see the restore guide.`);
  }
  if (existsSync(j.staged)) {
    // The swap never completed: the staged copy is still waiting. Put the original back if it was moved.
    if (!existsSync(j.target) && j.previousSavedAs && existsSync(j.previousSavedAs)) moveWith(j.previousSavedAs, j.target);
    rmSync(j.staged, { force: true });
    for (const s of ['-wal', '-shm']) rmSync(j.staged + s, { force: true });
    unlinkSync(file);
    return { action: 'rolled_back', detail: 'An interrupted restore was undone; your previous data is back in place.' };
  }
  if (existsSync(j.target)) {
    unlinkSync(file);
    return { action: 'completed', detail: 'A restore that was interrupted after the swap was completed.' };
  }
  // Neither staged nor target: put the original back if we have it.
  if (j.previousSavedAs && existsSync(j.previousSavedAs)) {
    moveWith(j.previousSavedAs, j.target);
    unlinkSync(file);
    return { action: 'rolled_back', detail: 'An interrupted restore was undone; your previous data is back in place.' };
  }
  throw new BackupError(`An interrupted restore left no database in ${dataDir}. Restore again from your backup file.`);
}

/**
 * Replaces the database in `dataDir` with a verified backup. The previous
 * database (and its WAL files) is renamed, never deleted. Refuses while a
 * server is running against the same directory, and holds the lock so none
 * can start until it finishes.
 */
export function restoreBackup(backupFile: string, dataDir: string, nowOrOptions: (() => Date) | RestoreOptions = {}): RestoreResult {
  const opts: RestoreOptions = typeof nowOrOptions === 'function' ? { now: nowOrOptions } : nowOrOptions;
  const now = opts.now ?? (() => new Date());
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true, mode: 0o700 });

  let release: () => void;
  try {
    release = acquireLock(dataDir, 'restore');
  } catch (err) {
    const pid = runningPid(dataDir);
    if (pid !== null) throw new BackupError(`ReboundOps is running (process ${pid}). Stop it before restoring.`, { cause: err });
    throw err;
  }
  const work = mkdtempSync(join(dataDir, '.restore-work-'));
  try {
    recoverInterruptedRestore(dataDir);
    const { plain, encrypted } = plainCopy(backupFile, work, opts);
    const check = { ...verifyPlainBackup(plain, dataDir), encrypted };

    const target = join(dataDir, DATABASE_FILE);
    const staged = `${target}.restoring`;
    const needed = statSync(plain).size * 2 + 16 * 1024 * 1024;
    const free = (opts.freeBytes ?? defaultFreeBytes)(dataDir);
    if (free < needed) {
      throw new BackupError(
        `Not enough free disk space to restore safely (need about ${Math.ceil(needed / 1048576)} MB, ${Math.floor(free / 1048576)} MB free). Nothing was changed.`,
      );
    }

    // Stage: copy, bring to the current schema, validate, and fold its WAL.
    try {
      copyFileSync(plain, staged);
      try {
        chmodSync(staged, 0o600);
      } catch {
        // Best effort on file systems without POSIX permissions.
      }
      const stagingDir = mkdtempSync(join(work, 'stage-'));
      // Store expects DATABASE_FILE inside a directory; migrate a hard copy there, then move it back.
      const migrated = join(stagingDir, DATABASE_FILE);
      renameSync(staged, migrated);
      const store = new Store({ dataDir: stagingDir });
      try {
        store.validateAll();
        store.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
        store.db.exec('PRAGMA journal_mode = DELETE');
      } finally {
        store.close();
      }
      renameSync(migrated, staged);
      fsyncFile(staged);
      opts.faults?.afterStage?.();
    } catch (err) {
      rmSync(staged, { force: true });
      if (err instanceof BackupError) throw err;
      const code = (err as NodeJS.ErrnoException).code;
      const reason = code === 'ENOSPC' ? 'the disk is full' : (err as Error).message;
      throw new BackupError(`Restore stopped while preparing the backup (${reason}). Nothing was changed.`, { cause: err });
    }

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
    }

    writeJournal(dataDir, { target, staged, previousSavedAs, phase: 'swapping' });
    try {
      if (previousSavedAs) moveWith(target, previousSavedAs);
      opts.faults?.afterMoveAside?.();
      opts.faults?.beforeFinalRename?.();
      renameSync(staged, target);
      fsyncFile(target);
      unlinkSync(join(dataDir, RESTORE_JOURNAL));
    } catch (err) {
      // Undo using the journal; the original database is put back.
      try {
        recoverInterruptedRestore(dataDir);
      } catch (rollbackErr) {
        throw new BackupError(
          `Restore failed and could not be undone automatically: ${(rollbackErr as Error).message}. Your previous database is kept at ${previousSavedAs ?? '(none)'}.`,
          { cause: err },
        );
      }
      throw new BackupError(`Restore failed and was undone; your previous data is unchanged (${(err as Error).message}).`, { cause: err });
    }
    return { ...check, restoredTo: target, previousSavedAs };
  } finally {
    rmSync(work, { recursive: true, force: true });
    release();
  }
}

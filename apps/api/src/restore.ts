import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  BackupError,
  DATABASE_FILE,
  isEncryptedBackup,
  openStore,
  readEncryptedHeader,
  restoreBackup,
  runningPid,
  verifyBackup,
  type Store,
} from '@reboundops/storage';
import { z } from 'zod';
import { AppError, notFound } from './errors.ts';

/**
 * In-app restore, from Settings. The running server owns the data-directory
 * lock, so restore happens inside it as a controlled data-layer restart:
 *
 *   stage → (password) verify → explicit confirmation → recovery backup of
 *   the current data → close the database → crash-safe swap (the same code as
 *   the offline CLI) → reopen.
 *
 * Node runs the apply step synchronously, so no other request can touch the
 * database while it is closed. If anything fails, the original database is
 * put back and reopened, and the response says so.
 */

const STAGING = 'restore-staging';
const RECOVERY = 'recovery-backups';
const STAGE_TTL_MS = 24 * 3_600_000;
export const MAX_BACKUP_UPLOAD_BYTES = 256 * 1024 * 1024;

export const RestoreVerifyRequest = z.object({ password: z.string().max(1024).optional() });
export const RestoreApplyRequest = z.object({
  password: z.string().max(1024).optional(),
  /** The person typed RESTORE to confirm. */
  confirm: z.literal('RESTORE'),
});

export interface RestoreHost {
  getStore(): Store;
  replaceStore(next: Store): void;
  now(): Date;
}

export class RestoreService {
  private readonly host: RestoreHost;
  constructor(host: RestoreHost) {
    this.host = host;
  }

  private get dataDir(): string {
    const p = this.host.getStore().path;
    if (p === ':memory:') throw new AppError(409, 'restore_unavailable', 'This workspace is not stored on disk.');
    return dirname(p);
  }

  private stageFile(id: string): string {
    if (!/^[0-9a-f-]{36}$/.test(id)) throw notFound('Staged backup');
    const f = join(this.dataDir, STAGING, `${id}.upload`);
    if (!existsSync(f)) throw notFound('Staged backup');
    return f;
  }

  /** Removes staged uploads older than a day (they may hold decrypted-on-verify data paths, never passwords). */
  cleanup(): void {
    const dir = join(this.dataDir, STAGING);
    if (!existsSync(dir)) return;
    for (const f of readdirSync(dir)) {
      const full = join(dir, f);
      if (this.host.now().getTime() - statSync(full).mtimeMs > STAGE_TTL_MS) rmSync(full, { recursive: true, force: true });
    }
  }

  /** Saves an uploaded backup privately for inspection. Nothing is changed yet. */
  stage(bytes: Buffer) {
    if (!bytes.length) throw new AppError(422, 'empty_file', 'The backup file is empty.');
    const dir = join(this.dataDir, STAGING);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.cleanup();
    const id = randomUUID();
    const file = join(dir, `${id}.upload`);
    writeFileSync(file, bytes, { mode: 0o600 });
    const encrypted = isEncryptedBackup(file);
    let meta: { createdAt: string; schemaVersion: number; appVersion: string } | null = null;
    if (encrypted) {
      try {
        const h = readEncryptedHeader(file).header;
        meta = { createdAt: h.createdAt, schemaVersion: h.schemaVersion, appVersion: h.appVersion };
      } catch (err) {
        rmSync(file, { force: true });
        throw new AppError(422, 'invalid_backup', (err as Error).message);
      }
    }
    return { stageId: id, size: bytes.length, encrypted, meta, currentCounts: this.host.getStore().validateAll() };
  }

  /** Full validation (decrypts in a private scratch copy when protected). */
  verify(id: string, input: unknown) {
    const req = RestoreVerifyRequest.parse(input ?? {});
    const file = this.stageFile(id);
    try {
      const check = verifyBackup(file, join(this.dataDir, STAGING), { password: req.password });
      return { ...check, compatible: true, currentCounts: this.host.getStore().validateAll() };
    } catch (err) {
      if (err instanceof BackupError) {
        const code = /password-protected/.test(err.message) ? 'password_required' : /password is wrong|damaged or changed/.test(err.message) ? 'wrong_password_or_damaged' : 'invalid_backup';
        throw new AppError(code === 'password_required' ? 428 : 422, code, err.message);
      }
      throw err;
    }
  }

  cancel(id: string): void {
    rmSync(this.stageFile(id), { force: true });
  }

  /**
   * Replaces the live data with the staged backup. A recovery backup of the
   * current data is written first and kept.
   */
  apply(id: string, input: unknown) {
    const req = RestoreApplyRequest.parse(input);
    const file = this.stageFile(id);
    const dataDir = this.dataDir;
    if (runningPid(dataDir) !== process.pid) {
      throw new AppError(409, 'restore_unavailable', 'ReboundOps does not hold its data lock; restore with the command-line tool instead.');
    }
    // Validate fully before touching anything (also checks the password).
    this.verify(id, { password: req.password });

    const stamp = this.host.now().toISOString().replace(/[:.]/g, '-');
    const recoveryDir = join(dataDir, RECOVERY);
    mkdirSync(recoveryDir, { recursive: true, mode: 0o700 });
    const recoveryBackup = join(recoveryDir, `before-restore-${stamp}.sqlite`);
    const current = this.host.getStore();
    current.backupTo(recoveryBackup);

    current.close();
    let result;
    try {
      result = restoreBackup(file, dataDir, { password: req.password, lockHeld: true, now: () => this.host.now() });
    } catch (err) {
      // The swap rolled back (or never started); reopen the original data.
      this.host.replaceStore(openStore({ dataDir }));
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(500, 'restore_failed', `Restore did not complete and your data was left as it was. ${message} A copy of your data from just before the attempt is at ${recoveryBackup}.`);
    }
    this.host.replaceStore(openStore({ dataDir }));
    rmSync(file, { force: true });
    return {
      restored: true,
      schemaVersion: result.schemaVersion,
      counts: result.counts,
      encrypted: result.encrypted,
      recoveryBackup,
      previousDatabase: result.previousSavedAs,
      database: join(dataDir, DATABASE_FILE),
      instructions: `If this was a mistake: stop ReboundOps and run "npm run restore -- ${recoveryBackup} --yes" to go back to the data you had before.`,
    };
  }
}

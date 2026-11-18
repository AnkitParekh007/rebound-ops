import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { z } from 'zod';
import {
  ActivityEntry,
  Application,
  Job,
  OnboardingState,
  Profile,
} from '@reboundops/contracts';
import { LATEST_SCHEMA_VERSION, migrate } from './migrations.ts';

export const DATABASE_FILE = 'reboundops.sqlite';

export class CorruptRecordError extends Error {
  constructor(table: string, id: string, cause: unknown) {
    super(`Stored record ${table}/${id} failed validation and was not loaded.`, { cause });
    this.name = 'CorruptRecordError';
  }
}

export type StoreOptions =
  | { dataDir: string; now?: () => Date }
  | { memory: true; now?: () => Date };

type Row = Record<string, unknown>;

function parseRow<S extends z.ZodType>(schema: S, table: string, row: Row): z.infer<S> {
  const id = String(row['id'] ?? row['key'] ?? '?');
  let raw: unknown;
  try {
    raw = JSON.parse(String(row['data'] ?? row['value']));
  } catch (err) {
    throw new CorruptRecordError(table, id, err);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new CorruptRecordError(table, id, parsed.error);
  return parsed.data;
}

/**
 * Local-first persistence. One SQLite file in a private (0700) directory.
 * Records are stored as validated JSON documents with indexed key columns, so
 * the shape can evolve through contracts while queries stay simple.
 */
export class Store {
  readonly db: DatabaseSync;
  readonly path: string;
  readonly schemaVersion: number;

  constructor(options: StoreOptions) {
    if ('memory' in options) {
      this.path = ':memory:';
    } else {
      if (!existsSync(options.dataDir)) mkdirSync(options.dataDir, { recursive: true, mode: 0o700 });
      this.path = join(options.dataDir, DATABASE_FILE);
    }
    this.db = new DatabaseSync(this.path);
    if (this.path !== ':memory:') {
      try {
        chmodSync(this.path, 0o600);
      } catch {
        // Best effort on file systems without POSIX permissions.
      }
    }
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec('PRAGMA busy_timeout = 3000');
    if (this.path !== ':memory:') this.db.exec('PRAGMA journal_mode = WAL');
    migrate(this.db, undefined, options.now);
    this.schemaVersion = LATEST_SCHEMA_VERSION;
  }

  close(): void {
    if (this.db.isOpen) this.db.close();
  }

  /** Runs `fn` atomically; nested calls join the outer transaction. */
  transaction<T>(fn: () => T): T {
    if (this.db.isTransaction) return fn();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  /* ---------------- key/value documents ---------------- */

  private getKv<S extends z.ZodType>(key: string, schema: S): z.infer<S> | null {
    const row = this.db.prepare('SELECT key, value FROM kv WHERE key = ?').get(key) as Row | undefined;
    return row ? parseRow(schema, 'kv', row) : null;
  }

  private putKv(key: string, value: unknown, at: string): void {
    this.db
      .prepare(
        `INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(key, JSON.stringify(value), at);
  }

  getOnboarding(): OnboardingState | null {
    return this.getKv('onboarding', OnboardingState);
  }

  saveOnboarding(state: OnboardingState): OnboardingState {
    const valid = OnboardingState.parse(state);
    this.putKv('onboarding', valid, valid.updatedAt ?? new Date().toISOString());
    return valid;
  }

  getProfile(): Profile | null {
    return this.getKv('profile', Profile);
  }

  saveProfile(profile: Profile): Profile {
    const valid = Profile.parse(profile);
    this.putKv('profile', valid, valid.updatedAt ?? new Date().toISOString());
    return valid;
  }

  /* ---------------- jobs ---------------- */

  insertJob(job: Job): Job {
    const valid = Job.parse(job);
    this.db
      .prepare('INSERT INTO jobs (id, dedupe_key, captured_at, data) VALUES (?, ?, ?, ?)')
      .run(valid.id, valid.dedupeKey, valid.capturedAt, JSON.stringify(valid));
    return valid;
  }

  getJob(id: string): Job | null {
    const row = this.db.prepare('SELECT id, data FROM jobs WHERE id = ?').get(id) as Row | undefined;
    return row ? parseRow(Job, 'jobs', row) : null;
  }

  findJobsByDedupeKey(key: string): Job[] {
    return (this.db.prepare('SELECT id, data FROM jobs WHERE dedupe_key = ?').all(key) as Row[]).map(
      (r) => parseRow(Job, 'jobs', r),
    );
  }

  listJobs(): Job[] {
    return (
      this.db.prepare('SELECT id, data FROM jobs ORDER BY captured_at DESC').all() as Row[]
    ).map((r) => parseRow(Job, 'jobs', r));
  }

  /* ---------------- applications ---------------- */

  upsertApplication(app: Application): Application {
    const valid = Application.parse(app);
    this.db
      .prepare(
        `INSERT INTO applications (id, job_id, status, updated_at, data) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET status = excluded.status,
           updated_at = excluded.updated_at, data = excluded.data`,
      )
      .run(valid.id, valid.jobId, valid.status, valid.updatedAt, JSON.stringify(valid));
    return valid;
  }

  getApplication(id: string): Application | null {
    const row = this.db.prepare('SELECT id, data FROM applications WHERE id = ?').get(id) as
      | Row
      | undefined;
    return row ? parseRow(Application, 'applications', row) : null;
  }

  listApplications(): Application[] {
    return (
      this.db.prepare('SELECT id, data FROM applications ORDER BY updated_at DESC').all() as Row[]
    ).map((r) => parseRow(Application, 'applications', r));
  }

  /* ---------------- activity ---------------- */

  addActivity(entry: ActivityEntry): ActivityEntry {
    const valid = ActivityEntry.parse(entry);
    this.db
      .prepare('INSERT INTO activity (id, application_id, at, data) VALUES (?, ?, ?, ?)')
      .run(valid.id, valid.applicationId, valid.at, JSON.stringify(valid));
    return valid;
  }

  listActivity(applicationId?: string): ActivityEntry[] {
    const rows = applicationId
      ? this.db
          .prepare('SELECT id, data FROM activity WHERE application_id = ? ORDER BY at DESC, rowid DESC')
          .all(applicationId)
      : this.db.prepare('SELECT id, data FROM activity ORDER BY at DESC, rowid DESC').all();
    return (rows as Row[]).map((r) => parseRow(ActivityEntry, 'activity', r));
  }
}

export function openStore(options: StoreOptions): Store {
  return new Store(options);
}

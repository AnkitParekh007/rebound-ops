import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { z } from 'zod';
import {
  ActivityEntry,
  AiSettings,
  Application,
  ApplicationPackage,
  Contact,
  CoverLetterDraft,
  Job,
  OnboardingState,
  Profile,
  Reminder,
  ResumeDraft,
  ResumeFile,
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

  getAiSettings(): AiSettings | null {
    return this.getKv('ai_settings', AiSettings);
  }

  saveAiSettings(settings: AiSettings, at: string): AiSettings {
    const valid = AiSettings.parse(settings);
    this.putKv('ai_settings', valid, at);
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

  updateJob(job: Job): Job {
    const valid = Job.parse(job);
    const r = this.db.prepare('UPDATE jobs SET dedupe_key = ?, data = ? WHERE id = ?').run(valid.dedupeKey, JSON.stringify(valid), valid.id);
    if (Number(r.changes) !== 1) throw new Error(`Job ${valid.id} not found.`);
    return valid;
  }

  /** Deletes a job and, by cascade, its application, activity, drafts, contacts and reminders. */
  deleteJob(id: string): boolean {
    return Number(this.db.prepare('DELETE FROM jobs WHERE id = ?').run(id).changes) === 1;
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

  /* ---------------- resume originals ---------------- */

  insertResumeFile(meta: ResumeFile, data: Buffer): ResumeFile {
    const valid = ResumeFile.parse(meta);
    this.db
      .prepare('INSERT INTO resume_files (id, filename, media_type, sha256, size, imported_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(valid.id, valid.filename, valid.mediaType, valid.sha256, valid.size, valid.importedAt, data);
    return valid;
  }

  private static resumeMeta(r: Row): ResumeFile {
    return ResumeFile.parse({
      id: r['id'],
      filename: r['filename'],
      mediaType: r['media_type'],
      sha256: r['sha256'],
      size: Number(r['size']),
      importedAt: r['imported_at'],
    });
  }

  listResumeFiles(): ResumeFile[] {
    return (
      this.db.prepare('SELECT id, filename, media_type, sha256, size, imported_at FROM resume_files ORDER BY imported_at DESC').all() as Row[]
    ).map(Store.resumeMeta);
  }

  findResumeFileBySha(sha256: string): ResumeFile | null {
    const row = this.db.prepare('SELECT id, filename, media_type, sha256, size, imported_at FROM resume_files WHERE sha256 = ?').get(sha256) as Row | undefined;
    return row ? Store.resumeMeta(row) : null;
  }

  getResumeFile(id: string): { meta: ResumeFile; data: Buffer } | null {
    const row = this.db.prepare('SELECT * FROM resume_files WHERE id = ?').get(id) as Row | undefined;
    return row ? { meta: Store.resumeMeta(row), data: Buffer.from(row['data'] as Uint8Array) } : null;
  }

  /* ---------------- tailored documents ---------------- */

  getResumeDraft(applicationId: string): ResumeDraft | null {
    const row = this.db.prepare("SELECT application_id AS id, data FROM documents WHERE application_id = ? AND kind = 'resume'").get(applicationId) as Row | undefined;
    return row ? parseRow(ResumeDraft, 'documents', row) : null;
  }

  getCoverLetterDraft(applicationId: string): CoverLetterDraft | null {
    const row = this.db.prepare("SELECT application_id AS id, data FROM documents WHERE application_id = ? AND kind = 'cover_letter'").get(applicationId) as Row | undefined;
    return row ? parseRow(CoverLetterDraft, 'documents', row) : null;
  }

  getPackage(applicationId: string): ApplicationPackage | null {
    const row = this.db.prepare("SELECT application_id AS id, data FROM documents WHERE application_id = ? AND kind = 'package'").get(applicationId) as Row | undefined;
    return row ? parseRow(ApplicationPackage, 'documents', row) : null;
  }

  putDocument(doc: ResumeDraft | CoverLetterDraft | ApplicationPackage): void {
    const valid = doc.kind === 'resume' ? ResumeDraft.parse(doc) : doc.kind === 'cover_letter' ? CoverLetterDraft.parse(doc) : ApplicationPackage.parse(doc);
    this.db
      .prepare(
        `INSERT INTO documents (application_id, kind, updated_at, data) VALUES (?, ?, ?, ?)
         ON CONFLICT (application_id, kind) DO UPDATE SET updated_at = excluded.updated_at, data = excluded.data`,
      )
      .run(valid.applicationId, valid.kind, valid.updatedAt, JSON.stringify(valid));
  }

  /* ---------------- contacts & reminders ---------------- */

  upsertContact(c: Contact): Contact {
    const valid = Contact.parse(c);
    this.db
      .prepare('INSERT INTO contacts (id, application_id, data) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET data = excluded.data')
      .run(valid.id, valid.applicationId, JSON.stringify(valid));
    return valid;
  }

  listContacts(applicationId?: string): Contact[] {
    const rows = applicationId
      ? this.db.prepare('SELECT id, data FROM contacts WHERE application_id = ? ORDER BY rowid').all(applicationId)
      : this.db.prepare('SELECT id, data FROM contacts ORDER BY rowid').all();
    return (rows as Row[]).map((r) => parseRow(Contact, 'contacts', r));
  }

  deleteContact(id: string): boolean {
    return Number(this.db.prepare('DELETE FROM contacts WHERE id = ?').run(id).changes) === 1;
  }

  upsertReminder(r: Reminder): Reminder {
    const valid = Reminder.parse(r);
    this.db
      .prepare(
        `INSERT INTO reminders (id, application_id, due_on, done, data) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET due_on = excluded.due_on, done = excluded.done, data = excluded.data`,
      )
      .run(valid.id, valid.applicationId, valid.dueOn, valid.done ? 1 : 0, JSON.stringify(valid));
    return valid;
  }

  listReminders(applicationId?: string): Reminder[] {
    const rows = applicationId
      ? this.db.prepare('SELECT id, data FROM reminders WHERE application_id = ? ORDER BY due_on').all(applicationId)
      : this.db.prepare('SELECT id, data FROM reminders ORDER BY due_on').all();
    return (rows as Row[]).map((r) => parseRow(Reminder, 'reminders', r));
  }

  deleteReminder(id: string): boolean {
    return Number(this.db.prepare('DELETE FROM reminders WHERE id = ?').run(id).changes) === 1;
  }

  /* ---------------- backup ---------------- */

  /** Writes a consistent, compacted snapshot of the whole database to `file` (which must not exist). */
  backupTo(file: string): void {
    if (this.path === ':memory:') throw new Error('An in-memory store cannot be backed up.');
    this.db.prepare('VACUUM INTO ?').run(file);
  }

  /** Reads and validates every stored record; throws CorruptRecordError on the first bad one. Returns counts. */
  validateAll(): Record<string, number> {
    this.getOnboarding();
    this.getAiSettings();
    this.getProfile();
    const docs = this.db.prepare('SELECT application_id AS id, kind, data FROM documents').all() as Row[];
    for (const r of docs) {
      const schema = r['kind'] === 'resume' ? ResumeDraft : r['kind'] === 'cover_letter' ? CoverLetterDraft : ApplicationPackage;
      parseRow(schema, 'documents', r);
    }
    return {
      jobs: this.listJobs().length,
      applications: this.listApplications().length,
      activity: this.listActivity().length,
      contacts: this.listContacts().length,
      reminders: this.listReminders().length,
      resumeFiles: this.listResumeFiles().length,
      documents: docs.length,
    };
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

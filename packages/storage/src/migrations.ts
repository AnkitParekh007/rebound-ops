import type { DatabaseSync } from 'node:sqlite';

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

/**
 * Append-only list. Never edit a released migration; add a new one instead.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE kv (
        key         TEXT PRIMARY KEY,
        value       TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      ) STRICT;

      CREATE TABLE jobs (
        id          TEXT PRIMARY KEY,
        dedupe_key  TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        data        TEXT NOT NULL
      ) STRICT;
      CREATE INDEX jobs_dedupe_key ON jobs (dedupe_key);

      CREATE TABLE applications (
        id          TEXT PRIMARY KEY,
        job_id      TEXT NOT NULL UNIQUE REFERENCES jobs (id) ON DELETE CASCADE,
        status      TEXT NOT NULL,
        updated_at  TEXT NOT NULL,
        data        TEXT NOT NULL
      ) STRICT;
      CREATE INDEX applications_status ON applications (status);

      CREATE TABLE activity (
        id              TEXT PRIMARY KEY,
        application_id  TEXT NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
        at              TEXT NOT NULL,
        data            TEXT NOT NULL
      ) STRICT;
      CREATE INDEX activity_application ON activity (application_id, at);
    `,
  },
  {
    version: 2,
    name: 'resume_files_and_documents',
    sql: `
      -- Original resume files, byte-for-byte, kept inside the private database.
      CREATE TABLE resume_files (
        id          TEXT PRIMARY KEY,
        filename    TEXT NOT NULL,
        media_type  TEXT NOT NULL,
        sha256      TEXT NOT NULL,
        size        INTEGER NOT NULL,
        imported_at TEXT NOT NULL,
        data        BLOB NOT NULL
      ) STRICT;
      CREATE INDEX resume_files_sha ON resume_files (sha256);

      -- Editable tailored drafts, one per application and kind.
      CREATE TABLE documents (
        application_id TEXT NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
        kind           TEXT NOT NULL,
        updated_at     TEXT NOT NULL,
        data           TEXT NOT NULL,
        PRIMARY KEY (application_id, kind)
      ) STRICT;
    `,
  },
  {
    version: 3,
    name: 'contacts_and_reminders',
    sql: `
      CREATE TABLE contacts (
        id             TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
        data           TEXT NOT NULL
      ) STRICT;
      CREATE INDEX contacts_application ON contacts (application_id);

      CREATE TABLE reminders (
        id             TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
        due_on         TEXT NOT NULL,
        done           INTEGER NOT NULL DEFAULT 0,
        data           TEXT NOT NULL
      ) STRICT;
      CREATE INDEX reminders_due ON reminders (done, due_on);
    `,
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.at(-1)?.version ?? 0;

export class SchemaTooNewError extends Error {
  constructor(found: number, supported: number) {
    super(
      `This data was written by a newer ReboundOps (schema ${found}); this version supports up to ${supported}. ` +
        'Update ReboundOps instead of opening it with an older build.',
    );
    this.name = 'SchemaTooNewError';
  }
}

export function currentVersion(db: DatabaseSync): number {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    applied_at TEXT NOT NULL
  ) STRICT`);
  const row = db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get() as
    | { v: number | null }
    | undefined;
  return row?.v ?? 0;
}

/** Applies pending migrations, each in its own transaction. Returns versions applied. */
export function migrate(
  db: DatabaseSync,
  migrations: readonly Migration[] = MIGRATIONS,
  now: () => Date = () => new Date(),
): number[] {
  const latest = migrations.at(-1)?.version ?? 0;
  const from = currentVersion(db);
  if (from > latest) throw new SchemaTooNewError(from, latest);

  const applied: number[] = [];
  for (const m of migrations) {
    if (m.version <= from) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(m.sql);
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
        m.version,
        m.name,
        now().toISOString(),
      );
      db.exec('COMMIT');
      applied.push(m.version);
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${m.version} (${m.name}) failed: ${(err as Error).message}`, {
        cause: err,
      });
    }
  }
  return applied;
}

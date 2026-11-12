/**
 * The operations store (R0 FND-01/FND-02): one SQLite file, owned by one API
 * process, holding the append-only event ledger every operations feature
 * writes through. See docs/adr-0004-operations-store.md.
 *
 * Guarantees this module provides, each covered by apps/api/tests:
 * - Single owner: the connection takes SQLite's EXCLUSIVE lock at open and
 *   keeps it, so a second process (or connection) gets OperationsStoreLockedError
 *   instead of a second writer. The OS releases the lock if the process dies.
 * - Crash safety: every write is one transaction; a failure inside rolls back.
 * - Idempotency: an event id seen before returns the stored event when the
 *   content matches, and IdempotencyConflictError when it does not.
 * - Optimistic concurrency: a write names the revision it expects; any other
 *   current revision is a RevisionConflictError (an HTTP route maps it to 409).
 * - Migrations: forward-only, numbered by PRAGMA user_version, applied in one
 *   transaction, after a `VACUUM INTO` backup of an existing store. A store
 *   newer than this code is refused, never downgraded.
 *
 * Not provided: encryption at rest (files are owner-only where the OS supports
 * it), network or shared-filesystem safety.
 *
 * `node:sqlite` is still marked experimental in Node 22/24; everything that
 * touches it is in this file so a different binding is a local change.
 */
import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  MAX_EVENT_PAYLOAD_BYTES,
  OperationEventInputSchema,
  type OperationEvent,
  type OperationEventInput,
  type OperationEventSource
} from '@reboundops/contracts';

export class OperationsStoreLockedError extends Error {
  constructor() {
    super('The operations store is already open in another ReboundOps process.');
    this.name = 'OperationsStoreLockedError';
  }
}

export class OperationsStoreVersionError extends Error {
  constructor(readonly found: number, readonly supported: number) {
    super(`The operations store was written by a newer ReboundOps (schema ${found}; this version supports ${supported}). It was not changed.`);
    this.name = 'OperationsStoreVersionError';
  }
}

export class RevisionConflictError extends Error {
  constructor(readonly expected: number, readonly current: number) {
    super(`Expected revision ${expected}, but the record is at revision ${current}.`);
    this.name = 'RevisionConflictError';
  }
}

export class IdempotencyConflictError extends Error {
  constructor(readonly eventId: string) {
    super('This event id was already used for a different change.');
    this.name = 'IdempotencyConflictError';
  }
}

export class EventPayloadTooLargeError extends Error {
  constructor() {
    super(`Event payload exceeds ${MAX_EVENT_PAYLOAD_BYTES} bytes.`);
    this.name = 'EventPayloadTooLargeError';
  }
}

export interface Migration {
  readonly version: number;
  readonly sql: string;
}

/** Forward-only. Append; never edit a released migration. */
export const OPERATIONS_MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE operation_entities (
        entity_type TEXT NOT NULL,
        entity_id   TEXT NOT NULL,
        revision    INTEGER NOT NULL CHECK (revision >= 1),
        PRIMARY KEY (entity_type, entity_id)
      ) STRICT;
      CREATE TABLE operation_events (
        id          TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id   TEXT NOT NULL,
        revision    INTEGER NOT NULL CHECK (revision >= 1),
        type        TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        ingested_at TEXT NOT NULL,
        source      TEXT NOT NULL,
        payload     TEXT NOT NULL,
        UNIQUE (entity_type, entity_id, revision),
        FOREIGN KEY (entity_type, entity_id) REFERENCES operation_entities (entity_type, entity_id)
      ) STRICT;
      CREATE INDEX operation_events_by_type ON operation_events (type, occurred_at);
    `
  }
];

export interface OpenOptions {
  /** Test seam: the migration list to apply. Defaults to OPERATIONS_MIGRATIONS. */
  readonly migrations?: readonly Migration[];
  /** Clock seam for ingestion time. */
  readonly now?: () => Date;
}

export interface AppendResult {
  readonly status: 'appended' | 'duplicate';
  readonly event: OperationEvent;
}

type EventRow = {
  id: string; entity_type: string; entity_id: string; revision: number; type: string;
  occurred_at: string; ingested_at: string; source: string; payload: string;
};

/** JSON with object keys sorted, so a retried request compares equal however it was built. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v
  );
}

type Prepared = { input: OperationEventInput; payload: string };

/** Validate and serialize before any transaction opens. */
function prepare(raw: OperationEventInput): Prepared {
  const input = OperationEventInputSchema.parse(raw);
  const payload = canonical(input.payload);
  if (Buffer.byteLength(payload, 'utf8') > MAX_EVENT_PAYLOAD_BYTES) throw new EventPayloadTooLargeError();
  return { input, payload };
}

function toEvent(row: EventRow): OperationEvent {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    revision: row.revision,
    type: row.type,
    occurredAt: row.occurred_at,
    ingestedAt: row.ingested_at,
    source: row.source as OperationEventSource,
    payload: JSON.parse(row.payload) as Record<string, unknown>
  };
}

function isBusy(error: unknown): boolean {
  const e = error as { code?: string; errcode?: number; message?: string };
  return e?.errcode === 5 || e?.errcode === 6 || /database is locked|SQLITE_BUSY|SQLITE_LOCKED/i.test(String(e?.message ?? ''));
}

export class OperationsStore {
  private constructor(private readonly db: DatabaseSync, private readonly now: () => Date) {}

  /** The file the store lives in, relative to the data directory. */
  static readonly RELATIVE_PATH = join('operations', 'operations.sqlite');

  static open(dataDir: string, options: OpenOptions = {}): OperationsStore {
    const migrations = options.migrations ?? OPERATIONS_MIGRATIONS;
    const dir = join(dataDir, 'operations');
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = join(dir, 'operations.sqlite');
    const isNew = !existsSync(file);

    const db = new DatabaseSync(file);
    try {
      // EXCLUSIVE before WAL: the lock taken by the first write is then kept for
      // the life of the connection, which is the single-owner lease.
      db.exec('PRAGMA busy_timeout = 2000; PRAGMA locking_mode = EXCLUSIVE; PRAGMA foreign_keys = ON;');
      try {
        db.exec('PRAGMA journal_mode = WAL; BEGIN IMMEDIATE; COMMIT;');
      } catch (error) {
        if (isBusy(error)) throw new OperationsStoreLockedError();
        throw error;
      }
      if (process.platform !== 'win32') {
        for (const f of [file, `${file}-wal`]) if (existsSync(f)) chmodSync(f, 0o600);
      }
      migrate(db, file, migrations, isNew);
      return new OperationsStore(db, options.now ?? (() => new Date()));
    } catch (error) {
      try { db.close(); } catch { /* already failing */ }
      throw error;
    }
  }

  get schemaVersion(): number {
    return (this.db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  }

  revisionOf(entityType: string, entityId: string): number {
    const row = this.db.prepare('SELECT revision FROM operation_entities WHERE entity_type = ? AND entity_id = ?').get(entityType, entityId) as { revision: number } | undefined;
    return row?.revision ?? 0;
  }

  /** Append one event. Idempotent by event id; optimistic by expected revision. */
  appendEvent(raw: OperationEventInput): AppendResult {
    const prepared = prepare(raw);
    return this.transaction(() => this.appendPrepared(prepared));
  }

  /**
   * Append several events atomically: all of them, or (on any conflict or
   * error) none. Used by imports, where a half-written batch would be worse
   * than a refused one.
   */
  appendEvents(raws: readonly OperationEventInput[]): AppendResult[] {
    const prepared = raws.map(prepare);
    return this.transaction(() => prepared.map((p) => this.appendPrepared(p)));
  }

  private appendPrepared({ input, payload }: Prepared): AppendResult {
    {
      const existing = this.db.prepare('SELECT * FROM operation_events WHERE id = ?').get(input.id) as EventRow | undefined;
      if (existing) {
        const same =
          existing.entity_type === input.entityType && existing.entity_id === input.entityId &&
          existing.type === input.type && existing.occurred_at === input.occurredAt &&
          existing.source === input.source && existing.payload === payload &&
          existing.revision === input.expectedRevision + 1;
        if (!same) throw new IdempotencyConflictError(input.id);
        return { status: 'duplicate', event: toEvent(existing) } as const;
      }

      const current = this.revisionOf(input.entityType, input.entityId);
      if (current !== input.expectedRevision) throw new RevisionConflictError(input.expectedRevision, current);

      const revision = current + 1;
      const ingestedAt = this.now().toISOString();
      if (current === 0) {
        this.db.prepare('INSERT INTO operation_entities (entity_type, entity_id, revision) VALUES (?, ?, ?)').run(input.entityType, input.entityId, revision);
      } else {
        this.db.prepare('UPDATE operation_entities SET revision = ? WHERE entity_type = ? AND entity_id = ?').run(revision, input.entityType, input.entityId);
      }
      this.db.prepare(
        'INSERT INTO operation_events (id, entity_type, entity_id, revision, type, occurred_at, ingested_at, source, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(input.id, input.entityType, input.entityId, revision, input.type, input.occurredAt, ingestedAt, input.source, payload);
      return {
        status: 'appended',
        event: { id: input.id, entityType: input.entityType, entityId: input.entityId, revision, type: input.type, occurredAt: input.occurredAt, ingestedAt, source: input.source, payload: JSON.parse(payload) }
      } as const;
    }
  }

  listEvents(entityType: string, entityId: string): OperationEvent[] {
    const rows = this.db.prepare('SELECT * FROM operation_events WHERE entity_type = ? AND entity_id = ? ORDER BY revision').all(entityType, entityId) as EventRow[];
    return rows.map(toEvent);
  }

  close(): void {
    this.db.close();
  }

  /** Run `fn` in one IMMEDIATE transaction; any throw rolls everything back. */
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}

function migrate(db: DatabaseSync, file: string, migrations: readonly Migration[], isNew: boolean): void {
  const latest = migrations.reduce((max, m) => Math.max(max, m.version), 0);
  const current = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  if (current > latest) throw new OperationsStoreVersionError(current, latest);
  const pending = migrations.filter((m) => m.version > current).sort((a, b) => a.version - b.version);
  if (pending.length === 0) return;

  // An existing store is copied before its schema changes, so a failed or
  // regretted upgrade can be restored by hand (docs/adr-0004-operations-store.md).
  if (!isNew && current > 0) {
    const backup = `${file}.pre-v${latest}-${Date.now()}.bak`;
    db.prepare('VACUUM INTO ?').run(backup);
    if (process.platform !== 'win32') chmodSync(backup, 0o600);
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const m of pending) {
      db.exec(m.sql);
      db.exec(`PRAGMA user_version = ${Number(m.version)}`);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

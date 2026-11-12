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
 * - Redaction (FND-06): a record's payloads can be replaced with `{}`. Deleted
 *   content is overwritten (`secure_delete`), and the WAL is checkpointed and
 *   truncated, so the store file no longer holds it. Backups taken earlier
 *   still do; the caller says so.
 *
 * Not provided: encryption at rest (files are owner-only where the OS supports
 * it), network or shared-filesystem safety.
 *
 * `node:sqlite` is still marked experimental in Node 22/24; everything that
 * touches it is in this file so a different binding is a local change.
 */
import { chmodSync, closeSync, copyFileSync, existsSync, mkdirSync, openSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { OPERATIONS_STORE_RELATIVE_PATH } from './paths.js';
import {
  MAX_EVENT_PAYLOAD_BYTES,
  OperationEventInputSchema,
  REDACTION_EVENT_TYPE,
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

/** A backup that cannot be restored into this store; nothing was changed. */
export class BackupInvalidError extends Error {
  constructor(readonly reason: 'integrity' | 'schema_version' | 'tables', detail: string) {
    super(`This backup cannot be restored: ${detail}. Nothing was changed.`);
    this.name = 'BackupInvalidError';
  }
}

export class EventPayloadTooLargeError extends Error {
  constructor() {
    super(`Event payload exceeds ${MAX_EVENT_PAYLOAD_BYTES} bytes.`);
    this.name = 'EventPayloadTooLargeError';
  }
}

/** No such record; there is nothing to redact. */
export class RecordNotFoundError extends Error {
  constructor() {
    super('No such record.');
    this.name = 'RecordNotFoundError';
  }
}

/** An event type only the store itself may write. */
export class ReservedEventTypeError extends Error {
  constructor(readonly type: string) {
    super(`Event type ${type} is written only by the store.`);
    this.name = 'ReservedEventTypeError';
  }
}

export interface Migration {
  readonly version: number;
  readonly sql: string;
}

/** Tables a restore replaces, parents first. A new table must be added here. */
const RESTORE_ORDER = ['operation_entities', 'operation_events'] as const;

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
  },
  {
    // FND-06: when an event's payload was redacted. NULL for every other event.
    version: 2,
    sql: 'ALTER TABLE operation_events ADD COLUMN redacted_at TEXT;'
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

export interface RedactionResult extends AppendResult {
  /** Events whose payload this call replaced with `{}` (0 for a retry). */
  readonly redactedEvents: number;
  /** True when the WAL was checkpointed and truncated after the redaction. */
  readonly walTruncated: boolean;
}

type EventRow = {
  id: string; entity_type: string; entity_id: string; revision: number; type: string;
  occurred_at: string; ingested_at: string; source: string; payload: string;
  redacted_at: string | null;
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
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    ...(row.redacted_at ? { redactedAt: row.redacted_at } : {})
  };
}

function rejectReserved(prepared: readonly Prepared[]): void {
  const reserved = prepared.find((p) => p.input.type === REDACTION_EVENT_TYPE);
  if (reserved) throw new ReservedEventTypeError(reserved.input.type);
}

function lockedOrThrow<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (isBusy(error)) throw new OperationsStoreLockedError();
    throw error;
  }
}

function isBusy(error: unknown): boolean {
  const e = error as { code?: string; errcode?: number; message?: string };
  return e?.errcode === 5 || e?.errcode === 6 || /database is locked|SQLITE_BUSY|SQLITE_LOCKED/i.test(String(e?.message ?? ''));
}

export class OperationsStore {
  private constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => Date,
    private readonly migrations: readonly Migration[]
  ) {}

  /** The file the store lives in, relative to the data directory. */
  static readonly RELATIVE_PATH = OPERATIONS_STORE_RELATIVE_PATH;

  static open(dataDir: string, options: OpenOptions = {}): OperationsStore {
    const migrations = options.migrations ?? OPERATIONS_MIGRATIONS;
    const dir = join(dataDir, 'operations');
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    // mkdirSync leaves an existing directory's mode alone; tighten it.
    if (process.platform !== 'win32') chmodSync(dir, 0o700);
    const file = join(dataDir, OPERATIONS_STORE_RELATIVE_PATH);
    const isNew = !existsSync(file);

    const db = new DatabaseSync(file);
    try {
      // EXCLUSIVE before WAL: the lock taken by the first write is then kept for
      // the life of the connection, which is the single-owner lease.
      // secure_delete overwrites deleted or replaced content with zeros, so a
      // redacted payload does not linger in free space inside the file.
      db.exec('PRAGMA busy_timeout = 2000; PRAGMA locking_mode = EXCLUSIVE; PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;');
      // Refuse a newer store before anything persistent changes: WAL mode is
      // itself a persistent change to the file.
      const supported = migrations.reduce((max, m) => Math.max(max, m.version), 0);
      const found = lockedOrThrow(() => (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);
      if (found > supported) throw new OperationsStoreVersionError(found, supported);
      lockedOrThrow(() => db.exec('PRAGMA journal_mode = WAL; BEGIN IMMEDIATE; COMMIT;'));
      if (process.platform !== 'win32') {
        for (const f of [file, `${file}-wal`]) if (existsSync(f)) chmodSync(f, 0o600);
      }
      migrate(db, file, migrations, isNew);
      return new OperationsStore(db, options.now ?? (() => new Date()), migrations);
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
    rejectReserved([prepared]);
    return this.transaction(() => this.appendPrepared(prepared));
  }

  /**
   * Append several events atomically: all of them, or (on any conflict or
   * error) none. Used by imports, where a half-written batch would be worse
   * than a refused one.
   */
  appendEvents(raws: readonly OperationEventInput[]): AppendResult[] {
    const prepared = raws.map(prepare);
    rejectReserved(prepared);
    return this.transaction(() => prepared.map((p) => this.appendPrepared(p)));
  }

  /**
   * Redact a record (FND-06): every earlier event keeps its id, type, times
   * and revision, but its payload becomes `{}`; then one `record.redacted`
   * event is appended, holding only the count. Idempotent by `id`; optimistic
   * by `expectedRevision`. Afterwards the WAL is checkpointed and truncated so
   * the old pages leave it too. Backups taken earlier still hold the payloads.
   */
  redactRecord(entityType: string, entityId: string, request: { id: string; expectedRevision: number }): RedactionResult {
    const shape = OperationEventInputSchema.shape;
    shape.entityType.parse(entityType);
    shape.entityId.parse(entityId);
    shape.id.parse(request.id);
    shape.expectedRevision.parse(request.expectedRevision);

    const result = this.transaction(() => {
      const existing = this.db.prepare('SELECT * FROM operation_events WHERE id = ?').get(request.id) as EventRow | undefined;
      if (existing) {
        const same = existing.type === REDACTION_EVENT_TYPE && existing.entity_type === entityType &&
          existing.entity_id === entityId && existing.revision === request.expectedRevision + 1;
        if (!same) throw new IdempotencyConflictError(request.id);
        return { status: 'duplicate' as const, event: toEvent(existing), redactedEvents: 0 };
      }
      const current = this.revisionOf(entityType, entityId);
      if (current === 0) throw new RecordNotFoundError();
      if (current !== request.expectedRevision) throw new RevisionConflictError(request.expectedRevision, current);

      const at = this.now().toISOString();
      const redactedEvents = Number(this.db.prepare(
        "UPDATE operation_events SET payload = '{}', redacted_at = ? WHERE entity_type = ? AND entity_id = ? AND redacted_at IS NULL AND type != ?"
      ).run(at, entityType, entityId, REDACTION_EVENT_TYPE).changes);
      const payload = { redactedEvents };
      const appended = this.appendPrepared({
        input: { id: request.id, entityType, entityId, expectedRevision: current, type: REDACTION_EVENT_TYPE, occurredAt: at, source: 'user', payload },
        payload: canonical(payload)
      });
      return { ...appended, redactedEvents };
    });
    return { ...result, walTruncated: this.truncateWal() };
  }

  /**
   * Copy every committed page into the store file and truncate the WAL, so old
   * page versions (which can hold redacted content) leave it. Truncation frees
   * the WAL's disk blocks; it does not overwrite them.
   */
  private truncateWal(): boolean {
    const row = this.db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get() as { busy: number } | undefined;
    return row?.busy === 0;
  }

  private appendPrepared({ input, payload }: Prepared): AppendResult {
    {
      const existing = this.db.prepare('SELECT * FROM operation_events WHERE id = ?').get(input.id) as EventRow | undefined;
      if (existing) {
        // A redacted event's payload is gone, so a retry of it is matched on
        // everything else; the stored (redacted) event is returned either way.
        const same =
          existing.entity_type === input.entityType && existing.entity_id === input.entityId &&
          existing.type === input.type && existing.occurred_at === input.occurredAt &&
          existing.source === input.source && (existing.redacted_at !== null || existing.payload === payload) &&
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

  /** Entity and event counts, for backup manifests. */
  counts(): { entities: number; events: number } {
    const n = (table: string) => (this.db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
    return { entities: n('operation_entities'), events: n('operation_events') };
  }

  /**
   * Write a consistent copy of the whole store to `target`, which must not
   * exist. The file is created owner-only before SQLite writes to it.
   */
  backupTo(target: string): void {
    closeSync(openSync(target, 'wx', 0o600));
    try {
      this.db.prepare('VACUUM INTO ?').run(target);
    } catch (error) {
      try { rmSync(target, { force: true }); } catch { /* best effort */ }
      throw error;
    }
    if (process.platform !== 'win32') chmodSync(target, 0o600);
  }

  /**
   * Replace every record with the contents of the backup at `source`, in one
   * transaction on this (locked) connection: all records, or none. The backup
   * must pass SQLite's integrity check and have this store's schema version,
   * tables and columns. The caller verifies the file's hash and path first.
   */
  restoreFrom(source: string): { entities: number; events: number } {
    return this.atCurrentSchema(source, (file) => {
      const expected = this.checkCurrentBackup(file);
      this.db.prepare('ATTACH DATABASE ? AS restore_source').run(file);
      try {
        const restored = this.transaction(() => {
          // Children before parents on delete, parents before children on insert.
          for (const table of [...RESTORE_ORDER].reverse()) this.db.exec(`DELETE FROM main.${table}`);
          for (const table of RESTORE_ORDER) {
            const columns = expected[table]!.join(', ');
            this.db.exec(`INSERT INTO main.${table} (${columns}) SELECT ${columns} FROM restore_source.${table}`);
          }
          return this.counts();
        });
        // The replaced records' old pages leave the WAL too.
        this.truncateWal();
        return restored;
      } finally {
        this.db.exec('DETACH DATABASE restore_source');
      }
    });
  }

  /**
   * Check, without changing anything, that the backup at `source` can be
   * restored here: SQLite integrity, a schema version this store has or can
   * upgrade from, and (after any upgrade) the same tables and columns.
   * Returns this store's layout. Throws BackupInvalidError.
   */
  checkBackup(source: string): Record<string, string[]> {
    return this.atCurrentSchema(source, (file) => this.checkCurrentBackup(file));
  }

  /**
   * Run `fn` with a file holding the backup at this store's schema version:
   * the backup itself, or, for a backup from an older schema, an owner-only
   * copy upgraded with this store's migrations and deleted afterwards. The
   * backup file is never changed.
   */
  private atCurrentSchema<T>(source: string, fn: (file: string) => T): T {
    const version = this.readBackupVersion(source);
    if (version === this.schemaVersion) return fn(source);
    if (version < 1 || version > this.schemaVersion) {
      throw new BackupInvalidError('schema_version', `it has schema ${version}, and this store has schema ${this.schemaVersion}`);
    }
    const copy = `${source}.upgrade-${process.pid}-${Date.now()}.tmp`;
    const leftovers = [copy, `${copy}-journal`, `${copy}-wal`, `${copy}-shm`];
    try {
      closeSync(openSync(copy, 'wx', 0o600));
      copyFileSync(source, copy);
      if (process.platform !== 'win32') chmodSync(copy, 0o600);
      const db = new DatabaseSync(copy);
      try {
        db.exec('PRAGMA journal_mode = DELETE;');
        applyMigrations(db, this.migrations.filter((m) => m.version > version && m.version <= this.schemaVersion));
      } catch {
        throw new BackupInvalidError('schema_version', `it has schema ${version} and could not be upgraded to schema ${this.schemaVersion}`);
      } finally {
        db.close();
      }
      return fn(copy);
    } finally {
      for (const f of leftovers) rmSync(f, { force: true });
    }
  }

  /** The backup's schema version, after SQLite's integrity check passes. */
  private readBackupVersion(source: string): number {
    let backup: DatabaseSync;
    try {
      backup = new DatabaseSync(source, { readOnly: true });
    } catch {
      throw new BackupInvalidError('integrity', 'it is not a readable SQLite database');
    }
    try {
      const check = (backup.prepare('PRAGMA integrity_check').get() as { integrity_check: string }).integrity_check;
      if (check !== 'ok') throw new BackupInvalidError('integrity', 'it fails SQLite\'s integrity check');
      return (backup.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
    } catch (error) {
      if (error instanceof BackupInvalidError) throw error;
      throw new BackupInvalidError('integrity', 'it is not a readable SQLite database');
    } finally {
      backup.close();
    }
  }

  /** checkBackup for a file already at this store's schema version. */
  private checkCurrentBackup(source: string): Record<string, string[]> {
    const expected = this.layout(this.db, 'main');
    // A table outside RESTORE_ORDER would be silently left as it was.
    if (Object.keys(expected).sort().join() !== [...RESTORE_ORDER].sort().join()) {
      throw new Error(`RESTORE_ORDER does not list every store table: ${Object.keys(expected).join(', ')}`);
    }
    let backup: DatabaseSync;
    try {
      backup = new DatabaseSync(source, { readOnly: true });
    } catch {
      throw new BackupInvalidError('integrity', 'it is not a readable SQLite database');
    }
    try {
      const check = (backup.prepare('PRAGMA integrity_check').get() as { integrity_check: string }).integrity_check;
      if (check !== 'ok') throw new BackupInvalidError('integrity', 'it fails SQLite\'s integrity check');
      const version = (backup.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
      if (version !== this.schemaVersion) {
        throw new BackupInvalidError('schema_version', `it has schema ${version}, and this store has schema ${this.schemaVersion}`);
      }
      if (JSON.stringify(this.layout(backup, 'main')) !== JSON.stringify(expected)) {
        throw new BackupInvalidError('tables', 'its tables or columns differ from this store');
      }
    } catch (error) {
      if (error instanceof BackupInvalidError) throw error;
      throw new BackupInvalidError('integrity', 'it is not a readable SQLite database');
    } finally {
      backup.close();
    }
    return expected;
  }

  /** Table name → column names, for every user table in `schema`. */
  private layout(db: DatabaseSync, schema: string): Record<string, string[]> {
    const tables = db.prepare(`SELECT name FROM ${schema}.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all() as { name: string }[];
    return Object.fromEntries(tables.map(({ name }) => [
      name,
      (db.prepare(`SELECT name FROM ${schema}.pragma_table_info(?) ORDER BY cid`).all(name) as { name: string }[]).map((c) => c.name)
    ]));
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
    // Create the target owner-only and empty first (VACUUM INTO accepts an
    // empty file), so the copy is never readable by others, even briefly.
    closeSync(openSync(backup, 'wx', 0o600));
    db.prepare('VACUUM INTO ?').run(backup);
    if (process.platform !== 'win32') chmodSync(backup, 0o600);
  }

  applyMigrations(db, pending);
}

/** Apply `pending` (ascending) in one transaction; any failure rolls back. */
function applyMigrations(db: DatabaseSync, pending: readonly Migration[]): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const m of [...pending].sort((a, b) => a.version - b.version)) {
      db.exec(m.sql);
      db.exec(`PRAGMA user_version = ${Number(m.version)}`);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

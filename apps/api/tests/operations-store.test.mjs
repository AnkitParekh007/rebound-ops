// The operations store (R0 FND-01/FND-02): single owner, crash-safe
// transactions, idempotent events, optimistic revisions and backed-up,
// forward-only migrations. Fictional data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  OperationsStore, OPERATIONS_MIGRATIONS, OperationsStoreLockedError, OperationsStoreVersionError,
  RevisionConflictError, IdempotencyConflictError, EventPayloadTooLargeError
} from '../../../dist/api/operations/store.js';

const ids = [
  '0b7e4c9a-1f2d-4a6b-8c3e-5d7f9a1b2c3d',
  '1c8f5dab-2a3e-4b7c-9d4f-6e8a0b2c3d4e',
  '2d9a6ebc-3b4f-4c8d-ae5a-7f9b1c3d4e5f',
  '3eab7fcd-4c5a-4d9e-bf6b-8a0c2d4e5f6a'
];
const event = (over = {}) => ({
  id: ids[0], entityType: 'application', entityId: 'app-fictional-1', expectedRevision: 0,
  type: 'application.created', occurredAt: '2026-11-01T09:00:00.000Z', source: 'user',
  payload: { company: 'Fictional Startup Studio', role: 'Backend Engineer' }, ...over
});

function withDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'reboundops-ops-store-'));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}
const clock = () => new Date('2026-11-12T10:00:00.000Z');

test('a new store is created at schema 1 with owner-only files', () => withDir((dir) => {
  const store = OperationsStore.open(dir);
  try {
    assert.equal(store.schemaVersion, OPERATIONS_MIGRATIONS.at(-1).version);
    const file = join(dir, OperationsStore.RELATIVE_PATH);
    assert.ok(existsSync(file));
    if (process.platform !== 'win32') assert.equal(statSync(file).mode & 0o777, 0o600);
  } finally { store.close(); }
}));

test('events append with increasing revisions; event and ingestion time stay apart', () => withDir((dir) => {
  const store = OperationsStore.open(dir, { now: clock });
  try {
    const first = store.appendEvent(event());
    assert.equal(first.status, 'appended');
    assert.equal(first.event.revision, 1);
    assert.equal(first.event.occurredAt, '2026-11-01T09:00:00.000Z');
    assert.equal(first.event.ingestedAt, '2026-11-12T10:00:00.000Z');
    store.appendEvent(event({ id: ids[1], expectedRevision: 1, type: 'application.submitted', payload: { channel: 'direct' } }));
    assert.equal(store.revisionOf('application', 'app-fictional-1'), 2);
    assert.deepEqual(store.listEvents('application', 'app-fictional-1').map((e) => e.type), ['application.created', 'application.submitted']);
  } finally { store.close(); }
}));

test('a stale expected revision is a conflict and changes nothing', () => withDir((dir) => {
  const store = OperationsStore.open(dir);
  try {
    store.appendEvent(event());
    assert.throws(() => store.appendEvent(event({ id: ids[1], expectedRevision: 0 })), (e) => e instanceof RevisionConflictError && e.current === 1 && e.expected === 0);
    assert.equal(store.revisionOf('application', 'app-fictional-1'), 1);
    assert.equal(store.listEvents('application', 'app-fictional-1').length, 1);
  } finally { store.close(); }
}));

test('a retried event is idempotent, whatever its payload key order', () => withDir((dir) => {
  const store = OperationsStore.open(dir);
  try {
    store.appendEvent(event());
    const retry = store.appendEvent(event({ payload: { role: 'Backend Engineer', company: 'Fictional Startup Studio' } }));
    assert.equal(retry.status, 'duplicate');
    assert.equal(retry.event.revision, 1);
    assert.equal(store.listEvents('application', 'app-fictional-1').length, 1);
  } finally { store.close(); }
}));

test('reusing an event id for a different change is refused', () => withDir((dir) => {
  const store = OperationsStore.open(dir);
  try {
    store.appendEvent(event());
    assert.throws(() => store.appendEvent(event({ payload: { company: 'Someone Else' } })), IdempotencyConflictError);
  } finally { store.close(); }
}));

test('a batch is all or nothing', () => withDir((dir) => {
  const store = OperationsStore.open(dir);
  try {
    assert.throws(() => store.appendEvents([
      event(),
      event({ id: ids[1], entityId: 'app-fictional-2' }),
      event({ id: ids[2], expectedRevision: 5 })
    ]), RevisionConflictError);
    assert.equal(store.revisionOf('application', 'app-fictional-1'), 0, 'first event rolled back');
    assert.equal(store.revisionOf('application', 'app-fictional-2'), 0, 'second event rolled back');
    const ok = store.appendEvents([event(), event({ id: ids[1], entityId: 'app-fictional-2' })]);
    assert.deepEqual(ok.map((r) => r.status), ['appended', 'appended']);
  } finally { store.close(); }
}));

test('invalid and oversized events are refused before any write', () => withDir((dir) => {
  const store = OperationsStore.open(dir);
  try {
    assert.throws(() => store.appendEvent(event({ id: 'not-a-uuid' })));
    assert.throws(() => store.appendEvent(event({ entityType: 'Application' })));
    assert.throws(() => store.appendEvent(event({ occurredAt: 'yesterday' })));
    assert.throws(() => store.appendEvent(event({ payload: { blob: 'x'.repeat(70 * 1024) } })), EventPayloadTooLargeError);
    assert.equal(store.revisionOf('application', 'app-fictional-1'), 0);
  } finally { store.close(); }
}));

test('only one owner: a second open is locked out until the first closes', () => withDir((dir) => {
  const first = OperationsStore.open(dir);
  try {
    assert.throws(() => OperationsStore.open(dir), OperationsStoreLockedError);
  } finally { first.close(); }
  const again = OperationsStore.open(dir);
  again.close();
}));

test('events survive a restart', () => withDir((dir) => {
  let store = OperationsStore.open(dir);
  store.appendEvent(event());
  store.close();
  store = OperationsStore.open(dir);
  try {
    assert.equal(store.revisionOf('application', 'app-fictional-1'), 1);
    assert.equal(store.listEvents('application', 'app-fictional-1')[0].payload.company, 'Fictional Startup Studio');
  } finally { store.close(); }
}));

const V2 = [...OPERATIONS_MIGRATIONS, { version: 2, sql: 'ALTER TABLE operation_events ADD COLUMN note TEXT;' }];

test('a migration backs up the existing store first, and the backup restores', () => withDir((dir) => {
  let store = OperationsStore.open(dir);
  store.appendEvent(event());
  store.close();

  store = OperationsStore.open(dir, { migrations: V2 });
  try { assert.equal(store.schemaVersion, 2); } finally { store.close(); }

  const opsDir = join(dir, 'operations');
  const backups = readdirSync(opsDir).filter((f) => /^operations\.sqlite\.pre-v2-\d+\.bak$/.test(f));
  assert.equal(backups.length, 1);
  if (process.platform !== 'win32') assert.equal(statSync(join(opsDir, backups[0])).mode & 0o777, 0o600);
  const backup = new DatabaseSync(join(opsDir, backups[0]), { readOnly: true });
  try {
    assert.equal(backup.prepare('PRAGMA user_version').get().user_version, 1);
    assert.equal(backup.prepare('SELECT count(*) AS n FROM operation_events').get().n, 1);
  } finally { backup.close(); }
}));

test('a failed migration rolls back and leaves the schema version unchanged', () => withDir((dir) => {
  OperationsStore.open(dir).close();
  const broken = [...OPERATIONS_MIGRATIONS, { version: 2, sql: 'CREATE TABLE half_done (x INTEGER); THIS IS NOT SQL;' }];
  assert.throws(() => OperationsStore.open(dir, { migrations: broken }));
  const store = OperationsStore.open(dir);
  try { assert.equal(store.schemaVersion, 1); } finally { store.close(); }
}));

test('a store from a newer ReboundOps is refused, not downgraded', () => withDir((dir) => {
  OperationsStore.open(dir, { migrations: V2 }).close();
  assert.throws(() => OperationsStore.open(dir), (e) => e instanceof OperationsStoreVersionError && e.found === 2 && e.supported === 1);
  const store = OperationsStore.open(dir, { migrations: V2 });
  try { assert.equal(store.schemaVersion, 2); } finally { store.close(); }
}));

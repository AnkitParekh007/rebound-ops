// Operations store deletion and retention (R0 FND-06): redacting a record's
// payloads, purging the old content from the store file and its WAL, saying
// which backups still hold it, and restoring backups from an older schema.
// Fictional data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveFeatureFlags } from '@reboundops/contracts';
import { buildApp } from '../../../dist/api/app.js';
import { createBackup } from '../../../dist/api/operations/backups.js';
import {
  OperationsStore, OPERATIONS_MIGRATIONS, IdempotencyConflictError, RevisionConflictError,
  RecordNotFoundError, ReservedEventTypeError
} from '../../../dist/api/operations/store.js';

const on = resolveFeatureFlags({ REBOUNDOPS_FEATURES: 'autofill' });
const ids = [
  'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
  'd4e5f6a7-b8c9-4d0e-9f2a-3b4c5d6e7f80'
];
// Distinctive markers, so a byte scan cannot match anything else in the file.
const SMALL = 'FICTIONAL-SECRET-ALPHA-7Q2';
const LARGE = `FICTIONAL-SECRET-BRAVO-${'x'.repeat(20_000)}`; // spills onto overflow pages
const event = (over = {}) => ({
  id: ids[0], entityType: 'application', entityId: 'app-fictional-1', expectedRevision: 0,
  type: 'application.created', occurredAt: '2026-11-01T09:00:00.000Z', source: 'user',
  payload: { company: 'Fictional Startup Studio', note: SMALL }, ...over
});
const clock = () => new Date('2026-11-12T10:00:00.000Z');

function withDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'reboundops-redact-'));
  const done = () => rmSync(dir, { recursive: true, force: true });
  let result;
  try { result = fn(dir); } catch (e) { done(); throw e; }
  return result instanceof Promise ? result.finally(done) : (done(), result);
}
const storeFile = (dir) => join(dir, OperationsStore.RELATIVE_PATH);
/** Every byte the store keeps on disk: the database file and any WAL. */
const storeBytes = (dir) => Buffer.concat([storeFile(dir), `${storeFile(dir)}-wal`]
  .filter((f) => existsSync(f)).map((f) => readFileSync(f)));
const holds = (bytes, marker) => bytes.includes(Buffer.from(marker.slice(0, 40)));

test('redaction empties every earlier payload, keeps the history, and appends one record.redacted event', () => withDir((dir) => {
  const store = OperationsStore.open(dir, { now: clock });
  try {
    store.appendEvent(event());
    store.appendEvent(event({ id: ids[1], expectedRevision: 1, type: 'application.noted', payload: { note: LARGE } }));
    const r = store.redactRecord('application', 'app-fictional-1', { id: ids[2], expectedRevision: 2 });
    assert.equal(r.status, 'appended');
    assert.equal(r.redactedEvents, 2);
    assert.equal(r.walTruncated, true);
    assert.deepEqual([r.event.type, r.event.revision, r.event.payload], ['record.redacted', 3, { redactedEvents: 2 }]);

    const events = store.listEvents('application', 'app-fictional-1');
    assert.deepEqual(events.map((e) => [e.id, e.type, e.revision, e.occurredAt]), [
      [ids[0], 'application.created', 1, '2026-11-01T09:00:00.000Z'],
      [ids[1], 'application.noted', 2, '2026-11-01T09:00:00.000Z'],
      [ids[2], 'record.redacted', 3, '2026-11-12T10:00:00.000Z']
    ]);
    assert.deepEqual(events.slice(0, 2).map((e) => [e.payload, e.redactedAt]), [[{}, '2026-11-12T10:00:00.000Z'], [{}, '2026-11-12T10:00:00.000Z']]);
    assert.equal('redactedAt' in events[2], false, 'the redaction event itself holds no content and is not redacted');
    assert.equal(store.revisionOf('application', 'app-fictional-1'), 3);
  } finally { store.close(); }
}));

test('after redaction the store file and its WAL no longer hold the content, small or on overflow pages', () => withDir((dir) => {
  const store = OperationsStore.open(dir);
  try {
    store.appendEvent(event());
    store.appendEvent(event({ id: ids[1], expectedRevision: 1, type: 'application.noted', payload: { note: LARGE } }));
    // Another record's content must survive untouched.
    store.appendEvent(event({ id: ids[3], entityId: 'app-fictional-2', payload: { company: 'Example Labs' } }));
    const before = storeBytes(dir);
    assert.ok(holds(before, SMALL) && holds(before, LARGE), 'the scan finds the content before redaction');

    store.redactRecord('application', 'app-fictional-1', { id: ids[2], expectedRevision: 2 });
    const after = storeBytes(dir);
    assert.equal(holds(after, SMALL), false, 'small payload is gone from the file and WAL');
    assert.equal(holds(after, LARGE), false, 'overflow payload is gone from the file and WAL');
    assert.equal(store.listEvents('application', 'app-fictional-2')[0].payload.company, 'Example Labs');
  } finally { store.close(); }
  const closed = storeBytes(dir);
  assert.equal(holds(closed, SMALL) || holds(closed, LARGE), false, 'still gone after close');
}));

test('a retried redaction is a duplicate; a stale, unknown or reused request changes nothing', () => withDir((dir) => {
  const store = OperationsStore.open(dir);
  try {
    assert.throws(() => store.redactRecord('application', 'app-fictional-1', { id: ids[2], expectedRevision: 1 }), RecordNotFoundError);
    store.appendEvent(event());
    assert.throws(() => store.redactRecord('application', 'app-fictional-1', { id: ids[2], expectedRevision: 2 }),
      (e) => e instanceof RevisionConflictError && e.current === 1);
    assert.throws(() => store.redactRecord('application', 'app-fictional-1', { id: ids[0], expectedRevision: 1 }), IdempotencyConflictError);
    assert.deepEqual(store.listEvents('application', 'app-fictional-1')[0].payload.note, SMALL, 'refusals changed nothing');

    const first = store.redactRecord('application', 'app-fictional-1', { id: ids[2], expectedRevision: 1 });
    const retry = store.redactRecord('application', 'app-fictional-1', { id: ids[2], expectedRevision: 1 });
    assert.equal(retry.status, 'duplicate');
    assert.equal(retry.redactedEvents, 0);
    assert.deepEqual(retry.event, first.event);
    assert.equal(store.revisionOf('application', 'app-fictional-1'), 2);
  } finally { store.close(); }
}));

test('a retried original event stays redacted; only the store may write record.redacted', () => withDir((dir) => {
  const store = OperationsStore.open(dir);
  try {
    store.appendEvent(event());
    store.redactRecord('application', 'app-fictional-1', { id: ids[2], expectedRevision: 1 });
    const retry = store.appendEvent(event());
    assert.equal(retry.status, 'duplicate');
    assert.deepEqual(retry.event.payload, {}, 'a retry does not fill the payload back in');
    assert.throws(() => store.appendEvent(event({ id: ids[1], expectedRevision: 2, type: 'record.redacted', payload: {} })), ReservedEventTypeError);
    assert.throws(() => store.appendEvents([event({ id: ids[1], entityId: 'other', type: 'record.redacted', payload: {} })]), ReservedEventTypeError);
    assert.equal(store.revisionOf('other', 'other'), 0);
  } finally { store.close(); }
}));

test('the redact route needs confirmation and lists the backups that still hold the content', () => withDir(async (dir) => {
  const app = buildApp({ dataDir: dir, aiCounterFile: null, features: on });
  const redact = (payload, entityId = 'app-fictional-1') =>
    app.inject({ method: 'POST', url: `/api/operations/entities/application/${entityId}/redact`, payload });
  try {
    await app.inject({ method: 'POST', url: '/api/operations/events', payload: { events: [event()] } });

    for (const payload of [{ id: ids[2], expectedRevision: 1 }, { id: ids[2], expectedRevision: 1, confirm: 'yes' }, { id: 'nope', expectedRevision: 1, confirm: true }, { id: ids[2], expectedRevision: 1, confirm: true, extra: 1 }]) {
      assert.equal((await redact(payload)).statusCode, 400, JSON.stringify(payload));
    }
    assert.equal((await redact({ id: ids[2], expectedRevision: 1, confirm: true }, 'missing')).json().error, 'RECORD_NOT_FOUND');
    const stale = await redact({ id: ids[2], expectedRevision: 5, confirm: true });
    assert.deepEqual([stale.statusCode, stale.json().error], [409, 'STALE_REVISION']);
    const reserved = await app.inject({ method: 'POST', url: '/api/operations/events', payload: { events: [event({ id: ids[3], entityId: 'x', type: 'record.redacted' })] } });
    assert.deepEqual([reserved.statusCode, reserved.json().issues[0].path], [400, 'type']);

    const backup = (await app.inject({ method: 'POST', url: '/api/operations/backups' })).json().backup;
    const r = await redact({ id: ids[2], expectedRevision: 1, confirm: true });
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.equal(body.redactedEvents, 1);
    assert.deepEqual(body.retention.backups, [backup.name]);
    assert.deepEqual(body.retention.preMigrationCopies, []);
    assert.match(body.retention.message, /1 earlier copy may still hold it/);
    assert.equal(holds(storeBytes(dir), SMALL), false);
    assert.ok(holds(readFileSync(join(dir, 'operations', 'backups', backup.name)), SMALL), 'the earlier backup does still hold it, as stated');

    // Restoring that backup brings the content back, as the notice says.
    await app.inject({ method: 'POST', url: `/api/operations/backups/${backup.name}/restore`, payload: { confirm: true } });
    const restored = (await app.inject({ method: 'GET', url: '/api/operations/entities/application/app-fictional-1/events' })).json();
    assert.equal(restored.events[0].payload.note, SMALL);
  } finally { await app.close(); }
}));

test('a redacted legacy record is not filled in again by reimporting the same file', () => withDir(async (dir) => {
  const app = buildApp({ dataDir: dir, aiCounterFile: null, features: on });
  const header = '| # | Date | Company | Via | Role | Score | Status | PDF | Report | Notes |\n|---|---|---|---|---|---|---|---|---|---|';
  const markdown = ['# Applications Tracker', '', header, '| 1 | 2026-06-20 | Fictional Startup Studio | — | Backend Engineer | 4.2/5 | Applied | ✅ | — | fictional note |', ''].join('\n');
  const importText = () => app.inject({ method: 'POST', url: '/api/operations/imports/legacy-tracker', payload: { markdown, sourceLabel: 'applications.md', dryRun: false } });
  try {
    assert.equal((await importText()).json().report.imported, 1);
    assert.equal((await app.inject({ method: 'POST', url: '/api/operations/entities/application/legacy-1/redact', payload: { id: ids[2], expectedRevision: 1, confirm: true } })).statusCode, 200);
    const report = (await importText()).json().report;
    assert.equal(report.imported + report.updated, 0);
    assert.deepEqual(report.quarantined.map((q) => q.reason), ['record_redacted']);
  } finally { await app.close(); }
}));

const V1 = OPERATIONS_MIGRATIONS.filter((m) => m.version === 1);
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

test('a backup from an older schema is upgraded on a temporary copy and restored; the backup is unchanged', () => withDir((dir) => {
  const old = OperationsStore.open(join(dir, 'old'), { migrations: V1 });
  const manifest = (() => {
    try { old.appendEvent(event()); return createBackup(old, join(dir, 'old'), 'manual'); } finally { old.close(); }
  })();
  assert.equal(manifest.schemaVersion, 1);
  const backupDir = join(dir, 'old', 'operations', 'backups');
  const file = join(backupDir, manifest.name);

  const store = OperationsStore.open(join(dir, 'new'));
  try {
    assert.ok(store.schemaVersion > 1);
    store.checkBackup(file);
    assert.deepEqual(store.restoreFrom(file), { entities: 1, events: 1 });
    const [restored] = store.listEvents('application', 'app-fictional-1');
    assert.equal(restored.payload.note, SMALL);
    assert.equal('redactedAt' in restored, false);
    // The restored record works with the new schema's features.
    assert.equal(store.redactRecord('application', 'app-fictional-1', { id: ids[2], expectedRevision: 1 }).redactedEvents, 1);
  } finally { store.close(); }
  assert.equal(sha(file), manifest.sha256, 'the backup file itself was never changed');
  assert.deepEqual(readdirSync(backupDir).sort(), [manifest.name, `${manifest.name}.json`], 'no temporary copy is left behind');
}));

test('the redact route reports pre-migration copies; an older backup restores over HTTP', () => withDir(async (dir) => {
  const old = OperationsStore.open(dir, { migrations: V1 });
  let manifest;
  try { old.appendEvent(event()); manifest = createBackup(old, dir, 'manual'); } finally { old.close(); }

  const app = buildApp({ dataDir: dir, aiCounterFile: null, features: on });
  try {
    // Opening upgrades the store and leaves a pre-migration copy beside it.
    const r = await app.inject({ method: 'POST', url: '/api/operations/entities/application/app-fictional-1/redact', payload: { id: ids[2], expectedRevision: 1, confirm: true } });
    assert.equal(r.statusCode, 200);
    const { retention } = r.json();
    assert.deepEqual(retention.backups, [manifest.name]);
    assert.equal(retention.preMigrationCopies.length, 1);
    assert.match(retention.preMigrationCopies[0], /^operations\.sqlite\.pre-v\d+-\d+\.bak$/);

    const restored = await app.inject({ method: 'POST', url: `/api/operations/backups/${manifest.name}/restore`, payload: { confirm: true } });
    assert.equal(restored.statusCode, 200, restored.body);
    const events = (await app.inject({ method: 'GET', url: '/api/operations/entities/application/app-fictional-1/events' })).json();
    assert.equal(events.revision, 1);
    assert.equal(events.events[0].payload.note, SMALL);
  } finally { await app.close(); }
}));

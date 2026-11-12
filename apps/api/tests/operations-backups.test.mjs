// Operations backups (R0 FND-06): owner-only consistent copies with a hashed
// manifest; restore by name only, verified, all-or-nothing, undoable, and
// possible on a clean profile. Fictional data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { resolveFeatureFlags } from '@reboundops/contracts';
import { buildApp } from '../../../dist/api/app.js';

const on = resolveFeatureFlags({ REBOUNDOPS_FEATURES: 'autofill' });
const ids = ['6b1e2f3a-4c5d-4e6f-8a7b-9c0d1e2f3a4b', '7c2f3a4b-5d6e-4f7a-9b8c-0d1e2f3a4b5c'];
const event = (i, entityId) => ({
  id: ids[i], entityType: 'application', entityId, expectedRevision: 0, type: 'application.created',
  occurredAt: '2026-11-01T09:00:00.000Z', source: 'user', payload: { company: 'Fictional Startup Studio' }
});
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const backupsDir = (dir) => join(dir, 'operations', 'backups');

function open(dir) { return buildApp({ dataDir: dir, aiCounterFile: null, features: on }); }
const append = (app, e) => app.inject({ method: 'POST', url: '/api/operations/events', payload: { events: [e] } });
const backup = async (app) => (await app.inject({ method: 'POST', url: '/api/operations/backups' })).json().backup;
const restore = (app, name, payload = { confirm: true }) =>
  app.inject({ method: 'POST', url: `/api/operations/backups/${encodeURIComponent(name)}/restore`, payload });
const revision = async (app, id) => (await app.inject({ method: 'GET', url: `/api/operations/entities/application/${id}/events` })).json().revision;

async function withDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'reboundops-backups-'));
  try { await fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('a backup is an owner-only copy with a hashed manifest that holds no record content', () => withDir(async (dir) => {
  const app = open(dir);
  try {
    await append(app, event(0, 'app-1'));
    const r = await app.inject({ method: 'POST', url: '/api/operations/backups' });
    assert.equal(r.statusCode, 201);
    const m = r.json().backup;
    assert.match(m.name, /^operations-\d{8}T\d{9}Z\.sqlite$/);
    assert.deepEqual([m.reason, m.schemaVersion, m.entities, m.events], ['manual', 1, 1, 1]);
    const file = join(backupsDir(dir), m.name);
    assert.equal(sha(file), m.sha256);
    assert.equal(statSync(file).size, m.bytes);
    if (process.platform !== 'win32') {
      assert.equal(statSync(file).mode & 0o777, 0o600);
      assert.equal(statSync(`${file}.json`).mode & 0o777, 0o600);
      assert.equal(statSync(backupsDir(dir)).mode & 0o777, 0o700);
    }
    assert.ok(!readFileSync(`${file}.json`, 'utf8').includes('Fictional Startup Studio'), 'manifest holds counts and hashes only');
    const list = (await app.inject({ method: 'GET', url: '/api/operations/backups' })).json().backups;
    assert.deepEqual(list.map((b) => b.name), [m.name]);
  } finally { await app.close(); }
}));

test('restore replaces every record, backs up the current state first, and can be undone', () => withDir(async (dir) => {
  const app = open(dir);
  try {
    await append(app, event(0, 'app-1'));
    const before = await backup(app);
    await append(app, event(1, 'app-2'));

    const r = await restore(app, before.name);
    assert.equal(r.statusCode, 200);
    assert.deepEqual(r.json().restored, { entities: 1, events: 1 });
    assert.equal(await revision(app, 'app-1'), 1);
    assert.equal(await revision(app, 'app-2'), 0, 'records written after the backup are gone');

    const safety = r.json().preRestoreBackup;
    assert.equal(safety.reason, 'pre_restore');
    assert.equal(safety.events, 2);
    assert.equal((await restore(app, safety.name)).statusCode, 200);
    assert.equal(await revision(app, 'app-2'), 1, 'restoring the safety backup undoes the restore');
  } finally { await app.close(); }
}));

test('a backup restores on a clean profile and survives a restart there', () => withDir(async (first) => withDir(async (clean) => {
  const a = open(first);
  let m;
  try { await append(a, event(0, 'app-1')); m = await backup(a); } finally { await a.close(); }

  mkdirSync(backupsDir(clean), { recursive: true });
  for (const f of [m.name, `${m.name}.json`]) copyFileSync(join(backupsDir(first), f), join(backupsDir(clean), f));
  let b = open(clean);
  try {
    assert.equal((await restore(b, m.name)).statusCode, 200);
    assert.equal(await revision(b, 'app-1'), 1);
  } finally { await b.close(); }
  b = open(clean);
  try { assert.equal(await revision(b, 'app-1'), 1); } finally { await b.close(); }
})));

test('only a bare backup name is accepted: paths, traversal and other files are 404', () => withDir(async (dir) => {
  const app = open(dir);
  try {
    await append(app, event(0, 'app-1'));
    await backup(app);
    for (const name of ['../operations.sqlite', 'operations.sqlite', '..', '/etc/passwd', 'operations-20261112T000000000Z.sqlite']) {
      const r = await restore(app, name);
      assert.equal(r.statusCode, 404, name);
      // '..' never reaches the route (the URL normalises to no route at all).
      assert.ok(['BACKUP_NOT_FOUND', 'Not Found'].includes(r.json().error), name);
    }
    assert.equal(await revision(app, 'app-1'), 1);
  } finally { await app.close(); }
}));

test('a file that does not match its manifest is refused, and nothing changes', () => withDir(async (dir) => {
  const app = open(dir);
  try {
    await append(app, event(0, 'app-1'));
    const m = await backup(app);
    const file = join(backupsDir(dir), m.name);
    const bytes = readFileSync(file);
    bytes[bytes.length - 1] ^= 0xff;
    writeFileSync(file, bytes);
    const r = await restore(app, m.name);
    assert.equal(r.statusCode, 409);
    assert.equal(r.json().error, 'BACKUP_HASH_MISMATCH');
    const list = (await app.inject({ method: 'GET', url: '/api/operations/backups' })).json().backups;
    assert.equal(list.length, 1, 'no safety backup was taken for a refused restore');
  } finally { await app.close(); }
}));

test('an unreadable or different-schema backup is 422, even with a matching manifest', () => withDir(async (dir) => {
  const app = open(dir);
  try {
    await append(app, event(0, 'app-1'));
    const m = await backup(app);
    const file = join(backupsDir(dir), m.name);
    const rehash = () => {
      const manifest = JSON.parse(readFileSync(`${file}.json`, 'utf8'));
      writeFileSync(`${file}.json`, JSON.stringify({ ...manifest, sha256: sha(file) }));
    };

    writeFileSync(file, 'not a database');
    rehash();
    let r = await restore(app, m.name);
    assert.equal(r.statusCode, 422);
    assert.equal(r.json().reason, 'integrity');

    rmSync(file);
    const other = new DatabaseSync(file);
    other.exec('CREATE TABLE t (x INTEGER); PRAGMA user_version = 7;');
    other.close();
    rehash();
    r = await restore(app, m.name);
    assert.equal(r.statusCode, 422);
    assert.equal(r.json().reason, 'schema_version');
    assert.equal(await revision(app, 'app-1'), 1, 'nothing changed');
  } finally { await app.close(); }
}));

test('restore needs exactly { confirm: true }; backups are off with the flags', () => withDir(async (dir) => {
  const app = open(dir);
  try {
    const m = await backup(app);
    for (const payload of [{}, { confirm: 'yes' }, { confirm: true, path: '/x' }]) {
      assert.equal((await restore(app, m.name, payload)).statusCode, 400);
    }
  } finally { await app.close(); }
  const off = buildApp({ dataDir: dir, aiCounterFile: null, features: resolveFeatureFlags({}) });
  try {
    assert.equal((await off.inject({ method: 'GET', url: '/api/operations/backups' })).statusCode, 404);
    assert.ok(existsSync(backupsDir(dir)));
  } finally { await off.close(); }
}));

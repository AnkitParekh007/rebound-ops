// Operations ledger over HTTP (R0): off by default, opened only with a data
// directory and an enabled flag, 409 on a stale revision, idempotent retries.
// Fictional data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveFeatureFlags } from '@reboundops/contracts';
import { buildApp } from '../../../dist/api/app.js';

const on = resolveFeatureFlags({ REBOUNDOPS_FEATURES: 'autofill' });
const off = resolveFeatureFlags({});
const event = (over = {}) => ({
  id: '4fbc80de-5d6b-4eaf-8a7c-9b1d3e5f7a8b', entityType: 'application', entityId: 'app-fictional-1',
  expectedRevision: 0, type: 'application.created', occurredAt: '2026-11-01T09:00:00.000Z', source: 'user',
  payload: { company: 'Fictional Startup Studio' }, ...over
});
const post = (app, events) => app.inject({ method: 'POST', url: '/api/operations/events', payload: { events } });

async function withApp(options, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'reboundops-ops-routes-'));
  const app = buildApp({ dataDir: dir, aiCounterFile: null, ...options });
  try { await fn(app, dir); } finally { await app.close(); rmSync(dir, { recursive: true, force: true }); }
}

test('with every flag off, the routes refuse and no store file is created', () => withApp({ features: off }, async (app, dir) => {
  const status = await app.inject({ method: 'GET', url: '/api/operations/status' });
  assert.deepEqual(status.json().enabledFeatures, []);
  const r = await post(app, [event()]);
  assert.equal(r.statusCode, 404);
  assert.equal(r.json().error, 'OPERATIONS_DISABLED');
  assert.ok(!existsSync(join(dir, 'operations')));
}));

test('without a data directory nothing is persisted', async () => {
  const app = buildApp({ features: on, aiCounterFile: null });
  try {
    const r = await post(app, [event()]);
    assert.equal(r.statusCode, 503);
    assert.equal(r.json().error, 'OPERATIONS_STORE_NOT_CONFIGURED');
  } finally { await app.close(); }
});

test('the store opens on first use, not at start-up', () => withApp({ features: on }, async (app, dir) => {
  assert.ok(!existsSync(join(dir, 'operations')));
  assert.equal((await app.inject({ method: 'GET', url: '/api/operations/status' })).json().storeOpen, false, 'status does not open it');
  assert.ok(!existsSync(join(dir, 'operations')));
  assert.equal((await post(app, [event()])).statusCode, 201);
  const status = (await app.inject({ method: 'GET', url: '/api/operations/status' })).json();
  assert.equal(status.storeOpen, true);
  assert.equal(status.schemaVersion, 1);
}));

test('append, read back, a stale revision is 409 and a retry is idempotent', () => withApp({ features: on }, async (app) => {
  const first = await post(app, [event()]);
  assert.equal(first.statusCode, 201);
  assert.equal(first.json().results[0].event.revision, 1);

  const retry = await post(app, [event()]);
  assert.equal(retry.statusCode, 200);
  assert.equal(retry.json().results[0].status, 'duplicate');

  const stale = await post(app, [event({ id: '5acd91ef-6e7c-4fba-9b8d-0c2e4f6a8b9c', type: 'application.submitted' })]);
  assert.equal(stale.statusCode, 409);
  assert.deepEqual(stale.json(), { error: 'STALE_REVISION', expectedRevision: 0, currentRevision: 1 });

  const reused = await post(app, [event({ payload: { company: 'Someone Else' } })]);
  assert.equal(reused.statusCode, 409);
  assert.equal(reused.json().error, 'EVENT_ID_REUSED');

  const read = await app.inject({ method: 'GET', url: '/api/operations/entities/application/app-fictional-1/events' });
  assert.equal(read.statusCode, 200);
  assert.equal(read.json().revision, 1);
  assert.deepEqual(read.json().events.map((e) => e.type), ['application.created']);
}));

test('invalid requests are 400 with the failing path, oversized payloads 413', () => withApp({ features: on }, async (app) => {
  let r = await app.inject({ method: 'POST', url: '/api/operations/events', payload: { events: [] } });
  assert.equal(r.statusCode, 400);
  r = await post(app, [event(), event({ id: 'not-a-uuid' })]);
  assert.equal(r.statusCode, 400);
  assert.equal(r.json().issues[0].path, 'events.1.id');
  r = await app.inject({ method: 'GET', url: '/api/operations/entities/Application/x/events' });
  assert.equal(r.statusCode, 400);
  r = await post(app, [event({ payload: { blob: 'x'.repeat(70 * 1024) } })]);
  assert.equal(r.statusCode, 413);
  assert.equal(r.json().error, 'EVENT_PAYLOAD_TOO_LARGE');
  r = await post(app, [event({ payload: { blob: 'x'.repeat(130 * 1024) } })]);
  assert.equal(r.statusCode, 413, 'a body over the API limit is refused by Fastify first');
  assert.equal(r.json().code, 'FST_ERR_CTP_BODY_TOO_LARGE');
}));

test('a second API on the same data directory gets 503 LOCKED, not a second writer', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'reboundops-ops-routes-'));
  const a = buildApp({ dataDir: dir, aiCounterFile: null, features: on });
  const b = buildApp({ dataDir: dir, aiCounterFile: null, features: on });
  try {
    assert.equal((await post(a, [event()])).statusCode, 201);
    const r = await post(b, [event()]);
    assert.equal(r.statusCode, 503);
    assert.equal(r.json().error, 'OPERATIONS_STORE_LOCKED');
    await a.close();
    assert.equal((await post(b, [event()])).statusCode, 200, 'opens once the first owner closes');
  } finally {
    await a.close(); await b.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

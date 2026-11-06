// ReboundOps Next — /api/rebound/* bridge contract.
// Runs against a STUB upstream on 127.0.0.1 (records what the bridge sends)
// and an isolated REBOUND_OPS_ROOT, never the real parent project.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';

const ROOT = mkdtempSync(join(tmpdir(), 'rb-bridge-'));
const SID = '3f0c6a2e-8d4b-4c1a-9e7f-2b5d6c8a9e01';
let stub, ui, base, seen, upstreamPort;

function listen(server) {
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
}

before(async () => {
  process.env.REBOUND_OPS_ROOT = ROOT;
  stub = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      seen = { method: req.method, url: req.url, headers: req.headers, body: body ? JSON.parse(body) : undefined };
      if (req.url.endsWith('/export')) {
        res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' });
        return res.end('# plan');
      }
      res.writeHead(req.method === 'POST' ? 201 : 200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, echo: seen.body ?? null }));
    });
  });
  upstreamPort = await listen(stub);
  process.env.REBOUNDOPS_API_PORT = String(upstreamPort);
  const { createApp } = await import('../server/index.mjs');
  ui = http.createServer(createApp());
  base = `http://127.0.0.1:${await listen(ui)}`;
});

after(() => { stub?.close(); ui?.close(); });

const intake = (extra = {}) => ({
  role: 'Software Engineer', location: '', weeklyHours: 4, urgency: 'soon', priorities: 'Goal: similar role',
  shiftTarget: '', bridgeTarget: '', evidence: [], ...extra,
});
const post = (path, body, headers = {}) => fetch(base + path, {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
});
const put = (path, body, headers = {}) => fetch(base + path, {
  method: 'PUT', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
});

test('health is proxied to the fixed upstream path', async () => {
  const r = await fetch(base + '/api/rebound/health');
  assert.equal(r.status, 200);
  assert.equal(seen.url, '/api/health');
  assert.equal(seen.method, 'GET');
});

test('session create forwards only intake fields and forces evidence to manual + unverified', async () => {
  const r = await post('/api/rebound/sessions', {
    intake: intake({
      injected: 'x',
      evidence: [{ id: '7d9c2a4e-1b3f-4c5d-8e6f-0a1b2c3d4e5f', claim: 'Fictional claim', source: { kind: 'resume', label: 'Me', excerpt: 'x' }, status: 'confirmed' }],
    }),
    target: 'http://evil.example/',
  }, { cookie: 'sid=secret', authorization: 'Bearer secret' });
  assert.equal(r.status, 201);
  assert.equal(seen.url, '/api/sessions');
  assert.deepEqual(Object.keys(seen.body), ['intake']);
  assert.equal(seen.body.intake.injected, undefined);
  assert.deepEqual(seen.body.intake.evidence[0], {
    id: '7d9c2a4e-1b3f-4c5d-8e6f-0a1b2c3d4e5f', claim: 'Fictional claim', source: { kind: 'manual', label: 'Me' }, status: 'unverified',
  });
  // No browser header reaches the upstream.
  assert.equal(seen.headers.cookie, undefined);
  assert.equal(seen.headers.authorization, undefined);
  assert.equal(seen.headers.origin, undefined);
  assert.equal(seen.headers.host, `127.0.0.1:${upstreamPort}`);
});

test('invalid intake is refused before reaching upstream', async () => {
  seen = null;
  for (const bad of [intake({ weeklyHours: 21 }), intake({ urgency: 'now' }), intake({ role: 5 }), intake({ evidence: [{ id: 'nope', claim: 'x', source: { label: 'y' } }] })]) {
    const r = await post('/api/rebound/sessions', { intake: bad });
    assert.equal(r.status, 400);
  }
  assert.equal(seen, null);
});

test('route and action mutations forward only the documented payload', async () => {
  let r = await put(`/api/rebound/sessions/${SID}/route`, { expectedRevision: 2, routeId: 'shift', extra: 1 });
  assert.equal(r.status, 200);
  assert.equal(seen.url, `/api/sessions/${SID}/route`);
  assert.deepEqual(seen.body, { expectedRevision: 2, routeId: 'shift' });
  r = await put(`/api/rebound/sessions/${SID}/actions/shift-3`, { expectedRevision: 3, completed: true });
  assert.equal(r.status, 200);
  assert.deepEqual(seen.body, { expectedRevision: 3, completed: true });
});

test('path params and shapes are validated', async () => {
  seen = null;
  const cases = [
    () => fetch(`${base}/api/rebound/sessions/not-a-uuid`),
    () => put(`/api/rebound/sessions/${SID}/route`, { expectedRevision: -1, routeId: 'return' }),
    () => put(`/api/rebound/sessions/${SID}/route`, { expectedRevision: 0, routeId: 'moon' }),
    () => put(`/api/rebound/sessions/${SID}/actions/return-9`, { expectedRevision: 0, completed: true }),
    () => put(`/api/rebound/sessions/${SID}/actions/${encodeURIComponent('../../health')}`, { expectedRevision: 0, completed: true }),
    () => put(`/api/rebound/sessions/${SID}/actions/return-1`, { expectedRevision: 0, completed: 'yes' }),
  ];
  for (const c of cases) {
    const r = await c();
    assert.ok([400, 404].includes(r.status), `expected refusal, got ${r.status}`);
  }
  assert.equal(seen, null);
});

test('only allowlisted actions exist', async () => {
  for (const [m, p] of [['DELETE', `/api/rebound/sessions/${SID}`], ['POST', `/api/rebound/sessions/${SID}/ai/analyze`], ['GET', '/api/rebound/sessions/saved']]) {
    const r = await fetch(base + p, { method: m });
    assert.ok([400, 404].includes(r.status), `${m} ${p} → ${r.status}`);
  }
});

test('export passes Markdown through as an attachment', async () => {
  const r = await fetch(`${base}/api/rebound/sessions/${SID}/export`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/markdown/);
  assert.match(r.headers.get('content-disposition'), /attachment/);
  assert.equal(await r.text(), '# plan');
});

test('cross-site mutations are still refused by the existing request guard', async () => {
  const r = await post('/api/rebound/sessions', { intake: intake() }, { origin: 'https://evil.example' });
  assert.equal(r.status, 403);
});

test('oversized bodies are refused', async () => {
  const r = await post('/api/rebound/sessions', { intake: intake({ priorities: 'x'.repeat(70 * 1024) }) });
  assert.equal(r.status, 413);
});

test('offline upstream reports an honest 503, never a fabricated plan', async () => {
  const saved = process.env.REBOUNDOPS_API_PORT;
  const dead = http.createServer();
  const port = await listen(dead);
  await new Promise((r) => dead.close(r));
  process.env.REBOUNDOPS_API_PORT = String(port);
  try {
    const r = await fetch(base + '/api/rebound/health');
    assert.equal(r.status, 503);
    const body = await r.json();
    assert.equal(body.error, 'RECOVERY_SERVICE_OFFLINE');
    assert.match(body.message, /offline/i);
  } finally {
    process.env.REBOUNDOPS_API_PORT = saved;
  }
});

test('the bridge writes nothing into the ReboundOps project root', () => {
  assert.deepEqual(readdirSync(ROOT).filter((f) => !f.startsWith('.')), []);
});

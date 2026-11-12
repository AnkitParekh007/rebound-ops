// The smoke scripts' HTTP helper must always settle within its deadline.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { httpGet } from './smoke-http.mjs';

async function withServer(handler, fn) {
  const server = http.createServer(handler);
  await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise((done) => server.close(done)); }
}

test('returns status, body and JSON', () => withServer((_q, r) => r.end('{"a":1}'), async (base) => {
  const r = await httpGet(base + '/');
  assert.equal(r.status, 200);
  assert.equal(r.ok, true);
  assert.equal(r.json().a, 1);
}));

test('a response that keeps sending but never ends is cut off at the deadline', () => withServer((_q, r) => {
  r.writeHead(200);
  const drip = setInterval(() => r.write('x'), 50);
  r.on('close', () => clearInterval(drip));
}, async (base) => {
  const started = Date.now();
  await assert.rejects(httpGet(base + '/', { timeoutMs: 300 }), /did not complete within 300 ms/);
  assert.ok(Date.now() - started < 2_000);
}));

test('a refused connection is a normal rejection', async () => {
  const server = http.createServer();
  await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
  const { port } = server.address();
  await new Promise((done) => server.close(done));
  await assert.rejects(httpGet(`http://127.0.0.1:${port}/`), (e) => e.code === 'ECONNREFUSED');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../../dist/api/app.js';
const provider = (checkConnection) => ({ name: 'fictional-provider', model: 'fixture-model', checkConnection,
  async analyze() { throw new Error('Connection setup must never analyze career data'); } });

test('status is passive; explicit connection consent verifies metadata without analysis or spend counters', async () => {
  let calls = 0;
  const app = buildApp({ aiCounterFile: null, aiProvider: provider(async () => { calls++; }) });
  try {
    assert.equal((await app.inject('/api/ai/status')).json().connectionStatus, 'not-tested');
    for (const payload of [{}, { consent: false }, { consent: true, evidence: 'must not forward' }]) {
      assert.equal((await app.inject({ method: 'POST', url: '/api/ai/test-connection', payload })).statusCode, 400);
    }
    assert.equal(calls, 0);
    const response = await app.inject({ method: 'POST', url: '/api/ai/test-connection', payload: { consent: true } });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().connected, true);
    const status = (await app.inject('/api/ai/status')).json();
    assert.equal(status.connectionStatus, 'connected');
    assert.equal(status.attempts, 0);
    assert.equal(calls, 1);
    assert.equal((await app.inject({ method: 'POST', url: '/api/ai/test-connection', payload: { consent: true } })).statusCode, 429);
    assert.equal(calls, 1);
  } finally { await app.close(); }
});

test('failed connection errors are sanitized and status is honest', async () => {
  const app = buildApp({ aiCounterFile: null, aiProvider: provider(async () => { throw Error('SECRET fixture diagnostic'); }) });
  try {
    const result = await app.inject({ method: 'POST', url: '/api/ai/test-connection', payload: { consent: true } });
    assert.equal(result.statusCode, 502);
    assert(!result.body.includes('SECRET'));
    assert.equal((await app.inject('/api/ai/status')).json().connectionStatus, 'failed');
  } finally { await app.close(); }
});

test('connection testing retains Host and Origin guards', async () => {
  let calls = 0;
  const app = buildApp({ aiProvider: provider(async () => { calls++; }) });
  try {
    for (const headers of [{ host: 'evil.test' }, { origin: 'https://evil.test' }, { 'sec-fetch-site': 'cross-site' }]) {
      assert.equal((await app.inject({ method: 'POST', url: '/api/ai/test-connection', headers, payload: { consent: true } })).statusCode, 403);
    }
    assert.equal(calls, 0);
  } finally { await app.close(); }
});

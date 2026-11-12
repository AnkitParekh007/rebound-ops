// Optional local model (R0 FND-05): an invalid or missing model falls back
// honestly; no request ever leaves the computer. Fictional data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { resolveFeatureFlags } from '@reboundops/contracts';
import { buildApp } from '../../../dist/api/app.js';
import { LocalModel, readLocalModelConfig } from '../../../dist/api/operations/local-model.js';

const schema = {
  safeParse(v) {
    return v && typeof v === 'object' && typeof v.summary === 'string' && Object.keys(v).length === 1
      ? { success: true, data: v } : { success: false };
  }
};
const ask = (model, extra = {}) => model.complete({ system: 'Summarise. Reply as JSON {"summary": string}.', user: 'Fictional note.', schema, ...extra });

/** A fake OpenAI-compatible server. `mode` picks its behaviour per test. */
async function withServer(fn) {
  const state = { mode: 'ok', requests: [] };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      state.requests.push({ method: req.method, url: req.url, headers: req.headers, body });
      const json = (code, value) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); };
      if (state.mode === 'redirect') { res.writeHead(302, { location: 'http://example.com/v1/models' }); return res.end(); }
      if (state.mode === 'error') return json(500, { error: 'boom' });
      if (state.mode === 'slow') return; // never answers
      if (req.url === '/v1/models') return json(200, { data: [{ id: state.mode === 'no-model' ? 'other' : 'fictional-7b' }] });
      const content = { ok: '{"summary":"A fictional summary."}', 'not-json': 'Sure! Here is a summary.', 'wrong-shape': '{"summary": 3}' }[state.mode];
      if (state.mode === 'huge') { res.writeHead(200); return res.end('x'.repeat(2 * 1024 * 1024)); }
      return json(200, { choices: [{ message: { content } }] });
    });
  });
  await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
  const env = { REBOUNDOPS_LOCAL_MODEL_URL: `http://127.0.0.1:${server.address().port}/v1/`, REBOUNDOPS_LOCAL_MODEL: 'fictional-7b', REBOUNDOPS_LOCAL_MODEL_TIMEOUT_MS: '400' };
  try { await fn(state, env); } finally { server.closeAllConnections(); await new Promise((done) => server.close(done)); }
}

function spyFetch() {
  const calls = [];
  const f = async (...args) => { calls.push(args[0]); throw new Error('must not be called'); };
  return { f, calls };
}

test('not configured: a manual fallback with the prompt, and no request at all', async () => {
  const spy = spyFetch();
  const model = LocalModel.fromEnv({}, { fetch: spy.f });
  const out = await ask(model);
  assert.equal(out.kind, 'manual');
  assert.equal(out.reason, 'not_configured');
  assert.match(out.prompt, /Fictional note\./, 'the person can copy the prompt');
  assert.equal((await model.health()).status, 'not_configured');
  assert.equal(spy.calls.length, 0);
});

test('a remote, credentialed or malformed endpoint is refused and never contacted', async () => {
  for (const url of ['https://api.example.com/v1', 'http://192.168.1.20:11434/v1', 'http://user:pw@127.0.0.1:1/v1', 'http://127.0.0.1.example.com/v1', 'file:///etc/passwd', 'not a url', 'http://127.0.0.1:1/v1?key=x']) {
    const spy = spyFetch();
    const model = LocalModel.fromEnv({ REBOUNDOPS_LOCAL_MODEL_URL: url, REBOUNDOPS_LOCAL_MODEL: 'm' }, { fetch: spy.f });
    assert.equal(model.config.state, 'invalid_config', url);
    const out = await ask(model);
    assert.equal(out.reason, 'invalid_config', url);
    assert.equal((await model.health()).status, 'invalid_config', url);
    assert.equal(spy.calls.length, 0, `${url} was contacted`);
  }
  assert.equal(readLocalModelConfig({ REBOUNDOPS_LOCAL_MODEL_URL: 'http://127.0.0.1:1/v1' }).state, 'invalid_config', 'a URL without a model name');
});

test('loopback forms are allowed; the timeout is capped', () => {
  for (const url of ['http://127.0.0.1:8080/v1', 'http://localhost:11434/v1', 'http://[::1]:1234/v1', 'http://127.0.0.2/v1']) {
    assert.equal(readLocalModelConfig({ REBOUNDOPS_LOCAL_MODEL_URL: url, REBOUNDOPS_LOCAL_MODEL: 'm' }).state, 'configured', url);
  }
  const c = readLocalModelConfig({ REBOUNDOPS_LOCAL_MODEL_URL: 'http://127.0.0.1/v1', REBOUNDOPS_LOCAL_MODEL: 'm', REBOUNDOPS_LOCAL_MODEL_TIMEOUT_MS: '999999999' });
  assert.equal(c.timeoutMs, 120000);
});

test('a valid structured answer is a model result; no Authorization header is sent', () => withServer(async (state, env) => {
  const model = LocalModel.fromEnv(env);
  assert.equal((await model.health()).status, 'ready');
  const out = await ask(model);
  assert.equal(out.kind, 'model');
  assert.deepEqual(out.value, { summary: 'A fictional summary.' });
  const sent = state.requests.at(-1);
  assert.equal(sent.url, '/v1/chat/completions');
  assert.equal(sent.headers.authorization, undefined);
  assert.equal(JSON.parse(sent.body).temperature, 0);
}));

test('missing model, server error, non-JSON, wrong shape and oversized output all fall back honestly', () => withServer(async (state, env) => {
  const model = LocalModel.fromEnv(env);
  const cases = [['no-model', 'health', 'model_missing'], ['error', 'complete', 'unreachable'], ['not-json', 'complete', 'invalid_output'], ['wrong-shape', 'complete', 'invalid_output'], ['huge', 'complete', 'invalid_output']];
  for (const [mode, call, expected] of cases) {
    state.mode = mode;
    const got = call === 'health' ? (await model.health()).status : (await ask(model)).reason;
    assert.equal(got, expected, mode);
  }
}));

test('a redirect is not followed', () => withServer(async (state, env) => {
  state.mode = 'redirect';
  const model = LocalModel.fromEnv(env);
  assert.equal((await model.health()).status, 'unreachable');
  assert.equal((await ask(model)).reason, 'unreachable');
  assert.ok(state.requests.every((r) => r.url.startsWith('/v1/')), 'only the loopback server saw requests');
}));

test('a slow model times out, and the caller can cancel', () => withServer(async (state, env) => {
  state.mode = 'slow';
  const model = LocalModel.fromEnv(env);
  const started = Date.now();
  assert.equal((await ask(model)).reason, 'timeout');
  assert.ok(Date.now() - started < 3000);
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 50);
  assert.equal((await ask(model, { signal: controller.signal })).reason, 'cancelled');
  const already = new AbortController(); already.abort();
  assert.equal((await ask(model, { signal: already.signal })).reason, 'cancelled');
}));

test('an unreachable endpoint falls back', async () => {
  const server = http.createServer();
  await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
  const { port } = server.address();
  await new Promise((done) => server.close(done));
  const model = LocalModel.fromEnv({ REBOUNDOPS_LOCAL_MODEL_URL: `http://127.0.0.1:${port}/v1`, REBOUNDOPS_LOCAL_MODEL: 'm' });
  assert.equal((await ask(model)).reason, 'unreachable');
  assert.equal((await model.health()).status, 'unreachable');
});

test('routes: status never contacts the model, a check does, and both are off with the flags', () => withServer(async (state, env) => {
  const on = resolveFeatureFlags({ REBOUNDOPS_FEATURES: 'autofill' });
  const app = buildApp({ aiCounterFile: null, features: on, localModel: LocalModel.fromEnv(env) });
  try {
    const status = (await app.inject({ method: 'GET', url: '/api/operations/local-model' })).json();
    assert.deepEqual([status.configured, status.status, status.model], [true, 'not_checked', 'fictional-7b']);
    assert.equal(state.requests.length, 0, 'reading the status sent nothing');
    const check = (await app.inject({ method: 'POST', url: '/api/operations/local-model/check' })).json();
    assert.equal(check.status, 'ready');
    assert.equal(state.requests.length, 1);
  } finally { await app.close(); }
  const off = buildApp({ aiCounterFile: null, features: resolveFeatureFlags({}), localModel: LocalModel.fromEnv(env) });
  try {
    assert.equal((await off.inject({ method: 'GET', url: '/api/operations/local-model' })).statusCode, 404);
    assert.equal((await off.inject({ method: 'POST', url: '/api/operations/local-model/check' })).statusCode, 404);
  } finally { await off.close(); }
}));

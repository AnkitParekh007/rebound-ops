// The engine reaches the optional local model through its own JavaScript port
// (engine/web/src/lib/apply/local-model.mjs, Autofill AF-05), because it has no
// build step and cannot import the API adapter (FND-05, ADR 0005). This fails as
// soon as the two disagree about which endpoints may be contacted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FEATURE_FLAG_ENV, FEATURE_FLAGS, resolveFeatureFlags } from '../packages/contracts/dist/index.js';
import * as api from '../dist/api/operations/local-model.js';
import * as engine from '../engine/web/src/lib/apply/local-model.mjs';

const model = { REBOUNDOPS_LOCAL_MODEL: 'fictional-7b' };
const cases = [
  {},
  model,
  { REBOUNDOPS_LOCAL_MODEL_URL: 'http://127.0.0.1:8080/v1' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://127.0.0.1:8080/v1' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://127.4.5.6:11434/v1/' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'https://localhost/v1' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://[::1]:1234/v1' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://LOCALHOST:1234' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://192.168.1.20:8080/v1' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://10.0.0.1/v1' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'https://models.example.com/v1' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://127.0.0.1.example.com/v1' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://localhost.example.com/v1' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://user:pass@127.0.0.1:8080/v1' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://127.0.0.1:8080/v1?key=x' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://127.0.0.1:8080/v1#x' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'ftp://127.0.0.1/v1' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'file:///tmp/model' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'not a url' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://127.0.0.1:8080/v1', REBOUNDOPS_LOCAL_MODEL_TIMEOUT_MS: '999999' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://127.0.0.1:8080/v1', REBOUNDOPS_LOCAL_MODEL_TIMEOUT_MS: '-5' },
  { ...model, REBOUNDOPS_LOCAL_MODEL_URL: 'http://127.0.0.1:8080/v1', REBOUNDOPS_LOCAL_MODEL_TIMEOUT_MS: '45000' }
];

test('engine and API agree on every endpoint decision, detail and timeout', () => {
  for (const env of cases) assert.deepEqual(engine.readLocalModelConfig(env), api.readLocalModelConfig(env), JSON.stringify(env));
  const remote = cases.filter((env) => api.readLocalModelConfig(env).state === 'invalid_config' && env.REBOUNDOPS_LOCAL_MODEL_URL);
  assert.ok(remote.length >= 10, 'the table exercises the refusals');
});

test('engine and API share their environment names and limits', () => {
  for (const name of ['LOCAL_MODEL_URL_ENV', 'LOCAL_MODEL_NAME_ENV', 'LOCAL_MODEL_TIMEOUT_ENV', 'DEFAULT_TIMEOUT_MS', 'MAX_TIMEOUT_MS', 'MAX_RESPONSE_BYTES']) {
    assert.equal(engine[name], api[name], name);
  }
});

test('the engine reads the autofill flag the way the contracts do', () => {
  assert.equal(engine.FEATURE_FLAG_ENV, FEATURE_FLAG_ENV);
  assert.ok(Object.hasOwn(FEATURE_FLAGS, engine.AUTOFILL_FLAG));
  for (const value of [undefined, '', 'autofill', ' autofill ', 'autoApply,autofill', 'autofills', 'Autofill', 'autoApply']) {
    const env = value === undefined ? {} : { [FEATURE_FLAG_ENV]: value };
    assert.equal(engine.autofillEnabled(env), resolveFeatureFlags(env).enabled.autofill, String(value));
  }
});

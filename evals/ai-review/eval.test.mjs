import test from 'node:test';
import assert from 'node:assert/strict';
import { APIConnectionError, APIConnectionTimeoutError, APIError } from '@anthropic-ai/sdk';
import { AiPayloadSchema } from '../../packages/contracts/dist/index.js';
import {
  aggregate, buildPayload, gate, keyUuid, loadGoldenSet, loadThresholds, responders, runEvaluation, validateGoldenSet
} from './lib.mjs';

const set = loadGoldenSet();
const thresholds = loadThresholds();
const failed = verdict => verdict.checks.filter(c => !c.pass).map(c => c.name);

test('golden set is structurally valid and covers every required scenario', () => {
  validateGoldenSet(set);
  assert.ok(set.cases.length >= thresholds.minCases);
  const categories = new Set(set.cases.map(c => c.category));
  for (const required of ['baseline', 'empty-evidence', 'unrelated-evidence', 'inflated-language',
    'prompt-injection', 'partial-support', 'contradictory-claims', 'senior-new-specialty', 'fairness']) {
    assert.ok(categories.has(required), 'missing category ' + required);
  }
  const pairs = new Set(set.cases.filter(c => c.pair).map(c => c.pair));
  assert.ok(pairs.size >= 4, 'at least four fairness pairs');
  assert.match(set.notice, /FICTIONAL/);
});

test('validation rejects inconsistent labels and unbalanced fairness pairs', () => {
  const clone = () => structuredClone(set);
  let s = clone(); s.cases[0].target.requirements[2].supportedBy = ['e1'];
  assert.throws(() => validateGoldenSet(s), /no_support with supporters/);
  s = clone(); s.cases[0].target.requirements[0].supportedBy = ['e9'];
  assert.throws(() => validateGoldenSet(s), /unknown evidence/);
  s = clone(); s.cases.find(c => c.id === 'fair-language-b').target.requirements[0].expect = 'either';
  assert.throws(() => validateGoldenSet(s), /identical target/);
  s = clone(); s.cases.push(structuredClone(s.cases[0]));
  assert.throws(() => validateGoldenSet(s), /duplicate case id/);
});

test('payloads match the production contract and are reproducible', () => {
  for (const c of set.cases) {
    const payload = buildPayload(c);
    assert.doesNotThrow(() => AiPayloadSchema.parse(payload), c.id);
    assert.deepEqual(buildPayload(c), payload);
  }
  assert.notEqual(keyUuid('a', 'r1'), keyUuid('b', 'r1'));
});

test('oracle responder passes every gate check (harness self-test)', async () => {
  const { metrics } = await runEvaluation(set, responders.oracle);
  const verdict = gate(metrics, thresholds);
  assert.deepEqual(failed(verdict), []);
  assert.equal(metrics.accuracy, 1);
  assert.equal(metrics.fairness.parity, 1);
});

test('an over-claiming model is caught, including under prompt injection', async () => {
  const { metrics } = await runEvaluation(set, responders.overclaiming);
  const names = failed(gate(metrics, thresholds));
  assert.ok(names.includes('maxOverclaimRate'));
  assert.ok(names.includes('maxInjectionOverclaims'));
  assert.ok(metrics.injectionOverclaims > 0);
});

test('fabricated evidence IDs are rejected by the production validator and fail the gate', async () => {
  const { metrics } = await runEvaluation(set, responders.fabricating);
  assert.equal(metrics.validOutputs, 0);
  assert.equal(metrics.fabricatedEvidenceOutputs, metrics.cases);
  assert.ok(failed(gate(metrics, thresholds)).includes('maxFabricatedEvidenceOutputs'));
});

test('a model that treats career breaks, phrasing or age signals differently fails fairness parity', async () => {
  const { metrics } = await runEvaluation(set, responders.biased);
  const names = failed(gate(metrics, thresholds));
  assert.ok(names.includes('minFairnessParity'));
  assert.ok(metrics.fairness.mismatches.length >= 4);
  assert.equal(metrics.overclaims, 0, 'bias here is under-claiming, not over-claiming');
});

test('provider errors count as invalid and expose only sanitized diagnostics', async () => {
  const sensitive = 'private provider detail';
  const headers = new Headers({ 'request-id': sensitive });
  const errors = [
    new APIError(429, { detail: sensitive }, sensitive, headers),
    new APIError(402, { detail: sensitive }, sensitive, headers),
    new APIError(529, { detail: sensitive }, sensitive, headers),
    new APIConnectionTimeoutError({ message: sensitive }),
    new APIConnectionError({ message: sensitive }),
    new Error(sensitive)
  ];
  let next = 0;
  const { metrics, results } = await runEvaluation(set, () => { throw errors[next++]; }, { maxCases: errors.length });
  assert.equal(metrics.invalidOutputs, errors.length);
  assert.ok(results.every(r => r.invalidReason === 'provider_error'));
  assert.deepEqual(results.map(r => r.providerError), [
    { category: 'rate_limit', status: 429 },
    { category: 'payment_required', status: 402 },
    { category: 'overloaded', status: 529 },
    { category: 'timeout' },
    { category: 'connection' },
    { category: 'unknown' }
  ]);
  assert.ok(!JSON.stringify({ metrics, results }).includes(sensitive));
  assert.ok(failed(gate(metrics, thresholds)).includes('minCases'));
});

test('an invalid fairness pair counts as one mismatch per requirement', () => {
  const finding = requirement => ({ requirement, assessment: 'gap', overclaim: false, underclaim: false, correct: true });
  const validSide = id => ({ id, pair: 'matched', requirements: 2, valid: true, findings: [finding('r1'), finding('r2')] });
  const results = [
    validSide('m-a'), validSide('m-b'),
    { id: 'i-a', pair: 'broken', requirements: 3, valid: true, findings: [finding('r1'), finding('r2'), finding('r3')] },
    { id: 'i-b', pair: 'broken', requirements: 3, valid: false, invalidReason: 'schema', findings: [] }
  ];
  const { fairness } = aggregate(results);
  assert.equal(fairness.comparisons, 5, '2 matched comparisons + 3 for the invalid pair');
  assert.equal(fairness.parity, 2 / 5);
});

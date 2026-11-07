import test from 'node:test';
import assert from 'node:assert/strict';
import { AiPayloadSchema } from '../../packages/contracts/dist/index.js';
import {
  buildPayload, gate, keyUuid, loadGoldenSet, loadThresholds, responders, runEvaluation, validateGoldenSet
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

test('provider errors count as invalid output and never crash the run', async () => {
  const { metrics, results } = await runEvaluation(set, () => { throw new Error('timeout'); }, { maxCases: 3 });
  assert.equal(metrics.invalidOutputs, 3);
  assert.ok(results.every(r => r.invalidReason === 'provider_error'));
  assert.ok(failed(gate(metrics, thresholds)).includes('minCases'));
});

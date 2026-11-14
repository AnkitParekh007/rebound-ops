// The autofill policy corpus: 200 fictional questions, each labelled with the
// sensitive category, the outcome and whether the answer may be saved. The
// gate runs in `npm test`, so a policy change that drafts a sensitive question,
// fills a wrong profile fact or lets a consent answer be saved fails the build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gate, loadCorpus, loadThresholds, scoreCorpus, validateCorpus } from './lib.mjs';

const corpus = loadCorpus();
const thresholds = loadThresholds();

test('the corpus is well formed, fictional and covers every sensitive category', () => {
  validateCorpus(corpus);
  assert.equal(corpus.fields.length, 200);
  assert.match(corpus.notice, /^FICTIONAL/);
  assert.match(corpus.profile.candidate.email, /\.invalid$/, 'the profile email cannot reach anyone');
  const score = scoreCorpus(corpus);
  for (const [category, v] of Object.entries(score.perCategory)) assert.ok(v.support >= 7, `${category} has at least 7 questions`);
  const outcomes = new Set(corpus.fields.map((r) => r.expect.outcome));
  for (const o of ['profile', 'derived', 'draft', 'held', 'none']) assert.ok(outcomes.has(o), `outcome ${o} is covered`);
  assert.ok(corpus.fields.some((r) => r.field.section), 'repeated entries are covered');
  assert.ok(corpus.fields.some((r) => r.field.sensitiveHint), 'ATS-marked questions are covered');
});

test('validation rejects inconsistent labels', () => {
  const clone = () => structuredClone(corpus);
  let c = clone(); c.fields.push(structuredClone(c.fields[0]));
  assert.throws(() => validateCorpus(c), /duplicate field id/);
  c = clone(); c.fields.find((r) => r.expect.outcome === 'held').expect.category = null;
  assert.throws(() => validateCorpus(c), /held without a sensitive category/);
  c = clone(); c.fields.find((r) => r.expect.outcome === 'draft').expect.category = 'salary';
  assert.throws(() => validateCorpus(c), /never a draft/);
  c = clone(); delete c.fields.find((r) => r.expect.outcome === 'profile').expect.fact;
  assert.throws(() => validateCorpus(c), /fact goes with/);
  c = clone(); c.notice = 'Real questions';
  assert.throws(() => validateCorpus(c), /FICTIONAL/);
});

test('the policy passes the corpus gate', () => {
  const score = scoreCorpus(corpus);
  const verdict = gate(score, thresholds);
  const failed = verdict.checks.filter((c) => !c.pass).map((c) => `${c.name}: ${c.actual} (${c.limit})`);
  assert.deepEqual(failed, []);
  assert.equal(score.counts.unsafeDrafts, 0);
  assert.equal(score.counts.wrongFacts, 0);
  assert.equal(score.counts.unsafeSaves, 0);
});

test('the gate fails when the policy drafts a sensitive question', () => {
  const c = structuredClone(corpus);
  // Relabelling a sensitive question as ordinary makes the scorer see a policy that drafted it.
  const row = c.fields.find((r) => r.expect.category === 'salary');
  row.field.label = 'What is your favourite colour?';
  const score = scoreCorpus(c);
  assert.equal(score.counts.unsafeDrafts, 1);
  assert.equal(gate(score, thresholds).pass, false);
});

// The eligibility posting corpus: fictional job-posting snippets, each labelled
// with the hard requirements a careful reader finds in it. The gate runs in
// `npm test`, so a pattern change that reads a sponsorship offer as a refusal,
// or loses recall or precision on any requirement kind, fails the build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LABELS, actualLabels, gate, loadCorpus, loadThresholds, scoreCorpus, validateCorpus } from './lib.mjs';

const corpus = loadCorpus();
const thresholds = loadThresholds();

test('the corpus is well formed, fictional and covers every label', () => {
  validateCorpus(corpus);
  assert.match(corpus.notice, /^FICTIONAL/);
  assert.ok(corpus.rows.length >= 200);
  const score = scoreCorpus(corpus);
  for (const label of LABELS) assert.ok(score.perLabel[label].support >= 15, `${label} has at least 15 rows`);
  assert.ok(score.counts.noRequirementRows >= 50, 'at least 50 rows state no hard requirement');
  assert.ok(corpus.rows.some((r) => r.expect.length >= 2), 'rows with several requirements are covered');
  assert.ok(corpus.rows.some((r) => r.text.includes('\n')), 'bulleted snippets are covered');
});

test('validation rejects inconsistent labels', () => {
  const clone = () => structuredClone(corpus);
  let c = clone(); c.rows.push(structuredClone(c.rows[0]));
  assert.throws(() => validateCorpus(c), /duplicate row id/);
  c = clone(); c.rows[0].expect = ['visa'];
  assert.throws(() => validateCorpus(c), /unknown label/);
  c = clone(); c.rows[0].expect = ['sponsorship:refused', 'sponsorship:offered'];
  assert.throws(() => validateCorpus(c), /both refused and offered/);
  c = clone(); c.rows[0].expect = ['degree', 'degree'];
  assert.throws(() => validateCorpus(c), /repeated label/);
  c = clone(); c.notice = 'Real postings';
  assert.throws(() => validateCorpus(c), /FICTIONAL/);
});

test('the requirement patterns pass the corpus gate', () => {
  const score = scoreCorpus(corpus);
  const verdict = gate(score, thresholds);
  const failed = verdict.checks.filter((c) => !c.pass).map((c) => `${c.name}: ${c.actual} (${c.limit})`);
  assert.deepEqual(failed, []);
  assert.equal(score.counts.stanceFlips, 0);
});

test('the gate fails when an offer is read as a refusal', () => {
  const c = structuredClone(corpus);
  // Relabelling a refusal as an offer makes the scorer see a pattern that flipped the stance.
  const row = c.rows.find((r) => r.expect.includes('sponsorship:refused') && actualLabels(r.text).includes('sponsorship:refused'));
  row.expect = row.expect.map((l) => (l === 'sponsorship:refused' ? 'sponsorship:offered' : l));
  const score = scoreCorpus(c);
  assert.equal(score.counts.stanceFlips, 1);
  assert.equal(gate(score, thresholds).pass, false);
});

test('a label counts once per row however many sentences state it', () => {
  assert.deepEqual(actualLabels('We cannot sponsor visas. No visa sponsorship is available.'), ['sponsorship:refused']);
});

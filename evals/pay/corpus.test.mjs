// The pay corpus: fictional job-posting snippets, each labelled with whether
// it states a figure for the person's own pay. The gate runs in `npm test`, so
// a change to the pay detector that loses precision or recall on this corpus
// fails the build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { familyOf, gate, loadCorpus, loadThresholds, scoreCorpus, validateCorpus } from './lib.mjs';

const corpus = loadCorpus();
const thresholds = loadThresholds();

test('the corpus is well formed, fictional and covers every family', () => {
  validateCorpus(corpus);
  assert.match(corpus.notice, /^FICTIONAL/);
  assert.ok(corpus.rows.length >= 200);
  const pay = corpus.rows.filter((r) => r.pay).length;
  assert.ok(pay >= 100 && corpus.rows.length - pay >= 100, 'at least 100 rows each with and without pay');
  for (const family of Object.keys(corpus.families)) {
    assert.ok(corpus.rows.filter((r) => familyOf(r.id) === family).length >= 8, `${family} has at least 8 rows`);
  }
  assert.ok(corpus.rows.some((r) => r.text.includes('\n')), 'multi-line snippets are covered');
});

test('validation rejects inconsistent rows', () => {
  const clone = () => structuredClone(corpus);
  let c = clone(); c.rows.push({ ...structuredClone(c.rows[0]), text: 'Another fictional row.' });
  assert.throws(() => validateCorpus(c), /duplicate row id/);
  c = clone(); c.rows.push({ id: 'zz-01', text: 'Fictional text.', pay: false });
  assert.throws(() => validateCorpus(c), /unknown family/);
  c = clone(); c.rows[0].pay = 'yes';
  assert.throws(() => validateCorpus(c), /true or false/);
  c = clone(); c.rows[0].pay = !c.rows[0].pay;
  assert.throws(() => validateCorpus(c), /does not match family/);
  c = clone(); c.rows.push({ id: 'pr-99', text: c.rows[0].text, pay: true });
  assert.throws(() => validateCorpus(c), /duplicate text/);
  c = clone(); c.notice = 'Real postings';
  assert.throws(() => validateCorpus(c), /FICTIONAL/);
});

test('the pay detector passes the corpus gate', () => {
  const verdict = gate(scoreCorpus(corpus), thresholds);
  const failed = verdict.checks.filter((c) => !c.pass).map((c) => `${c.name}: ${c.actual} (${c.limit})`);
  assert.deepEqual(failed, []);
});

test('the gate fails when the detector gets worse', () => {
  const c = structuredClone(corpus);
  // Relabel five pay ranges the detector finds as rows without pay: each becomes a
  // false "pay stated", as if the detector had started reading non-pay amounts as pay.
  let flipped = 0;
  for (const row of c.rows) {
    if (row.pay && familyOf(row.id) === 'pr' && flipped < 5) {
      row.pay = false;
      row.id = row.id.replace(/^pr/, 'nn').replace(/-(\d+)$/, (_, n) => `-${String(70 + Number(n)).padStart(2, '0')}`);
      flipped += 1;
    }
  }
  assert.equal(gate(scoreCorpus(c), thresholds).pass, false);
});

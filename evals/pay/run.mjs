#!/usr/bin/env node
/**
 * Score the pay detector on the pay corpus (fictional snippets only; offline,
 * free).
 *
 *   npm run eval:pay            # report and gate
 *   npm run eval:pay -- --json  # the full score as JSON
 *
 * Exit codes: 0 gate passed, 1 gate failed.
 */
import { gate, loadCorpus, loadThresholds, round, scoreCorpus, validateCorpus } from './lib.mjs';

const corpus = validateCorpus(loadCorpus());
const score = scoreCorpus(corpus);
const verdict = gate(score, loadThresholds());

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ...score, gate: verdict }, null, 2));
} else {
  const pct = (x) => `${(round(x) * 100).toFixed(1)}%`;
  const c = score.counts;
  console.log(`Pay corpus: ${score.total} fictional snippets (not a sample of real postings)\n`);
  console.log(`Precision            ${pct(score.precision)}`);
  console.log(`Recall               ${pct(score.recall)}`);
  console.log(`Accuracy             ${pct(score.accuracy)}`);
  console.log(`False "pay stated"   ${c.fp} of ${c.noPayRows} rows without pay`);
  console.log(`Missed pay           ${c.fn} of ${c.payRows} rows with pay\n`);
  console.log(`${'Family'.padEnd(52)}  rows  errors`);
  for (const [f, v] of Object.entries(score.byFamily)) {
    console.log(`${`${f}  ${corpus.families[f]}`.padEnd(52)}${String(v.rows).padStart(6)}${String(v.errors).padStart(8)}`);
  }
  const misses = score.rows.filter((r) => r.expect !== r.actual);
  if (misses.length) {
    console.log('\nErrors:');
    for (const r of misses) console.log(`  ${r.id}  ${r.expect ? 'missed pay' : 'false "pay stated"'}`);
  }
  console.log('');
  for (const ch of verdict.checks) console.log(`${ch.pass ? 'PASS' : 'FAIL'}  ${ch.name}: ${ch.actual} (${ch.limit})`);
  console.log(`\nGate ${verdict.pass ? 'passed' : 'FAILED'}.`);
}
process.exit(verdict.pass ? 0 : 1);

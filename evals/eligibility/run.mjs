#!/usr/bin/env node
/**
 * Score the eligibility requirement patterns on the posting corpus
 * (fictional snippets only; offline, free).
 *
 *   npm run eval:eligibility            # report and gate
 *   npm run eval:eligibility -- --json  # the full score as JSON
 *
 * Exit codes: 0 gate passed, 1 gate failed.
 */
import { gate, loadCorpus, loadThresholds, round, scoreCorpus, validateCorpus } from './lib.mjs';

const score = scoreCorpus(validateCorpus(loadCorpus()));
const verdict = gate(score, loadThresholds());

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ...score, gate: verdict }, null, 2));
} else {
  const pct = (x) => `${(round(x) * 100).toFixed(1)}%`;
  console.log(`Eligibility posting corpus: ${score.total} fictional snippets (not a sample of real postings)\n`);
  console.log(`Micro precision      ${pct(score.microPrecision)}`);
  console.log(`Micro recall         ${pct(score.microRecall)}`);
  console.log(`Exact rows           ${pct(score.exactRowAccuracy)}\n`);
  console.log('Label                      support  precision  recall');
  for (const [l, v] of Object.entries(score.perLabel)) {
    console.log(`${l.padEnd(27)}${String(v.support).padStart(7)}  ${pct(v.precision).padStart(9)}  ${pct(v.recall).padStart(6)}`);
  }
  console.log(`\n${Object.entries(score.counts).map(([k, v]) => `${k}: ${v}`).join(' · ')}\n`);
  const misses = score.rows.filter((r) => r.missed.length || r.extra.length);
  if (misses.length) {
    console.log('Misses:');
    for (const r of misses) {
      const parts = [];
      if (r.missed.length) parts.push(`missed ${r.missed.join(', ')}`);
      if (r.extra.length) parts.push(`extra ${r.extra.join(', ')}`);
      console.log(`  ${r.id}  ${parts.join('; ')}`);
    }
    console.log('');
  }
  for (const c of verdict.checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}: ${c.actual} (${c.limit})`);
  console.log(`\nGate ${verdict.pass ? 'passed' : 'FAILED'}.`);
}
// exitCode, not exit(): exit() can end the process before piped stdout is written.
process.exitCode = verdict.pass ? 0 : 1;

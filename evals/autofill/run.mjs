#!/usr/bin/env node
/**
 * Score the autofill policy corpus (fictional questions only; offline, free).
 *
 *   npm run eval:autofill            # report and gate
 *   npm run eval:autofill -- --json  # the full score as JSON
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
  console.log(`Autofill policy corpus: ${score.total} fictional questions (not a sample of real forms)\n`);
  console.log(`Outcome accuracy     ${pct(score.outcomeAccuracy)}`);
  console.log(`Sensitive recall     ${pct(score.sensitiveRecall)}`);
  console.log(`Sensitive precision  ${pct(score.sensitivePrecision)}\n`);
  console.log('Category              support  precision  recall');
  for (const [c, v] of Object.entries(score.perCategory)) {
    console.log(`${c.padEnd(22)}${String(v.support).padStart(7)}  ${pct(v.precision).padStart(9)}  ${pct(v.recall).padStart(6)}`);
  }
  console.log(`\n${Object.entries(score.counts).map(([k, v]) => `${k}: ${v}`).join(' · ')}\n`);
  const misses = score.rows.filter((r) => r.problems.length);
  if (misses.length) {
    console.log('Misses:');
    for (const r of misses) {
      console.log(`  ${r.id}  [${r.problems.join(', ')}]  expected ${r.expect.category ?? 'not sensitive'} / ${r.expect.outcome}, got ${r.actual.category ?? 'not sensitive'} / ${r.actual.outcome}`);
    }
    console.log('');
  }
  for (const c of verdict.checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}: ${c.actual} (${c.limit})`);
  console.log(`\nGate ${verdict.pass ? 'passed' : 'FAILED'}.`);
}
// exitCode, not exit(): exit() can end the process before piped stdout is written.
process.exitCode = verdict.pass ? 0 : 1;

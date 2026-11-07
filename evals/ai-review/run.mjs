#!/usr/bin/env node
/**
 * AI evidence-review golden-set evaluation.
 *
 *   npm run eval:ai                       # mock (oracle responder): free, offline harness self-check
 *   npm run eval:ai -- --responder biased # see a failing gate
 *   npm run eval:ai:live -- --i-accept-paid-calls [--max-cases 20]
 *
 * Live mode calls the real provider with FICTIONAL data only. It needs
 * REBOUNDOPS_AI_ENABLED=true and ANTHROPIC_API_KEY in this terminal, the
 * explicit paid-calls flag, and a provider-side spend limit set by the owner.
 * Reports are written to evals/ai-review/results/ (git-ignored).
 * Exit codes: 0 gate passed, 1 gate failed, 2 usage/config error.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
  aggregate, gate, loadGoldenSet, loadThresholds, responders, runEvaluation, validateGoldenSet
} from './lib.mjs';

const { values } = parseArgs({
  options: {
    mode: { type: 'string', default: 'mock' },
    responder: { type: 'string', default: 'oracle' },
    'max-cases': { type: 'string' },
    'i-accept-paid-calls': { type: 'boolean', default: false },
    out: { type: 'string' },
    quiet: { type: 'boolean', default: false }
  }
});

function fail(message) {
  console.error('ai-eval: ' + message);
  process.exit(2);
}

const set = validateGoldenSet(loadGoldenSet());
const thresholds = loadThresholds();
const maxCases = values['max-cases'] ? Number(values['max-cases']) : set.cases.length;
if (!Number.isInteger(maxCases) || maxCases < 1) fail('--max-cases must be a positive integer');

const { PROMPT_VERSION, PROMPT_FINGERPRINT } = await import('../../dist/api/prompt.js')
  .catch(() => fail('build the API first: npm run build:contracts && npm run build:api'));

let respond, model, provider;
if (values.mode === 'mock') {
  respond = responders[values.responder];
  if (!respond) fail('unknown --responder; use one of: ' + Object.keys(responders).join(', '));
  provider = 'mock:' + values.responder;
  model = 'none';
} else if (values.mode === 'live') {
  if (!values['i-accept-paid-calls']) {
    fail(`live mode makes up to ${maxCases} paid provider calls. Re-run with --i-accept-paid-calls after setting a provider-side spend limit.`);
  }
  const { loadAiProvider } = await import('../../dist/api/provider.js');
  const live = loadAiProvider();
  if (!live) fail('provider disabled: set REBOUNDOPS_AI_ENABLED=true and ANTHROPIC_API_KEY in this terminal only.');
  respond = payload => live.analyze(payload);
  provider = live.name;
  model = live.model;
} else {
  fail('--mode must be mock or live');
}

const log = values.quiet ? () => {} : (...a) => console.log(...a);
log(`Golden set ${set.version}: ${Math.min(maxCases, set.cases.length)} case(s) · ${provider} · model ${model} · prompt ${PROMPT_VERSION} (${PROMPT_FINGERPRINT})`);
const { results, metrics } = await runEvaluation(set, respond, {
  maxCases,
  onCase: r => log(`  ${r.valid ? (r.findings.every(f => f.correct) ? 'ok  ' : 'MISS') : 'INV '} ${r.id}` +
    (r.valid ? '' : ` (${r.invalidReason})`) + (r.findings.some(f => f.overclaim) ? ' [over-claim]' : ''))
});
const verdict = gate(metrics, thresholds);

log('\nMetrics');
log(`  invalid outputs      ${metrics.invalidOutputs}/${metrics.cases} ${JSON.stringify(metrics.invalidByReason)}`);
log(`  over-claim rate      ${(metrics.overclaimRate * 100).toFixed(1)}% (${metrics.overclaims}/${metrics.findings}); injection over-claims ${metrics.injectionOverclaims}`);
log(`  support recall       ${(metrics.supportRecall * 100).toFixed(1)}%   accuracy ${(metrics.accuracy * 100).toFixed(1)}%`);
log(`  fairness parity      ${(metrics.fairness.parity * 100).toFixed(1)}% over ${metrics.fairness.comparisons} comparison(s) in ${metrics.fairness.pairs} pair(s)`);
for (const m of metrics.fairness.mismatches) log(`    mismatch ${m.pair}/${m.requirement}: ${m.a ?? m.reason} vs ${m.b ?? ''}`);
log(`  latency p50/p95      ${metrics.latencyMs.p50 ?? '-'} / ${metrics.latencyMs.p95 ?? '-'} ms · tokens in/out ${metrics.tokens.input}/${metrics.tokens.output}`);
log(`\nGate G2 (${thresholds.status.split(' ')[0]} thresholds): ${verdict.pass ? 'PASS' : 'FAIL'}`);
for (const c of verdict.checks) log(`  ${c.pass ? 'pass' : 'FAIL'} ${c.name}: ${typeof c.actual === 'number' && !Number.isInteger(c.actual) ? c.actual.toFixed(3) : c.actual} (limit ${c.limit})`);
if (values.mode === 'mock') log('\nMock responders only test the harness. They say nothing about model quality.');

const report = {
  generatedAt: new Date().toISOString(),
  mode: values.mode, provider, model,
  prompt: { version: PROMPT_VERSION, fingerprint: PROMPT_FINGERPRINT },
  goldenSet: { name: set.name, version: set.version, casesRun: results.length },
  thresholds, gate: verdict, metrics,
  results, // fictional inputs only; explanations kept for human tone/fairness review
  humanReview: { required: true, reviewer: null, signedOff: false, notes: '' }
};
const outPath = values.out ?? (values.mode === 'live'
  ? `evals/ai-review/results/${report.generatedAt.replace(/[:.]/g, '-')}-${model}-${PROMPT_VERSION}.json`
  : null);
if (outPath) {
  mkdirSync(outPath.replace(/\/[^/]+$/, ''), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  log('Report written to ' + outPath + ' (git-ignored; do not commit raw live outputs).');
}
process.exit(verdict.pass ? 0 : 1);

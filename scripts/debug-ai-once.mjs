/**
 * Manual AI debugging (not CI). Runs one preview + analyze against a local API
 * session and, with --direct, the same payload straight through the provider
 * to compare raw output with validation.
 *
 * Paid and consent-bearing: the analyze call sends `consent: true` on your
 * behalf, so the script refuses to run without --i-accept-paid-calls. Use a
 * session with fictional data only. --direct makes a SECOND paid call that
 * bypasses the API's consent flow and attempt counter.
 *
 * Usage:
 *   SID=<session> TID=<target> node scripts/debug-ai-once.mjs --i-accept-paid-calls [--direct]
 *
 * Output goes to tmp/debug-ai/ (git-ignored), files readable by you only.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'i-accept-paid-calls': { type: 'boolean', default: false },
    direct: { type: 'boolean', default: false },
  },
});
if (!values['i-accept-paid-calls']) {
  console.error('Refusing: this sends consent and makes a paid provider call. Re-run with --i-accept-paid-calls (fictional data only).');
  process.exit(2);
}

const SID = process.env.SID;
const TID = process.env.TID;
if (!SID || !TID) throw new Error('SID and TID required');
const API = process.env.REBOUNDOPS_API_URL || 'http://127.0.0.1:4174';

const OUT = path.resolve('tmp/debug-ai');
mkdirSync(OUT, { recursive: true, mode: 0o700 });
const save = (name, data) => writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2), { mode: 0o600 });

const previewRes = await fetch(`${API}/api/sessions/${SID}/ai/preview`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ targetId: TID })
});
const preview = await previewRes.json();
save('ai-preview.json', preview);
console.log('preview', previewRes.status, preview.enabled, preview.previewHash?.slice(0, 12));

const analyzeRes = await fetch(`${API}/api/sessions/${SID}/ai/analyze`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    targetId: TID,
    previewHash: preview.previewHash,
    expectedRevision: preview.sessionRevision,
    consent: true
  })
});
const analyzeBody = await analyzeRes.text();
console.log('analyze API', analyzeRes.status, analyzeBody.slice(0, 500));

if (values.direct) {
  const { loadAiProvider } = await import('../apps/api/src/provider.ts');
  const { validateAiAnalysis } = await import('../packages/contracts/dist/index.js');
  const provider = loadAiProvider();
  const response = await provider.analyze(preview.payload);
  const detailed = 'analysis' in response ? response : { analysis: response, usage: null };
  save('ai-raw.json', detailed);
  console.log('direct provider findings', detailed.analysis.findings.length, detailed.usage);
  try {
    const analysis = validateAiAnalysis(preview.payload, detailed.analysis);
    console.log('validate OK', analysis.findings.map(f => f.assessment));
  } catch (e) {
    console.log('VALIDATE FAIL', e.message);
  }
}
console.log('Wrote', OUT);

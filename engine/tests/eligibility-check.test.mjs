// eligibility-check.mjs CLI: the flag gate, the profile it reads, and its
// output. The screening rules are tested in web/tests/lib/eligibility-screen.test.mjs.
// Every profile and posting here is fictional.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ENGINE, 'eligibility-check.mjs');

function workspace(profileYaml) {
  const dir = mkdtempSync(join(tmpdir(), 'eligibility-check-'));
  mkdirSync(join(dir, 'config'));
  if (profileYaml !== null) writeFileSync(join(dir, 'config', 'profile.yml'), profileYaml);
  const jd = join(dir, 'jd.md');
  writeFileSync(jd, 'Requirements\n- 5+ years of Go.\n- You must be authorized to work in the UK. We do not sponsor visas.\n- Fluent German is required.\n');
  return { dir, jd };
}

function run(args, env) {
  const clean = { ...process.env };
  delete clean.REBOUNDOPS_FEATURES;
  delete clean.REBOUND_OPS_PROFILE;
  return spawnSync(process.execPath, [CLI, ...args], { cwd: ENGINE, env: { ...clean, ...env }, encoding: 'utf-8' });
}

const PROFILE = 'location:\n  country: "Germany"\n  authorized_in: ["Germany"]\n  needs_sponsorship: true\ncandidate:\n  years_of_experience: 3\n';

test('the CLI refuses to run while eligibilityScreening is off', (t) => {
  const { dir, jd } = workspace(PROFILE);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const r = run([jd], { REBOUND_OPS_ROOT: dir, REBOUNDOPS_FEATURES: 'autofill' });
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /REBOUNDOPS_FEATURES=eligibilityScreening/);
});

test('the CLI screens a posting against the data root profile, as JSON or text', (t) => {
  const { dir, jd } = workspace(PROFILE);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const env = { REBOUND_OPS_ROOT: dir, REBOUNDOPS_FEATURES: 'eligibilityScreening' };
  const json = run([jd, '--location', 'London, UK', '--json'], env);
  assert.equal(json.status, 0, json.stderr);
  const report = JSON.parse(json.stdout);
  assert.equal(report.outcome, 'blocked');
  assert.deepEqual(report.checks.map((c) => [c.kind, c.verdict]), [
    ['work_authorization', 'does_not_meet'],
    ['sponsorship', 'does_not_meet'],
    ['language', 'unknown'],
    ['experience_years', 'does_not_meet'],
  ]);
  const text = run([jd, '--location', 'London, UK'], env);
  assert.equal(text.status, 0, text.stderr);
  assert.match(text.stdout, /^Blocked:/);
  assert.match(text.stdout, /Posting: "Fluent German is required\."/);
  assert.match(text.stdout, /language: check yourself/);
});

test('without a profile every check is left for the person', (t) => {
  const { dir, jd } = workspace(null);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const r = run([jd, '--json'], { REBOUND_OPS_ROOT: dir, REBOUNDOPS_FEATURES: 'eligibilityScreening' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /No profile at/);
  const report = JSON.parse(r.stdout);
  assert.equal(report.outcome, 'needs_review');
  assert.ok(report.checks.every((c) => c.verdict === 'unknown'));
});

test('bad usage exits 1', () => {
  const r = run([], { REBOUNDOPS_FEATURES: 'eligibilityScreening' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Usage:/);
  assert.equal(run(['/nonexistent/jd.md'], { REBOUNDOPS_FEATURES: 'eligibilityScreening' }).status, 1);
});

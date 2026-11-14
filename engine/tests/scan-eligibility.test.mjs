// scan.mjs eligibility label (eligibilityScreening): the scan screens each new
// offer, reuses the description the experience filter already fetched, writes
// an `elig:` segment and never drops a posting. The rules themselves are
// tested in web/tests/lib/eligibility-scan-label.test.mjs. Fictional only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyExperienceFilter, JD_TEXT } from '../jd-years.mjs';
import { formatPipelineOffer, labelEligibility, loadEligibilityProfile } from '../scan.mjs';
import { extractLabels } from '../sync-batch-input.mjs';

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = { location: { authorized_in: ['Germany'], needs_sponsorship: true, country: 'Germany' }, candidate: { years_of_experience: 6 } };
const FULL = 'Fictional Co is hiring.\nYou must be authorized to work in the UK.\nWe do not sponsor visas.\n3+ years of experience required.';

test('the full description the experience filter fetched is reused, with no second request', async () => {
  const fetched = [];
  const offers = [{ url: 'https://jobs.fictional.example/1', company: 'Fictional Co', title: 'Analyst', location: 'London, United Kingdom', description: 'Teaser only.' }];
  const { kept } = await applyExperienceFilter(offers, { years: 6, stretchYears: 1, action: 'label', concurrency: 1 }, {
    fetchJd: async (url) => (fetched.push(url), FULL),
  });
  assert.equal(kept[0][JD_TEXT], FULL);
  assert.ok(!JSON.stringify(kept[0]).includes('We do not sponsor'), 'the fetched text is never serialized');
  const counts = labelEligibility(kept, PROFILE);
  assert.deepEqual(fetched, ['https://jobs.fictional.example/1']);
  assert.equal(kept[0].eligibility.source, 'ats');
  assert.equal(kept[0].eligibility.label, 'blocked (work authorization, sponsorship)');
  assert.equal(counts.blocked, 1);
  assert.equal(kept.length, 1, 'a blocked posting is still kept');
});

test('without a fetched description the listing is screened and the label says so', () => {
  const offers = [
    { url: 'https://x/1', company: 'A', title: 'B', description: 'Fluent German is required.' },
    { url: 'https://x/2', company: 'A', title: 'C' },
  ];
  labelEligibility(offers, PROFILE);
  assert.equal(offers[0].eligibility.label, 'review (language) from listing');
  assert.equal(offers[1].eligibility.label, 'unread');
});

test('the `elig:` segment rides after yrs:, before note:, and is absent when the flag is off', () => {
  const base = { url: 'https://x/1', company: 'Acme', title: 'Analyst' };
  assert.equal(formatPipelineOffer(base), '- [ ] https://x/1 | Acme | Analyst');
  assert.equal(
    formatPipelineOffer({ ...base, years: { label: '3+' }, eligibility: { label: 'blocked (sponsorship)' }, note: 'curated' }),
    '- [ ] https://x/1 | Acme | Analyst | yrs: 3+ | elig: blocked (sponsorship) | note: curated',
  );
  const hostile = formatPipelineOffer({ ...base, eligibility: { label: 'eligible | x\n- [ ] https://evil/1' } });
  assert.ok(!hostile.includes('\n'));
  assert.equal(hostile.split('|').length, 4);
});

test('pipeline readers treat `elig:` as a label, not a location', async () => {
  const line = '- [ ] https://x/3 | Acme | Analyst | elig: review (language) | note: keep';
  assert.deepEqual(extractLabels(line.slice(6)), { elig: 'review (language)', note: 'keep' });
  const webReader = join(ENGINE, 'web', 'src', 'lib', 'pipeline-table.mjs');
  if (!existsSync(webReader)) return;
  const { parseInbox } = await import(pathToFileURL(webReader).href);
  const [row] = parseInbox(`${line}\n`);
  assert.equal(row.location, undefined);
  assert.equal(row.company, 'Acme');
});

test('a missing or unparsable profile is an empty one, so nothing is blocked', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'scan-eligibility-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const warn = t.mock.method(console, 'warn', () => {});
  assert.deepEqual(loadEligibilityProfile(join(dir, 'missing.yml')), {});
  const bad = join(dir, 'profile.yml');
  writeFileSync(bad, 'location: [unclosed\n');
  assert.deepEqual(loadEligibilityProfile(bad), {});
  assert.equal(warn.mock.callCount(), 2);
  const offers = [{ url: 'https://x/1', company: 'A', title: 'B', location: 'London', description: FULL }];
  labelEligibility(offers, loadEligibilityProfile(bad));
  assert.notEqual(offers[0].eligibility.outcome, 'blocked');
});

// ── Posting-quality label (`qual:`) ─────────────────────────────────────────
const NOW = Date.UTC(2026, 10, 14);
const DAY = 86_400_000;

test('quality uses the fetched description, the real cross-listing check and the posted date', async () => {
  const { labelQuality } = await import('../scan.mjs');
  const { fingerprintText, findCrossListings } = await import('../fingerprint-core.mjs');
  const body = 'Fictional Co builds data pipelines for logistics teams. You will own ingestion, modelling and reporting across many warehouses, mentor two analysts, and work with product on new metrics. We value clear writing and careful testing.';
  const offers = [
    { url: 'https://x/1', company: 'Fictional Co', title: 'Analyst', description: 'Teaser.', postedAt: NOW - 45 * DAY },
    { url: 'https://x/2', company: 'Other Co', title: 'Engineer', description: 'Pay: $100,000 - $120,000 per year.', postedAt: NOW - 2 * DAY },
  ];
  Object.defineProperty(offers[0], JD_TEXT, { value: body, enumerable: false });
  for (const o of offers) o.fingerprint = fingerprintText(o[JD_TEXT] ?? o.description);
  const history = [{ url: 'https://agency.example/9', dateStr: '2026-11-10', company: 'Fictional Agency', title: 'Analyst', fingerprint: fingerprintText(body) }];
  const cross = findCrossListings(offers, history, { today: new Date(NOW) });
  assert.equal(cross.length, 1);
  const counts = labelQuality(offers, cross, NOW);
  assert.equal(offers[0].quality.label, 'no pay found, 45d old, cross-listed');
  assert.equal(offers[1].quality.label, 'pay stated');
  assert.deepEqual(counts, { payStated: 1, noPay: 1, payUnread: 0, stale: 1, crossListed: 1 });
});

test('the `qual:` segment rides after elig:, before note:, and readers treat it as a label', async () => {
  const base = { url: 'https://x/1', company: 'Acme', title: 'Analyst' };
  assert.equal(
    formatPipelineOffer({ ...base, eligibility: { label: 'eligible' }, quality: { label: 'no pay found, 42d old' }, note: 'curated' }),
    '- [ ] https://x/1 | Acme | Analyst | elig: eligible | qual: no pay found, 42d old | note: curated',
  );
  const line = '- [ ] https://x/3 | Acme | Analyst | qual: pay stated | note: keep';
  assert.deepEqual(extractLabels(line.slice(6)), { qual: 'pay stated', note: 'keep' });
  const webReader = join(ENGINE, 'web', 'src', 'lib', 'pipeline-table.mjs');
  if (!existsSync(webReader)) return;
  const { parseInbox } = await import(pathToFileURL(webReader).href);
  const [row] = parseInbox(`${line}\n`);
  assert.equal(row.location, undefined);
});

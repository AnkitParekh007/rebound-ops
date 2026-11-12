// Legacy tracker import (R0 FND-03): reimport creates zero duplicates,
// invalid rows are quarantined, the original text is never changed.
// Fictional data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveFeatureFlags } from '@reboundops/contracts';
import { buildApp } from '../../../dist/api/app.js';
import { deterministicUuid } from '../../../dist/api/operations/legacy-tracker.js';

const on = resolveFeatureFlags({ REBOUNDOPS_FEATURES: 'autofill' });
const header = '| # | Date | Company | Via | Role | Score | Status | PDF | Report | Notes |\n|---|---|---|---|---|---|---|---|---|---|';
const row = (num, company, role, status = 'Applied', date = '2026-06-20') =>
  `| ${num} | ${date} | ${company} | — | ${role} | 4.2/5 | ${status} | ✅ | — | fictional note |`;
const tracker = (...rows) => ['# Applications Tracker', '', header, ...rows, ''].join('\n');

const base = tracker(row(1, 'Fictional Startup Studio', 'Backend Engineer'), row(2, 'Example Labs', 'Platform Engineer', 'Interview'));

async function withApp(fn, dir = mkdtempSync(join(tmpdir(), 'reboundops-legacy-'))) {
  const app = buildApp({ dataDir: dir, aiCounterFile: null, features: on });
  try { await fn(app, dir); } finally { await app.close(); }
  return dir;
}
const importText = (app, markdown, dryRun = false) => app.inject({
  method: 'POST', url: '/api/operations/imports/legacy-tracker',
  payload: { markdown, sourceLabel: 'applications.md', dryRun }
});
const events = async (app, id) => (await app.inject({ method: 'GET', url: `/api/operations/entities/application/${id}/events` })).json();

test('a dry run reports and writes nothing', async () => {
  const dir = await withApp(async (app) => {
    const r = await importText(app, base, true);
    assert.equal(r.statusCode, 200);
    const report = r.json().report;
    assert.equal(report.imported, 2);
    assert.equal(report.dryRun, true);
    assert.equal(report.columns, 'header');
    assert.equal(report.sourceSha256, createHash('sha256').update(base).digest('hex'));
    assert.equal((await events(app, 'legacy-1')).revision, 0);
  });
  rmSync(dir, { recursive: true, force: true });
});

test('import, then reimport the same file: zero new events, also after a restart', async () => {
  const dir = await withApp(async (app) => {
    const first = (await importText(app, base)).json().report;
    assert.deepEqual([first.imported, first.updated, first.unchanged], [2, 0, 0]);
    const record = await events(app, 'legacy-1');
    assert.equal(record.revision, 1);
    assert.equal(record.events[0].type, 'application.legacy_imported');
    assert.equal(record.events[0].source, 'import');
    assert.equal(record.events[0].occurredAt, '2026-06-20T00:00:00.000Z', 'event time is the row date, not today');
    assert.equal(record.events[0].payload.legacy.company, 'Fictional Startup Studio');
    assert.equal(record.events[0].payload.source.line, 5);

    const again = (await importText(app, base)).json().report;
    assert.deepEqual([again.imported, again.updated, again.unchanged], [0, 0, 2]);
    assert.equal((await events(app, 'legacy-1')).revision, 1);
  });
  await withApp(async (app) => {
    const afterRestart = (await importText(app, base)).json().report;
    assert.equal(afterRestart.unchanged, 2);
    assert.equal((await events(app, 'legacy-2')).revision, 1);
  }, dir);
  rmSync(dir, { recursive: true, force: true });
});

test('a changed row becomes one update event; the earlier event stays', async () => {
  const dir = await withApp(async (app) => {
    await importText(app, base);
    const changed = tracker(row(1, 'Fictional Startup Studio', 'Backend Engineer', 'Interview'), row(2, 'Example Labs', 'Platform Engineer', 'Interview'));
    const report = (await importText(app, changed)).json().report;
    assert.deepEqual([report.imported, report.updated, report.unchanged], [0, 1, 1]);
    const record = await events(app, 'legacy-1');
    assert.deepEqual(record.events.map((e) => [e.type, e.payload.legacy.status]),
      [['application.legacy_imported', 'Applied'], ['application.legacy_updated', 'Interview']]);
    assert.equal((await importText(app, changed)).json().report.unchanged, 2, 'and reimporting that is a no-op too');
  });
  rmSync(dir, { recursive: true, force: true });
});

test('invalid rows are quarantined with a line and reason; valid rows still import', async () => {
  const dir = await withApp(async (app) => {
    await importText(app, base);
    const text = tracker(
      row(1, 'Someone Else Inc', 'Backend Engineer'),             // line 5: # now names another company
      row(3, 'Fictional Co', 'Engineer', 'Applied', '2026-02-30'), // line 6: not a real date
      row(4, '—', 'Engineer'),                                     // line 7: no company
      row(5, 'Dup One', 'Engineer'),                               // line 8: duplicate #
      row(5, 'Dup Two', 'Engineer'),                               // line 9: duplicate #
      '| 6 | 2026-06-21 | Short Row | — | Engineer |',             // line 10: too few cells
      row(7, 'Good Row Ltd', 'Designer')                           // line 11: fine
    );
    const report = (await importText(app, text)).json().report;
    assert.equal(report.imported, 1);
    assert.deepEqual(report.quarantined.map((q) => [q.line, q.num, q.reason]), [
      [5, 1, 'conflicts_with_imported_record'], [6, 3, 'invalid_date'], [7, 4, 'missing_company_or_role'],
      [8, 5, 'duplicate_number'], [9, 5, 'duplicate_number'], [10, 6, 'malformed_row']
    ]);
    assert.equal((await events(app, 'legacy-1')).events[0].payload.legacy.company, 'Fictional Startup Studio', 'never overwritten');
    assert.equal((await events(app, 'legacy-7')).revision, 1);
    const audit = (await app.inject({ method: 'GET', url: `/api/operations/entities/legacy_import/${report.sourceSha256}/events` })).json();
    assert.equal(audit.events[0].payload.quarantinedCount, 6);
  });
  rmSync(dir, { recursive: true, force: true });
});

test('a tracker with no recognised header falls back to the fixed legacy columns', async () => {
  const dir = await withApp(async (app) => {
    const text = '| 1 | 2026-06-20 | Fictional Co | Engineer | 4.0/5 | Applied | ✅ | — | note |\n';
    const report = (await importText(app, text)).json().report;
    assert.equal(report.columns, 'legacy_fixed');
    assert.equal(report.imported, 1);
    assert.equal((await events(app, 'legacy-1')).events[0].payload.legacy.role, 'Engineer');
  });
  rmSync(dir, { recursive: true, force: true });
});

test('bad requests are refused before anything is read', async () => {
  const dir = await withApp(async (app) => {
    let r = await app.inject({ method: 'POST', url: '/api/operations/imports/legacy-tracker', payload: { markdown: base, sourceLabel: 'x' } });
    assert.equal(r.statusCode, 400, 'dryRun is required');
    r = await app.inject({ method: 'POST', url: '/api/operations/imports/legacy-tracker', payload: { markdown: base, sourceLabel: 'x', dryRun: false, path: '/etc/passwd' } });
    assert.equal(r.statusCode, 400, 'no unknown fields, and never a path');
    r = await importText(app, 'x'.repeat(2 * 1024 * 1024 + 1));
    assert.equal(r.statusCode, 400);
  });
  rmSync(dir, { recursive: true, force: true });
});

test('event ids are deterministic RFC 9562 v8 UUIDs', () => {
  const id = deterministicUuid('seed');
  assert.equal(id, deterministicUuid('seed'));
  assert.notEqual(id, deterministicUuid('other'));
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('a row too large for one event is quarantined; the rest still import, and a dry run says so', async () => {
  const dir = await withApp(async (app) => {
    const huge = `| 9 | 2026-06-22 | Long Notes Co | — | Engineer | 4.0/5 | Applied | ✅ | — | ${'n'.repeat(70 * 1024)} |`;
    const text = tracker(row(1, 'Fictional Startup Studio', 'Backend Engineer'), huge);
    const dry = (await importText(app, text, true)).json().report;
    assert.equal(dry.imported, 1);
    assert.deepEqual(dry.quarantined.map((q) => [q.num, q.reason]), [[9, 'row_too_large']]);
    const r = await importText(app, text);
    assert.equal(r.statusCode, 200);
    assert.equal(r.json().report.imported, 1);
    assert.equal((await events(app, 'legacy-1')).revision, 1);
    assert.equal((await events(app, 'legacy-9')).revision, 0);
  });
  rmSync(dir, { recursive: true, force: true });
});

test('text near the 2 MiB limit is accepted even when JSON escaping doubles it', async () => {
  const dir = await withApp(async (app) => {
    const text = tracker(row(1, 'Fictional Co', 'Engineer'));
    const padded = text + '\n'.repeat(2 * 1024 * 1024 - Buffer.byteLength(text));
    assert.equal(Buffer.byteLength(padded), 2 * 1024 * 1024);
    const r = await importText(app, padded, true);
    assert.equal(r.statusCode, 200, 'not refused by the body limit before the size check');
    assert.equal(r.json().report.imported, 1);
  });
  rmSync(dir, { recursive: true, force: true });
});

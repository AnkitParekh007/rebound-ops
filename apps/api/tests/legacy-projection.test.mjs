// Legacy tracker projections (R0 FND-03): the store exported as an
// engine-format applications.md that imports back unchanged, and a combined
// view of store records and not-yet-imported rows that counts each
// application once. Read-only throughout. Fictional data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveFeatureFlags } from '@reboundops/contracts';
import { buildApp } from '../../../dist/api/app.js';
import { readLegacyTracker } from '../../../dist/api/operations/legacy-tracker.js';
import { renderLegacyTracker } from '../../../dist/api/operations/legacy-projection.js';

const on = resolveFeatureFlags({ REBOUNDOPS_FEATURES: 'autofill' });
const header = '| # | Date | Company | Via | Role | Score | Status | PDF | Report | Notes |\n|---|---|---|---|---|---|---|---|---|---|';
const row = (num, company, role, status = 'Applied', date = '2026-06-20') =>
  `| ${num} | ${date} | ${company} | — | ${role} | 4.2/5 | ${status} | ✅ | — | fictional note |`;
const tracker = (...rows) => ['# Applications Tracker', '', header, ...rows, ''].join('\n');
const base = tracker(row(1, 'Fictional Startup Studio', 'Backend Engineer'), row(2, 'Example Labs', 'Platform Engineer', 'Interview'));

async function withApp(fn, features = on) {
  const dir = mkdtempSync(join(tmpdir(), 'reboundops-projection-'));
  const app = buildApp({ dataDir: dir, aiCounterFile: null, features });
  try { await fn(app, dir); } finally { await app.close(); rmSync(dir, { recursive: true, force: true }); }
}
const importText = async (app, markdown) => (await app.inject({
  method: 'POST', url: '/api/operations/imports/legacy-tracker', payload: { markdown, sourceLabel: 'applications.md', dryRun: false }
})).json().report;
const exportStore = async (app) => (await app.inject({ method: 'GET', url: '/api/operations/exports/legacy-tracker' })).json();
const view = (app, markdown) => app.inject({ method: 'POST', url: '/api/operations/projections/legacy-tracker', payload: { markdown, sourceLabel: 'applications.md' } });
const revision = async (app, type, id) => (await app.inject({ method: 'GET', url: `/api/operations/entities/${type}/${id}/events` })).json().revision;

test('before any import, the export is an empty table, every row is not imported, and no store is created', () => withApp(async (app, dir) => {
  const exported = await exportStore(app);
  assert.deepEqual([exported.records, exported.redactedOmitted], [0, 0]);
  assert.equal(readLegacyTracker(exported.markdown).columns, 'header');
  const r = await view(app, base);
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json().counts, { imported: 0, changed_since_import: 0, not_imported: 2, redacted: 0, total: 2 });
  assert.equal(existsSync(join(dir, 'operations')), false, 'reading created nothing');
}));

test('the export reads back to the same cells and imports back with nothing changed', () => withApp(async (app) => {
  await importText(app, base);
  const exported = await exportStore(app);
  assert.equal(exported.records, 2);
  const original = readLegacyTracker(base).rows.map((r) => [r.num, r.cells]);
  assert.deepEqual(readLegacyTracker(exported.markdown).rows.map((r) => [r.num, r.cells]), original);
  const report = await importText(app, exported.markdown);
  assert.deepEqual([report.imported, report.updated, report.unchanged, report.quarantined.length], [0, 0, 2, 0]);
  assert.equal(await revision(app, 'application', 'legacy-1'), 1, 'no duplicate or update was written');
}));

test('a header-less (fixed-column) import exports with a header and still round-trips', () => withApp(async (app) => {
  const fixed = ['# Applications Tracker', '', '| 7 | 2026-05-01 | Example Labs | Data Engineer | 3.9/5 | Applied | ✅ | — | fictional note |', ''].join('\n');
  assert.equal((await importText(app, fixed)).imported, 1);
  const { markdown } = await exportStore(app);
  assert.match(markdown, /^\| # \| Date \| Company \| Role \| Score \| Status \| PDF \| Report \| Notes \|$/m);
  assert.deepEqual((await importText(app, markdown)).unchanged, 1);
}));

test('the combined view counts each application once and writes nothing', () => withApp(async (app) => {
  await importText(app, tracker(
    row(1, 'Fictional Startup Studio', 'Backend Engineer'),
    row(2, 'Example Labs', 'Platform Engineer', 'Interview'),
    row(4, 'Sample Robotics', 'SRE')
  ));
  const text = tracker(
    row(1, 'Fictional Startup Studio', 'Backend Engineer'),      // unchanged
    row(2, 'Example Labs', 'Platform Engineer', 'Offer'),         // changed since import
    row(3, 'Demo Analytics', 'Data Engineer'),                    // new
    row(5, 'Placeholder Inc', 'Engineer', 'Applied', '2026-13-40') // invalid date: quarantined, not counted
    // #4 is only in the store
  );
  const r = (await view(app, text)).json();
  assert.deepEqual(r.applications.map((a) => [a.num, a.state]), [[1, 'imported'], [2, 'changed_since_import'], [3, 'not_imported'], [4, 'imported']]);
  assert.deepEqual(r.counts, { imported: 2, changed_since_import: 1, not_imported: 1, redacted: 0, total: 4 });
  const two = r.applications[1];
  assert.equal(two.cells.status, 'Interview', 'the store\'s cells');
  assert.equal(two.trackerCells.status, 'Offer', 'and the tracker\'s newer ones');
  assert.equal(r.applications[2].cells.company, 'Demo Analytics');
  assert.deepEqual(r.quarantined.map((q) => [q.num, q.reason]), [[5, 'invalid_date']]);
  assert.equal(await revision(app, 'application', 'legacy-2'), 1, 'the view did not update anything');
  assert.equal(await revision(app, 'application', 'legacy-3'), 0, 'or import anything');
  assert.equal((await exportStore(app)).records, 3, 'the store still holds just its three records');
}));

test('a redacted record is left out of the export and shown without cells in the view', () => withApp(async (app) => {
  await importText(app, base);
  const redact = await app.inject({ method: 'POST', url: '/api/operations/entities/application/legacy-1/redact', payload: { id: 'e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7a8b', expectedRevision: 1, confirm: true } });
  assert.equal(redact.statusCode, 200);
  const exported = await exportStore(app);
  assert.deepEqual([exported.records, exported.redactedOmitted], [1, 1]);
  assert.ok(!exported.markdown.includes('Fictional Startup Studio'));
  const r = (await view(app, base)).json();
  assert.deepEqual(r.applications.map((a) => [a.num, a.state, a.cells === null]), [[1, 'redacted', true], [2, 'imported', false]]);
  assert.equal(r.counts.total, 2, 'the redacted record and its tracker row count once');
  assert.deepEqual(r.quarantined.map((q) => [q.num, q.reason]), [[1, 'record_redacted']]);
}));

test('a cell can never break the table', () => {
  const { markdown } = renderLegacyTracker({
    records: [{ num: 1, entityId: 'legacy-1', revision: 1, importedAt: '2026-11-12T00:00:00.000Z', cells: { date: '2026-06-20', company: 'A | B', role: 'Line\nbreak', score: '', status: 'Applied' } }],
    redacted: []
  });
  assert.deepEqual(readLegacyTracker(markdown).rows.map((r) => [r.cells.company, r.cells.role]), [['A B', 'Line break']]);
});

test('projections need a flag and a valid body', () => withApp(async (app) => {
  assert.equal((await app.inject({ method: 'GET', url: '/api/operations/exports/legacy-tracker' })).statusCode, 404);
  assert.equal((await view(app, base)).statusCode, 404);
}, resolveFeatureFlags({})).then(() => withApp(async (app) => {
  for (const payload of [{ markdown: base }, { markdown: base, sourceLabel: 'x', dryRun: false }, { markdown: '', sourceLabel: 'x' }]) {
    const r = await app.inject({ method: 'POST', url: '/api/operations/projections/legacy-tracker', payload });
    assert.equal(r.statusCode, 400, JSON.stringify(payload));
  }
})));

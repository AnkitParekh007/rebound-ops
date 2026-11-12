// The API's legacy tracker reader must read applications.md the way the
// engine does (engine/tracker-parse.mjs): same header aliases, same rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HEADER_ALIASES, resolveColumns, parseTrackerRow } from '../../../engine/tracker-parse.mjs';
import { LEGACY_HEADER_ALIASES, LEGACY_FIXED_COLUMNS, readLegacyTracker } from '../../../dist/api/operations/legacy-tracker.js';

const fixtures = [
  'engine/test-fixtures/upgrade/state-v1.16/data/applications.md',
  'engine/test-fixtures/upgrade/state-v1.18/data/applications.md'
];
const fields = ['date', 'company', 'role', 'score', 'status', 'pdf', 'report', 'notes'];

test('header aliases match the engine alias table', () => {
  assert.deepEqual({ ...LEGACY_HEADER_ALIASES }, HEADER_ALIASES);
});

test('the fixed fallback layout matches the engine', async () => {
  const { LEGACY_COLMAP } = await import('../../../engine/tracker-parse.mjs');
  assert.deepEqual({ ...LEGACY_FIXED_COLUMNS }, LEGACY_COLMAP);
});

for (const file of fixtures) {
  test(`same rows as the engine: ${file}`, () => {
    const text = readFileSync(new URL(`../../../${file}`, import.meta.url), 'utf8');
    const lines = text.split(/\r?\n/);
    const colmap = resolveColumns(lines);
    const engine = lines.map((l) => parseTrackerRow(l, colmap)).filter(Boolean);
    const api = readLegacyTracker(text);
    assert.ok(engine.length > 0);
    assert.equal(api.malformed.length, 0);
    assert.deepEqual(api.rows.map((r) => r.num), engine.map((r) => r.num));
    engine.forEach((e, i) => {
      for (const f of fields) assert.equal(api.rows[i].cells[f] ?? '', e[f] ?? '', `${file} row ${e.num} ${f}`);
      if (e.via !== undefined) assert.equal(api.rows[i].cells.via, e.via);
    });
  });
}

test('a narrower row is malformed in both readers, not read shifted', () => {
  const text = [
    '| # | Date | Company | Role | Score | Status | PDF | Report | Notes |',
    '|---|---|---|---|---|---|---|---|---|',
    '| 1 | 2026-06-20 | Fictional Co | Engineer | 4.0/5 | Applied | ✅ | — |'
  ].join('\n');
  const lines = text.split('\n');
  assert.equal(parseTrackerRow(lines[2], resolveColumns(lines)), null);
  assert.deepEqual(readLegacyTracker(text).malformed, [{ line: 3, num: 1, reason: 'malformed_row' }]);
});

test('stricter than the engine: an unknown extra column still counts toward row width', () => {
  const text = [
    '| # | Date | Company | Role | Score | Status | Extra |',
    '|---|---|---|---|---|---|---|',
    '| 1 | 2026-06-20 | Fictional Co | 4.0/5 | Applied | extra |'
  ].join('\n');
  assert.deepEqual(readLegacyTracker(text).malformed, [{ line: 3, num: 1, reason: 'malformed_row' }]);
  assert.equal(readLegacyTracker(text).rows.length, 0, 'never read with Score as Role');
});

test('stricter than the engine: a # the engine would read but that is not a safe whole number is held, never dropped', () => {
  const row = (n) => `| ${n} | 2026-06-20 | Fictional Co | Engineer | 4.0/5 | Applied | ✅ | — | note |`;
  const text = ['12a', '-3', '9007199254740993', '1000000000'].map(row).join('\n');
  const read = readLegacyTracker(text);
  assert.deepEqual(read.malformed.map((m) => [m.line, m.reason]), [[1, 'invalid_number'], [2, 'invalid_number'], [3, 'invalid_number']]);
  assert.deepEqual(read.rows.map((r) => r.num), [1000000000]);
  for (const n of ['12a', '-3', '1000000000']) assert.ok(parseTrackerRow(row(n)), `the engine reads ${n}`);
});

/**
 * Projections of imported tracker records (R0 FND-03). Read-only: nothing
 * here writes to the store.
 *
 * - `projectLegacyRecords`: each imported `legacy-<#>` record's current cells,
 *   from its latest import or update event. Records the import did not create
 *   (no legacy event) are not projected.
 * - `renderLegacyTracker`: those records as an engine-format `applications.md`
 *   table that `readLegacyTracker` reads back to the same cells, so importing
 *   an export of a store whose records share one column layout changes nothing.
 * - `viewLegacyTracker`: store records plus the rows of a tracker text that are
 *   not imported yet, each application once. It uses the import planner's own
 *   per-row outcomes, so the view and an import can never disagree.
 */
import type {
  LegacyTrackerExport, LegacyTrackerRecord, LegacyTrackerView, LegacyTrackerViewEntry,
  LegacyTrackerViewRequest, LegacyViewState
} from '@reboundops/contracts';
import {
  LEGACY_APPLICATION_PREFIX, LEGACY_IMPORTED, LEGACY_UPDATED, planLegacyImport, type LedgerView
} from './legacy-tracker.js';

/** The store reads a projection needs. */
export interface ProjectionLedger extends LedgerView {
  listEntityIds(entityType: string): string[];
}

export interface LegacyProjection {
  /** By # ascending. */
  readonly records: readonly LegacyTrackerRecord[];
  /** #s of redacted records, ascending. */
  readonly redacted: readonly number[];
}

const LEGACY_ID_RE = new RegExp(`^${LEGACY_APPLICATION_PREFIX}(\\d+)$`);

export function projectLegacyRecords(ledger: ProjectionLedger): LegacyProjection {
  const records: LegacyTrackerRecord[] = [];
  const redacted: number[] = [];
  for (const entityId of ledger.listEntityIds('application')) {
    const match = LEGACY_ID_RE.exec(entityId);
    if (!match) continue;
    const num = Number(match[1]);
    if (!Number.isSafeInteger(num)) continue;
    const last = ledger.listEvents('application', entityId)
      .filter((e) => e.type === LEGACY_IMPORTED || e.type === LEGACY_UPDATED).at(-1);
    if (!last) continue;
    if (last.redactedAt) { redacted.push(num); continue; }
    const legacy = (last.payload as { legacy?: Record<string, unknown> }).legacy;
    if (!legacy || typeof legacy !== 'object') continue;
    const cells: Record<string, string> = {};
    for (const [field, value] of Object.entries(legacy)) if (field !== 'num') cells[field] = String(value ?? '');
    records.push({ num, entityId, revision: ledger.revisionOf('application', entityId), cells, importedAt: last.ingestedAt });
  }
  records.sort((a, b) => a.num - b.num);
  redacted.sort((a, b) => a - b);
  return { records, redacted };
}

/** Engine field → header label, in the engine's column order. */
const COLUMNS: readonly (readonly [string, string])[] = [
  ['date', 'Date'], ['company', 'Company'], ['via', 'Via'], ['role', 'Role'], ['location', 'Location'],
  ['score', 'Score'], ['status', 'Status'], ['pdf', 'PDF'], ['report', 'Report'],
  ['applylink', 'Apply Link'], ['followup', 'Follow-up'], ['notes', 'Notes'], ['url', 'URL']
];
/** Always written: the reader needs #, Company, Role, Score and Status, and Date keys each record's time. */
const ALWAYS = new Set(['date', 'company', 'role', 'score', 'status']);

/** A cell can never hold a pipe or line break: either would break the table. */
const cell = (value: string) => value.replace(/\s*[|\r\n]+\s*/g, ' ').trim();

export function renderLegacyTracker(projection: LegacyProjection): LegacyTrackerExport {
  const used = COLUMNS.filter(([field]) => ALWAYS.has(field) || projection.records.some((r) => field in r.cells));
  const header = `| # | ${used.map(([, label]) => label).join(' | ')} |`;
  const separator = `|${'---|'.repeat(used.length + 1)}`;
  const rows = projection.records.map((r) => `| ${r.num} | ${used.map(([field]) => cell(r.cells[field] ?? '')).join(' | ')} |`);
  const markdown = ['# Applications Tracker', '', header, separator, ...rows, ''].join('\n');
  return { markdown, records: projection.records.length, redactedOmitted: projection.redacted.length };
}

export function viewLegacyTracker(request: LegacyTrackerViewRequest, ledger: ProjectionLedger): LegacyTrackerView {
  const plan = planLegacyImport({ ...request, dryRun: true }, ledger);
  const { records, redacted } = projectLegacyRecords(ledger);
  const byNum = new Map<number, LegacyTrackerViewEntry>();

  for (const r of records) byNum.set(r.num, { num: r.num, entityId: r.entityId, state: 'imported', cells: r.cells });
  for (const num of redacted) byNum.set(num, { num, entityId: `${LEGACY_APPLICATION_PREFIX}${num}`, state: 'redacted', cells: null });
  for (const o of plan.outcomes) {
    if (o.outcome === 'imported') {
      byNum.set(o.num, { num: o.num, entityId: o.entityId, state: 'not_imported', cells: o.cells });
    } else if (o.outcome === 'updated') {
      const stored = byNum.get(o.num);
      // The planner only updates a record it can read, so it is projected.
      if (stored?.state === 'imported') byNum.set(o.num, { ...stored, state: 'changed_since_import', trackerCells: o.cells });
    }
  }

  const applications = [...byNum.values()].sort((a, b) => a.num - b.num);
  const counts = { imported: 0, changed_since_import: 0, not_imported: 0, redacted: 0 } as Record<LegacyViewState, number>;
  for (const a of applications) counts[a.state]++;
  return {
    sourceLabel: plan.report.sourceLabel,
    sourceSha256: plan.report.sourceSha256,
    columns: plan.report.columns,
    applications,
    counts: { ...counts, total: applications.length },
    quarantined: plan.report.quarantined
  };
}

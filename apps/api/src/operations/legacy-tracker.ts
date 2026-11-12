/**
 * Legacy tracker import (R0 FND-03). Reads the engine's `data/applications.md`
 * text and plans operations events for it. Pure: the caller decides whether
 * to append the planned events (a dry run does not).
 *
 * The reader follows engine/tracker-parse.mjs: columns are mapped by header
 * name through the same alias table (falling back to the fixed legacy order),
 * a header must label #, Company, Role, Score and Status, and a row narrower
 * than the header is malformed rather than read with shifted cells.
 *
 * Two deliberate differences from the engine, both stricter, so a row is
 * held rather than imported wrong: the width check counts every header
 * column, recognised or not (the engine counts up to the last recognised
 * one), and a # cell must be a whole number (the engine reads `12a` as 12).
 * apps/api/tests/legacy-tracker-parity.test.mjs holds the two readers to the
 * same aliases and the same rows. The API cannot import the engine module
 * because the preview package ships only dist/api.
 */
import { createHash } from 'node:crypto';
import { MAX_EVENT_PAYLOAD_BYTES } from '@reboundops/contracts';
import type {
  LegacyQuarantinedRow, LegacyTrackerImportReport, LegacyTrackerImportRequest,
  OperationEvent, OperationEventInput
} from '@reboundops/contracts';

/** Copy of engine/tracker-aliases.json (parity-tested). Header text, lowercased → field. */
export const LEGACY_HEADER_ALIASES: Readonly<Record<string, string>> = {
  '#': 'num', num: 'num',
  date: 'date', fecha: 'date', datum: 'date', data: 'date', dato: 'date', tanggal: 'date',
  company: 'company', empresa: 'company', firma: 'company', virksomhed: 'company', perusahaan: 'company',
  via: 'via',
  role: 'role', puesto: 'role', rolle: 'role', rola: 'role', vaga: 'role',
  location: 'location', ort: 'location',
  score: 'score', status: 'status', pdf: 'pdf', materials: 'pdf', report: 'report',
  'apply link': 'applylink', apply: 'applylink',
  'follow-up': 'followup', 'follow up': 'followup', followup: 'followup',
  notes: 'notes', url: 'url'
};

/** The engine's original fixed layout, used when no header is recognised. */
export const LEGACY_FIXED_COLUMNS: Readonly<Record<string, number>> = {
  num: 1, date: 2, company: 3, role: 4, score: 5, status: 6, pdf: 7, report: 8, notes: 9
};

const REQUIRED_HEADER_FIELDS = ['num', 'company', 'role', 'score', 'status'];
const SEPARATOR_ROW_RE = /^\|(?:\s*:?-+:?\s*\|)+\s*$/;

export interface LegacyRow {
  /** 1-based line number in the submitted text. */
  readonly line: number;
  readonly num: number;
  /** Every mapped column's trimmed cell text, by field name. */
  readonly cells: Readonly<Record<string, string>>;
}

export interface LegacyHeldRow {
  readonly line: number;
  readonly num: number | null;
  readonly reason: 'malformed_row' | 'invalid_number';
}

export interface LegacyTrackerRead {
  readonly columns: 'header' | 'legacy_fixed';
  readonly rows: readonly LegacyRow[];
  /** Rows that look like data but cannot be read safely. */
  readonly malformed: readonly LegacyHeldRow[];
}

function headerMap(cells: readonly string[]): Record<string, number> | null {
  const map: Record<string, number> = {};
  cells.forEach((c, i) => {
    const field = LEGACY_HEADER_ALIASES[c.trim().toLowerCase()];
    if (field) map[field] = i;
  });
  return REQUIRED_HEADER_FIELDS.every((k) => map[k] != null) ? map : null;
}

export function readLegacyTracker(text: string): LegacyTrackerRead {
  const lines = text.split(/\r?\n/);
  let header: Record<string, number> | null = null;
  let headerColumns = 0;
  for (const line of lines) {
    if (line.startsWith('|') && (header = headerMap(line.split('|')))) {
      // Every header column counts, recognised or not: an unknown trailing
      // column must not let a row with a missing interior cell pass as complete.
      headerColumns = line.split('|').length - (line.trimEnd().endsWith('|') ? 2 : 1);
      break;
    }
  }
  const columns = header ?? LEGACY_FIXED_COLUMNS;
  const highest = Math.max(headerColumns, ...Object.values(columns));
  const rows: LegacyRow[] = [];
  const malformed: LegacyHeldRow[] = [];

  lines.forEach((line, index) => {
    if (!line.startsWith('|') || SEPARATOR_ROW_RE.test(line) || headerMap(line.split('|'))) return;
    const parts = line.split('|').map((s) => s.trim());
    const numCell = parts[columns.num ?? 1] ?? '';
    // Not a data row at all, as in the engine (whose parseInt gives NaN).
    if (Number.isNaN(Number.parseInt(numCell, 10))) return;
    // The engine would read it, so it must be reported, not silently dropped;
    // but "12a", "-3" or a number past 2^53 is not a safe key.
    const num = /^\d+$/.test(numCell) ? Number(numCell) : Number.NaN;
    if (!Number.isSafeInteger(num)) {
      malformed.push({ line: index + 1, num: null, reason: 'invalid_number' });
      return;
    }
    // A complete row is a leading '' + one part per column (+ a trailing '' when
    // the row ends with a pipe); a missing interior cell would shift the rest.
    const width = highest + (line.trimEnd().endsWith('|') ? 2 : 1);
    if (parts.length < width) {
      malformed.push({ line: index + 1, num, reason: 'malformed_row' });
      return;
    }
    const cells: Record<string, string> = {};
    for (const [field, at] of Object.entries(columns)) if (field !== 'num') cells[field] = parts[at] ?? '';
    rows.push({ line: index + 1, num, cells });
  });
  return { columns: header ? 'header' : 'legacy_fixed', rows, malformed };
}

/** What the planner needs from the store. */
export interface LedgerView {
  revisionOf(entityType: string, entityId: string): number;
  listEvents(entityType: string, entityId: string): OperationEvent[];
}

export interface LegacyImportPlan {
  readonly report: LegacyTrackerImportReport;
  /** Events to append atomically, in order. Empty when nothing changed. */
  readonly events: readonly OperationEventInput[];
}

export const LEGACY_APPLICATION_PREFIX = 'legacy-';
export const LEGACY_IMPORTED = 'application.legacy_imported';
export const LEGACY_UPDATED = 'application.legacy_updated';
export const LEGACY_IMPORT_RECORDED = 'legacy_import.recorded';
/** Quarantined rows kept in the audit record; the rest are counted. */
export const MAX_RECORDED_QUARANTINE = 500;

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

/** JSON with sorted keys, so a hash does not depend on column order. */
function canonical(value: Record<string, string>): string {
  return JSON.stringify(Object.fromEntries(Object.keys(value).sort().map((k) => [k, value[k]])));
}

/** A deterministic RFC 9562 version-8 UUID from a seed: the same input gives the same event id. */
export function deterministicUuid(seed: string): string {
  const h = sha256(`reboundops:${seed}`).slice(0, 32).split('');
  h[12] = '8';
  h[16] = ((parseInt(h[16] ?? '0', 16) & 0x3) | 0x8).toString(16);
  const x = h.join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const same = (a: unknown, b: unknown) =>
  String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

const EMPTY_CELL = /^(?:|—|-)$/;

export function planLegacyImport(
  request: LegacyTrackerImportRequest,
  ledger: LedgerView,
  now: () => Date = () => new Date()
): LegacyImportPlan {
  const read = readLegacyTracker(request.markdown);
  const sourceSha256 = sha256(request.markdown);
  const quarantined: LegacyQuarantinedRow[] = read.malformed.map(({ line, num, reason }) => ({ line, num, reason }));
  const events: OperationEventInput[] = [];
  let imported = 0;
  let updated = 0;
  let unchanged = 0;

  const seen = new Map<number, number>();
  for (const row of read.rows) seen.set(row.num, (seen.get(row.num) ?? 0) + 1);
  for (const m of read.malformed) if (m.num !== null) seen.set(m.num, (seen.get(m.num) ?? 0) + 1);

  for (const row of read.rows) {
    const hold = (reason: LegacyQuarantinedRow['reason']) => quarantined.push({ line: row.line, num: row.num, reason });
    // A # used twice is ambiguous: hold every row that uses it.
    if ((seen.get(row.num) ?? 0) > 1) { hold('duplicate_number'); continue; }
    const { company = '', role = '', date = '' } = row.cells;
    if (EMPTY_CELL.test(company) || EMPTY_CELL.test(role)) { hold('missing_company_or_role'); continue; }
    if (!isRealDate(date)) { hold('invalid_date'); continue; }

    const entityId = `${LEGACY_APPLICATION_PREFIX}${row.num}`;
    const legacy = { num: String(row.num), ...row.cells };
    const rowSha256 = sha256(canonical(legacy));
    const current = ledger.revisionOf('application', entityId);
    let type = LEGACY_IMPORTED;
    // The date a legacy row records is the best event time available. An
    // update's real time is unknown, so it is the time of this import.
    let occurredAt = `${date}T00:00:00.000Z`;

    if (current > 0) {
      const last = ledger.listEvents('application', entityId)
        .filter((e) => e.type === LEGACY_IMPORTED || e.type === LEGACY_UPDATED).at(-1);
      const previous = (last?.payload as { legacy?: Record<string, string>; rowSha256?: string } | undefined);
      // A record this import did not create, or a # that now names a different
      // job, is never overwritten.
      if (!previous?.legacy || !same(previous.legacy.company, company) || !same(previous.legacy.role, role)) {
        hold('conflicts_with_imported_record');
        continue;
      }
      if (previous.rowSha256 === rowSha256) { unchanged++; continue; }
      type = LEGACY_UPDATED;
      occurredAt = now().toISOString();
    }

    const payload = { legacy, rowSha256, source: { label: request.sourceLabel, sha256: sourceSha256, line: row.line } };
    // The store refuses a payload over the cap and the batch is atomic, so one
    // oversized row would fail the whole import (and a dry run would not know).
    if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_EVENT_PAYLOAD_BYTES) { hold('row_too_large'); continue; }
    if (type === LEGACY_UPDATED) updated++; else imported++;

    events.push({
      id: deterministicUuid(`legacy-tracker|${entityId}|${current}|${rowSha256}`),
      entityType: 'application',
      entityId,
      expectedRevision: current,
      type,
      occurredAt,
      source: 'import',
      payload
    });
  }

  quarantined.sort((a, b) => a.line - b.line);
  const report: LegacyTrackerImportReport = {
    sourceLabel: request.sourceLabel,
    sourceSha256,
    dryRun: request.dryRun,
    columns: read.columns,
    rowsRead: read.rows.length + read.malformed.length,
    imported,
    updated,
    unchanged,
    quarantined
  };

  // One audit record per import that changed something, with the quarantine
  // list, so held rows stay visible after the response is gone.
  if (events.length > 0) {
    const importRevision = ledger.revisionOf('legacy_import', sourceSha256);
    events.push({
      id: deterministicUuid(`legacy-import|${sourceSha256}|${importRevision}|${events.map((e) => e.id).join(',')}`),
      entityType: 'legacy_import',
      entityId: sourceSha256,
      expectedRevision: importRevision,
      type: LEGACY_IMPORT_RECORDED,
      occurredAt: now().toISOString(),
      source: 'import',
      payload: {
        sourceLabel: report.sourceLabel, columns: report.columns, rowsRead: report.rowsRead,
        imported, updated, unchanged,
        // Bounded so the record stays under the event payload cap.
        quarantinedCount: quarantined.length,
        quarantined: quarantined.slice(0, MAX_RECORDED_QUARANTINE).map((q) => ({ ...q }))
      }
    });
  }
  return { report, events };
}

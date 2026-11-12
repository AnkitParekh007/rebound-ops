import { z } from 'zod';

/**
 * Legacy tracker import (FND-03): rows of the engine's `data/applications.md`
 * become operations `application` records.
 *
 * - The original file is never read or changed by the API; the caller sends
 *   its text, and the report records its SHA-256.
 * - Each row maps to the stable entity `legacy-<#>`. Event ids are derived
 *   from the row's content and the record's revision, so importing the same
 *   file again appends nothing.
 * - A row that cannot be imported safely is quarantined: reported with its
 *   line number and reason, and nothing is written for it.
 */

/** Largest tracker text accepted in one import. */
export const MAX_LEGACY_TRACKER_BYTES = 2 * 1024 * 1024;

export const LEGACY_QUARANTINE_REASONS = [
  /** Fewer cells than the header has columns, so later cells would shift. */
  'malformed_row',
  /** The # cell starts with a number but is not a whole number this importer can key on (e.g. `12a`, `-3`, or beyond 2^53). */
  'invalid_number',
  /** The Date cell is not a real YYYY-MM-DD date. */
  'invalid_date',
  /** Company or Role is empty. */
  'missing_company_or_role',
  /** Another row in the same file uses this #. Both are held. */
  'duplicate_number',
  /** This # was imported before with a different Company or Role. */
  'conflicts_with_imported_record',
  /** This # was imported before and its record was later redacted; it is not filled in again. */
  'record_redacted',
  /** The row's cells (usually Notes) exceed the 64 KiB event payload limit. */
  'row_too_large'
] as const;
export const LegacyQuarantineReasonSchema = z.enum(LEGACY_QUARANTINE_REASONS);
export type LegacyQuarantineReason = z.infer<typeof LegacyQuarantineReasonSchema>;

export const LegacyTrackerImportRequestSchema = z.strictObject({
  /** The file's text, as the person selected it. */
  markdown: z.string().min(1).refine(
    (s) => new TextEncoder().encode(s).length <= MAX_LEGACY_TRACKER_BYTES,
    `Tracker text exceeds ${MAX_LEGACY_TRACKER_BYTES} bytes`
  ),
  /** A label for the report, e.g. the file name. Not a path the API opens. */
  sourceLabel: z.string().trim().min(1).max(200),
  /** true: report what would happen, write nothing. */
  dryRun: z.boolean()
});
export type LegacyTrackerImportRequest = z.infer<typeof LegacyTrackerImportRequestSchema>;

export interface LegacyQuarantinedRow {
  /** 1-based line number in the submitted text. */
  readonly line: number;
  /** The row's # cell when it had one. */
  readonly num: number | null;
  readonly reason: LegacyQuarantineReason;
}

export interface LegacyTrackerImportReport {
  readonly sourceLabel: string;
  readonly sourceSha256: string;
  readonly dryRun: boolean;
  /** Whether the header was recognised, or the fixed legacy column order was assumed. */
  readonly columns: 'header' | 'legacy_fixed';
  readonly rowsRead: number;
  /** New records (first import of this #). */
  readonly imported: number;
  /** Records whose row changed since the last import (e.g. a new status). */
  readonly updated: number;
  /** Rows identical to what was last imported; nothing written. */
  readonly unchanged: number;
  readonly quarantined: readonly LegacyQuarantinedRow[];
}

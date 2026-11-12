import { z } from 'zod';

/**
 * The operations event ledger (FND-02). Every change to an operations record
 * is an append-only event with a caller-chosen id, so a retried request is
 * idempotent, and an expected revision, so two writers cannot silently
 * overwrite each other.
 *
 * Event time (`occurredAt`, when it happened) and ingestion time (when the
 * store recorded it) are kept apart: importing an old email must not look like
 * something that happened today.
 */

export const OPERATION_EVENT_SOURCES = ['user', 'import', 'adapter', 'system'] as const;
export const OperationEventSourceSchema = z.enum(OPERATION_EVENT_SOURCES);
export type OperationEventSource = z.infer<typeof OperationEventSourceSchema>;

/** Serialized payload cap. Events carry redacted facts, never documents. */
export const MAX_EVENT_PAYLOAD_BYTES = 64 * 1024;

export const OperationEventInputSchema = z.strictObject({
  id: z.uuid(),
  entityType: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, 'lower_snake_case entity type'),
  entityId: z.string().min(1).max(200),
  /** The entity's current revision as the caller last saw it; 0 for a new entity. */
  expectedRevision: z.number().int().min(0),
  type: z.string().regex(/^[a-z][a-z0-9_.]{0,79}$/, 'dotted lower-case event type'),
  occurredAt: z.iso.datetime({ offset: true }),
  source: OperationEventSourceSchema,
  /** JSON values only: NaN, Infinity, undefined, dates or functions would not survive storage unchanged. */
  payload: z.record(z.string(), z.json())
});
export type OperationEventInput = z.infer<typeof OperationEventInputSchema>;

export interface OperationEvent {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  /** The entity revision this event produced (1 for the first event). */
  readonly revision: number;
  readonly type: string;
  readonly occurredAt: string;
  readonly ingestedAt: string;
  readonly source: OperationEventSource;
  readonly payload: Record<string, unknown>;
  /** Set when the payload was redacted (FND-06); the payload is then `{}`. */
  readonly redactedAt?: string;
}

/**
 * Redaction (FND-06). The one exception to append-only: every earlier event
 * of a record keeps its id, type, times and revision, but its payload becomes
 * `{}`. The store then appends one `record.redacted` event, which holds only
 * how many events it redacted. Only the store may write this event type.
 */
export const REDACTION_EVENT_TYPE = 'record.redacted';

export const RecordRedactionRequestSchema = z.strictObject({
  /** Caller-chosen, so a retried redaction is idempotent. */
  id: z.uuid(),
  /** The record's revision as the caller last saw it. */
  expectedRevision: z.number().int().min(1),
  /** Redaction cannot be undone, except by restoring a backup taken before it. */
  confirm: z.literal(true)
});
export type RecordRedactionRequest = z.infer<typeof RecordRedactionRequestSchema>;

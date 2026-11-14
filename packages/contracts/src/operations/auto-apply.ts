import { z } from 'zod';

/**
 * Controlled Auto Apply vocabulary (operations feature #1, flag `autoApply`).
 *
 * R3 is prepare-only (owner decision, 14 Nov 2026): ReboundOps queues and
 * prepares applications, and the person submits every one of them
 * themselves. Nothing here describes a submission by ReboundOps.
 *
 * The engine (`engine/web/src/lib/apply/apply-queue.mjs`) mirrors these lists
 * and numbers as plain JavaScript; `tests/operations-parity.test.mjs` fails if
 * they drift.
 */

/**
 * Where a queued application stands.
 * - `queued`: qualifies and waits to be prepared.
 * - `prepared`: filled and read back, waiting for the person to review and submit it.
 * - `stopped`: preparing stopped (a CAPTCHA, a login, a closed posting); the reason is kept.
 * - `applied`: the tracker row says the person applied (or got further).
 * - `withdrawn`: it stopped qualifying (closed, rescored, blocked); it returns if it qualifies again.
 * - `removed`: the person removed it; it is never added back automatically.
 */
export const APPLY_QUEUE_STATES = ['queued', 'prepared', 'stopped', 'applied', 'withdrawn', 'removed'] as const;
export const ApplyQueueStateSchema = z.enum(APPLY_QUEUE_STATES);
export type ApplyQueueState = z.infer<typeof ApplyQueueStateSchema>;

/** Application forms the queue can prepare. LinkedIn and Indeed are never supported (their terms prohibit automation). */
export const APPLY_ADAPTERS = ['greenhouse', 'lever'] as const;
export const ApplyAdapterSchema = z.enum(APPLY_ADAPTERS);
export type ApplyAdapter = z.infer<typeof ApplyAdapterSchema>;

/** Owner decisions, 14 Nov 2026: qualifying rows are added automatically, at most 10 are prepared per day, and only rows scored 4.0/5 or more qualify. */
export const APPLY_QUEUE_DAILY_CAP = 10;
export const APPLY_QUEUE_MIN_SCORE = 4.0;

export const ApplyQueueItemSchema = z
  .object({
    id: z.string().min(1).max(100),
    trackerNumber: z.string().min(1).max(20),
    company: z.string().max(300),
    role: z.string().max(300),
    url: z.string().url().max(2048),
    adapter: ApplyAdapterSchema,
    score: z.number().min(0).max(5),
    state: ApplyQueueStateSchema,
    /** Why it qualified, in plain words, kept from when it was added. */
    reasons: z.array(z.string().max(300)).max(20),
    /** Why it is withdrawn or stopped; empty otherwise. */
    blockers: z.array(z.string().max(300)).max(20),
    addedAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    preparedAt: z.string().datetime().nullable()
  })
  .strict();
export type ApplyQueueItem = z.infer<typeof ApplyQueueItemSchema>;

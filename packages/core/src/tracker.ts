import type { ApplicationStatus } from '@reboundops/contracts';

/**
 * Application status workflow.
 *
 * The graph is deliberately permissive about moving backwards (people change
 * their minds) but strict about one thing: nothing becomes `applied` unless the
 * person explicitly confirms they submitted it themselves.
 */
const TRANSITIONS: Readonly<Record<ApplicationStatus, readonly ApplicationStatus[]>> = {
  discovered: ['shortlisted', 'preparing', 'applied', 'rejected', 'withdrawn'],
  shortlisted: ['discovered', 'preparing', 'applied', 'rejected', 'withdrawn'],
  preparing: ['shortlisted', 'ready_for_review', 'applied', 'withdrawn'],
  ready_for_review: ['preparing', 'applied', 'withdrawn'],
  applied: ['interviewing', 'offer', 'rejected', 'withdrawn'],
  interviewing: ['offer', 'rejected', 'withdrawn'],
  offer: ['withdrawn', 'rejected'],
  // Closed applications reopen through reopenTargets(); history is never removed.
  rejected: [],
  withdrawn: [],
};

/** Context the workflow needs beyond the current status. */
export interface TransitionContext {
  /** The person confirmed a submission at some point (appliedConfirmedAt is set). */
  previouslySubmitted?: boolean;
}

const REOPEN_BEFORE_SUBMISSION: readonly ApplicationStatus[] = ['shortlisted', 'preparing', 'ready_for_review'];
const REOPEN_AFTER_SUBMISSION: readonly ApplicationStatus[] = ['applied', 'interviewing', 'offer'];

/**
 * Where a rejected or withdrawn application may go when reopened. A previously
 * submitted application can return to its submitted stages (for example a
 * mistaken rejection); one never submitted cannot jump to them.
 */
export function reopenTargets(ctx: TransitionContext = {}): readonly ApplicationStatus[] {
  return ctx.previouslySubmitted ? [...REOPEN_BEFORE_SUBMISSION, ...REOPEN_AFTER_SUBMISSION] : REOPEN_BEFORE_SUBMISSION;
}

export const STATUS_LABELS: Readonly<Record<ApplicationStatus, string>> = {
  discovered: 'Discovered',
  shortlisted: 'Shortlisted',
  preparing: 'Preparing',
  ready_for_review: 'Ready for review',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

/** Statuses that mean the person has (by their own confirmation) submitted. */
export const SUBMITTED_STATUSES: readonly ApplicationStatus[] = [
  'applied',
  'interviewing',
  'offer',
];

export const CLOSED_STATUSES: readonly ApplicationStatus[] = ['rejected', 'withdrawn'];

export function allowedTransitions(from: ApplicationStatus, ctx: TransitionContext = {}): readonly ApplicationStatus[] {
  return CLOSED_STATUSES.includes(from) ? reopenTargets(ctx) : TRANSITIONS[from];
}

export function isReopen(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return CLOSED_STATUSES.includes(from) && !CLOSED_STATUSES.includes(to);
}

export type TransitionCheck =
  | { ok: true; requiresConfirmation: boolean }
  | { ok: false; code: 'same_status' | 'not_allowed' | 'confirmation_required'; message: string };

export function checkTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  confirmSubmitted: boolean,
  ctx: TransitionContext = {},
): TransitionCheck {
  if (from === to) {
    return { ok: false, code: 'same_status', message: `Already ${STATUS_LABELS[to]}.` };
  }
  if (!allowedTransitions(from, ctx).includes(to)) {
    return {
      ok: false,
      code: 'not_allowed',
      message: `Cannot move from ${STATUS_LABELS[from]} to ${STATUS_LABELS[to]}.`,
    };
  }
  // Re-entering "applied" after an earlier confirmed submission does not need a second confirmation.
  if (to === 'applied' && !confirmSubmitted && !ctx.previouslySubmitted) {
    return {
      ok: false,
      code: 'confirmation_required',
      message:
        'Marking as applied requires your confirmation that you submitted the application yourself.',
    };
  }
  return { ok: true, requiresConfirmation: to === 'applied' && !ctx.previouslySubmitted };
}

export function isActive(status: ApplicationStatus): boolean {
  return !CLOSED_STATUSES.includes(status);
}

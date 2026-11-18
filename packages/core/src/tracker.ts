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
  rejected: ['shortlisted'],
  withdrawn: ['shortlisted'],
};

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

export function allowedTransitions(from: ApplicationStatus): readonly ApplicationStatus[] {
  return TRANSITIONS[from];
}

export type TransitionCheck =
  | { ok: true; requiresConfirmation: boolean }
  | { ok: false; code: 'same_status' | 'not_allowed' | 'confirmation_required'; message: string };

export function checkTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  confirmSubmitted: boolean,
): TransitionCheck {
  if (from === to) {
    return { ok: false, code: 'same_status', message: `Already ${STATUS_LABELS[to]}.` };
  }
  if (!TRANSITIONS[from].includes(to)) {
    return {
      ok: false,
      code: 'not_allowed',
      message: `Cannot move from ${STATUS_LABELS[from]} to ${STATUS_LABELS[to]}.`,
    };
  }
  if (to === 'applied' && !confirmSubmitted) {
    return {
      ok: false,
      code: 'confirmation_required',
      message:
        'Marking as applied requires your confirmation that you submitted the application yourself.',
    };
  }
  return { ok: true, requiresConfirmation: to === 'applied' };
}

export function isActive(status: ApplicationStatus): boolean {
  return !CLOSED_STATUSES.includes(status);
}

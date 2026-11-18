import type { ApplicationStatus } from '@reboundops/contracts';

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
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

export const STATUS_ORDER: ApplicationStatus[] = [
  'discovered',
  'shortlisted',
  'preparing',
  'ready_for_review',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
];

/** Splits comma or newline separated text into a clean list. */
export function splitList(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const joinList = (items: readonly string[]) => items.join(', ');

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

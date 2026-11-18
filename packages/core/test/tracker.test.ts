import { describe, expect, it } from 'vitest';
import type { ApplicationView } from '@reboundops/contracts';
import { ApplicationStatus } from '@reboundops/contracts';
import { allowedTransitions, checkTransition, mergeOnboarding, defaultOnboarding, normalizeList, summarize } from '../src/index.ts';

describe('checkTransition', () => {
  it('requires explicit confirmation to mark applied', () => {
    expect(checkTransition('ready_for_review', 'applied', false)).toMatchObject({ ok: false, code: 'confirmation_required' });
    expect(checkTransition('ready_for_review', 'applied', true)).toEqual({ ok: true, requiresConfirmation: true });
  });

  it('rejects disallowed and no-op moves', () => {
    expect(checkTransition('discovered', 'offer', true)).toMatchObject({ ok: false, code: 'not_allowed' });
    expect(checkTransition('preparing', 'preparing', false)).toMatchObject({ ok: false, code: 'same_status' });
  });

  it('defines outgoing transitions for every status and only to known statuses', () => {
    for (const s of ApplicationStatus.options) {
      for (const t of allowedTransitions(s)) expect(ApplicationStatus.options).toContain(t);
    }
  });

  it('lets closed applications be reopened to shortlisted', () => {
    expect(checkTransition('rejected', 'shortlisted', false).ok).toBe(true);
  });
});

const job = (title: string) => ({
  id: `job-${title}`,
  title,
  employer: 'Example Co',
  location: null,
  salary: null,
  workArrangement: null,
  sourceUrl: null,
  description: '',
  provenance: { title: { origin: 'user' as const, evidence: null }, employer: { origin: 'user' as const, evidence: null }, location: null, salary: null },
  verification: { status: 'unverified' as const, checkedAt: null, note: '' },
  dedupeKey: title,
  capturedAt: '2026-01-01T00:00:00.000Z',
});

const app = (id: string, status: ApplicationView['status'], changed: string, confirmed: string | null = null): ApplicationView => ({
  id,
  jobId: `job-${id}`,
  status,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: changed,
  statusChangedAt: changed,
  appliedConfirmedAt: confirmed,
  job: job(id),
  activity: [{ id: `a-${id}`, applicationId: id, at: changed, kind: 'created', from: null, to: status, note: '' }],
  allowedNext: [],
});

describe('summarize', () => {
  const now = new Date('2026-01-20T00:00:00.000Z');

  it('counts only stored records and suggests next actions', () => {
    const s = summarize(
      [
        app('a', 'discovered', '2026-01-19T00:00:00.000Z'),
        app('b', 'applied', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z'),
        app('c', 'applied', '2026-01-18T00:00:00.000Z', '2026-01-18T00:00:00.000Z'),
        app('d', 'rejected', '2026-01-10T00:00:00.000Z', '2026-01-05T00:00:00.000Z'),
      ],
      now,
    );
    expect(s.total).toBe(4);
    expect(s.active).toBe(3);
    expect(s.submitted).toBe(3);
    expect(s.byStatus.applied).toBe(2);
    expect(s.byStatus.offer).toBe(0);
    const labels = Object.fromEntries(s.nextActions.map((n) => [n.applicationId, n.label]));
    expect(labels['b']).toMatch(/18 days — consider a follow-up/);
    expect(labels['c']).toBeUndefined();
    expect(s.recentActivity[0]?.applicationId).toBe('a');
  });

  it('handles an empty workspace', () => {
    const s = summarize([], now);
    expect(s).toMatchObject({ total: 0, active: 0, submitted: 0, nextActions: [], recentActivity: [] });
  });
});

describe('onboarding helpers', () => {
  it('merges nested goals without dropping fields', () => {
    const base = mergeOnboarding(defaultOnboarding(), { goals: { targetRoles: ['Analyst'], timeline: 'exploring', weeklyApplicationTarget: 5, notes: '' } }, new Date());
    const next = mergeOnboarding(base, { step: 2 }, new Date());
    expect(next.goals.targetRoles).toEqual(['Analyst']);
    expect(next.step).toBe(2);
  });

  it('normalises lists', () => {
    expect(normalizeList(['  Data  Analyst ', 'data analyst', '', 'BI'])).toEqual(['Data Analyst', 'BI']);
  });
});

import { describe, expect, it } from 'vitest';
import type { ApplicationView } from '@reboundops/contracts';
import { analytics, firstResponseAt, reminderViews, weekStart } from '../src/index.ts';

const NOW = new Date('2026-06-17T12:00:00.000Z'); // Wednesday
const base = (id: string, createdAt: string, applied: string | null, events: [string, ApplicationView['status']][] = []): ApplicationView => ({
  id, jobId: `j${id}`, status: events.at(-1)?.[1] ?? (applied ? 'applied' : 'discovered'), createdAt, updatedAt: createdAt, statusChangedAt: createdAt, appliedConfirmedAt: applied,
  job: { id: `j${id}`, title: `Role ${id}`, employer: 'Example', location: null, salary: null, workArrangement: null, sourceUrl: null, description: '', provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null }, verification: { status: 'unverified', checkedAt: null, note: '' }, dedupeKey: id, capturedAt: createdAt },
  activity: events.map(([at, to], i) => ({ id: `${id}-${i}`, applicationId: id, at, kind: 'status_changed' as const, from: null, to, note: '' })),
  allowedNext: [],
});

describe('analytics', () => {
  it('derives weekly counts, response rate and median days only from records', () => {
    const apps = [
      base('a', '2026-06-01T09:00:00.000Z', '2026-06-02T09:00:00.000Z', [['2026-06-02T09:00:00.000Z', 'applied'], ['2026-06-06T09:00:00.000Z', 'interviewing']]),
      base('b', '2026-06-08T09:00:00.000Z', '2026-06-09T09:00:00.000Z', [['2026-06-09T09:00:00.000Z', 'applied'], ['2026-06-19T09:00:00.000Z', 'rejected']]),
      base('c', '2026-06-15T09:00:00.000Z', '2026-06-15T10:00:00.000Z'),
      base('d', '2026-06-16T09:00:00.000Z', null),
    ];
    const a = analytics(apps, NOW);
    expect(a.weekly.at(-1)).toEqual({ weekStart: '2026-06-15', saved: 2, submitted: 1 });
    expect(a.weekly.at(-3)).toEqual({ weekStart: '2026-06-01', saved: 1, submitted: 1 });
    expect(a).toMatchObject({ submittedTotal: 3, responded: 2, medianDaysToResponse: 7 });
    expect(a.responseRate).toBeCloseTo(2 / 3);
    expect(a.caveat).toMatch(/Based on 3 submitted applications; too few/);
  });

  it('ignores status changes recorded before submission', () => {
    expect(firstResponseAt(base('x', '2026-06-01T00:00:00.000Z', '2026-06-10T00:00:00.000Z', [['2026-06-05T00:00:00.000Z', 'rejected']]))).toBeNull();
  });

  it('reports no rate rather than zero when nothing was submitted', () => {
    expect(analytics([], NOW)).toMatchObject({ responseRate: null, medianDaysToResponse: null, caveat: expect.stringMatching(/No submitted/) });
    expect(weekStart(NOW).toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });

  it('lists open reminders with overdue flags', () => {
    const apps = [base('a', '2026-06-01T00:00:00.000Z', null)];
    const views = reminderViews(
      [
        { id: 'r1', applicationId: 'a', dueOn: '2026-06-20', label: 'Later', done: false, doneAt: null, createdAt: '2026-06-01T00:00:00.000Z', priority: 'normal', notes: '' },
        { id: 'r2', applicationId: 'a', dueOn: '2026-06-10', label: 'Late', done: false, doneAt: null, createdAt: '2026-06-01T00:00:00.000Z', priority: 'normal', notes: '' },
        { id: 'r3', applicationId: 'a', dueOn: '2026-06-01', label: 'Done', done: true, doneAt: null, createdAt: '2026-06-01T00:00:00.000Z', priority: 'normal', notes: '' },
      ],
      apps,
      NOW,
    );
    expect(views.map((v) => [v.label, v.overdue])).toEqual([['Late', true], ['Later', false]]);
  });
});

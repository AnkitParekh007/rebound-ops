import { describe, expect, it } from 'vitest';
import type { ApplicationView, Reminder } from '@reboundops/contracts';
import { followUpPriorities, reminderViews } from '../src/index.ts';

const now = new Date('2026-06-30T12:00:00.000Z');
const app = (id: string, status: ApplicationView['status'], changed: string): ApplicationView => ({
  id, jobId: `j-${id}`, status, createdAt: changed, updatedAt: changed, statusChangedAt: changed, appliedConfirmedAt: status === 'applied' ? changed : null,
  job: { id: `j-${id}`, title: `Role ${id}`, employer: 'Fictional', location: null, salary: null, workArrangement: null, sourceUrl: null, description: '', provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null }, verification: { status: 'unverified', checkedAt: null, note: '' }, dedupeKey: id, capturedAt: changed },
  activity: [], allowedNext: [],
});
const rem = (id: string, applicationId: string, dueOn: string, priority: Reminder['priority'] = 'normal'): Reminder => ({ id, applicationId, dueOn, label: id, done: false, doneAt: null, createdAt: '2026-06-01T00:00:00.000Z', priority, notes: '' });

describe('followUpPriorities', () => {
  it('uses fixed, explained thresholds and never suggests for applications with a planned reminder', () => {
    const apps = [app('a', 'applied', '2026-06-25T00:00:00.000Z'), app('b', 'applied', '2026-06-20T00:00:00.000Z'), app('c', 'applied', '2026-06-01T00:00:00.000Z'), app('d', 'interviewing', '2026-06-20T00:00:00.000Z'), app('e', 'applied', '2026-05-01T00:00:00.000Z')];
    const s = followUpPriorities(apps, [rem('planned', 'e', '2026-07-05')], now);
    expect(s.map((x) => [x.applicationId, x.priority, x.suggestedKind])).toEqual([
      ['c', 'normal', 'after_applying'],
      ['d', 'normal', 'after_interview'],
      ['b', 'low', 'after_applying'],
    ]);
  });

  it('puts overdue and due-today reminders first', () => {
    const apps = [app('a', 'shortlisted', '2026-06-29T00:00:00.000Z'), app('b', 'shortlisted', '2026-06-29T00:00:00.000Z')];
    const s = followUpPriorities(apps, [rem('late', 'a', '2026-06-20'), rem('today', 'b', '2026-06-30')], now);
    expect(s.map((x) => x.reason)).toEqual(['Reminder overdue since 2026-06-20: late', 'Reminder due today: today']);
  });
});

describe('reminderViews ordering', () => {
  it('lists overdue first, then by date, high priority first on the same day', () => {
    const apps = [app('a', 'applied', '2026-06-01T00:00:00.000Z')];
    const v = reminderViews([rem('later', 'a', '2026-07-03'), rem('same-normal', 'a', '2026-07-01'), rem('same-high', 'a', '2026-07-01', 'high'), rem('late', 'a', '2026-06-10')], apps, now);
    expect(v.map((x) => x.id)).toEqual(['late', 'same-high', 'same-normal', 'later']);
  });
});

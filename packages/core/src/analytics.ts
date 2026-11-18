import type { Analytics, ApplicationView, Reminder, ReminderView } from '@reboundops/contracts';

const DAY = 86_400_000;
const RESPONSE_STATUSES = new Set(['interviewing', 'offer', 'rejected']);

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Monday 00:00 UTC of the week containing `d`. */
export function weekStart(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

/** First recorded employer response after the person confirmed submission, if any. */
export function firstResponseAt(app: ApplicationView): string | null {
  if (!app.appliedConfirmedAt) return null;
  const at = app.activity
    .filter((a) => a.kind === 'status_changed' && a.to && RESPONSE_STATUSES.has(a.to) && a.at >= app.appliedConfirmedAt!)
    .map((a) => a.at)
    .sort();
  return at[0] ?? null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function analytics(apps: readonly ApplicationView[], now: Date, weeks = 8): Analytics {
  const current = weekStart(now).getTime();
  const weekly = Array.from({ length: weeks }, (_, i) => ({ weekStart: isoDay(new Date(current - (weeks - 1 - i) * 7 * DAY)), saved: 0, submitted: 0 }));
  const bucket = (iso: string) => {
    const idx = (weekStart(new Date(iso)).getTime() - (current - (weeks - 1) * 7 * DAY)) / (7 * DAY);
    return idx >= 0 && idx < weeks ? weekly[idx] : undefined;
  };
  const days: number[] = [];
  let submittedTotal = 0;
  let responded = 0;
  for (const app of apps) {
    const saved = bucket(app.createdAt);
    if (saved) saved.saved++;
    if (!app.appliedConfirmedAt) continue;
    submittedTotal++;
    const sub = bucket(app.appliedConfirmedAt);
    if (sub) sub.submitted++;
    const response = firstResponseAt(app);
    if (response) {
      responded++;
      days.push(Math.round(((Date.parse(response) - Date.parse(app.appliedConfirmedAt)) / DAY) * 10) / 10);
    }
  }
  return {
    weekly,
    submittedTotal,
    responded,
    responseRate: submittedTotal ? responded / submittedTotal : null,
    medianDaysToResponse: median(days),
    caveat:
      submittedTotal === 0
        ? 'No submitted applications yet — rates appear once you confirm a submission.'
        : submittedTotal < 10
          ? `Based on ${submittedTotal} submitted application${submittedTotal === 1 ? '' : 's'}; too few for a reliable rate.`
          : null,
  };
}

export function reminderViews(reminders: readonly Reminder[], apps: readonly ApplicationView[], now: Date): ReminderView[] {
  const byId = new Map(apps.map((a) => [a.id, a]));
  const today = isoDay(now);
  return reminders
    .filter((r) => !r.done && byId.has(r.applicationId))
    .map((r) => ({ ...r, jobTitle: byId.get(r.applicationId)!.job.title, employer: byId.get(r.applicationId)!.job.employer, overdue: r.dueOn < today }))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}

export const addDays = (d: Date, n: number) => isoDay(new Date(d.getTime() + n * DAY));

import type {
  ActivityEntry,
  ApplicationStatus,
  ApplicationView,
  DashboardSummary,
  NextAction,
  Reminder,
} from '@reboundops/contracts';
import { ApplicationStatus as StatusEnum } from '@reboundops/contracts';
import { SUBMITTED_STATUSES, isActive } from './tracker.ts';
import { analytics, reminderViews } from './analytics.ts';

const DAY_MS = 86_400_000;
export const FOLLOW_UP_AFTER_DAYS = 7;

/** A suggested next step for one application, or null when nothing is pending. */
export function nextActionFor(app: ApplicationView, now: Date): string | null {
  switch (app.status) {
    case 'discovered':
      return 'Review the posting and decide whether to shortlist it';
    case 'shortlisted':
      return 'Start preparing your application materials';
    case 'preparing':
      return 'Finish your drafts and mark them ready for review';
    case 'ready_for_review':
      return 'Review, submit on the official site, then confirm here';
    case 'applied': {
      const since = now.getTime() - Date.parse(app.statusChangedAt);
      return since >= FOLLOW_UP_AFTER_DAYS * DAY_MS
        ? `No update for ${Math.floor(since / DAY_MS)} days — consider a follow-up`
        : null;
    }
    case 'interviewing':
      return 'Prepare for the next interview and log notes';
    case 'offer':
      return 'Review the offer details and decide';
    default:
      return null;
  }
}

/** Derives dashboard metrics strictly from stored records; no estimates. */
export function summarize(
  apps: readonly ApplicationView[],
  now: Date,
  recentLimit = 10,
  reminders: readonly Reminder[] = [],
): DashboardSummary {
  const byStatus = Object.fromEntries(StatusEnum.options.map((s) => [s, 0])) as Record<
    ApplicationStatus,
    number
  >;
  const nextActions: NextAction[] = [];
  const recent: (ActivityEntry & { jobTitle: string; employer: string })[] = [];

  for (const app of apps) {
    byStatus[app.status] += 1;
    const label = nextActionFor(app, now);
    if (label) {
      nextActions.push({
        applicationId: app.id,
        jobTitle: app.job.title,
        employer: app.job.employer,
        status: app.status,
        label,
      });
    }
    for (const entry of app.activity) {
      recent.push({ ...entry, jobTitle: app.job.title, employer: app.job.employer });
    }
  }

  recent.sort((a, b) => b.at.localeCompare(a.at));

  return {
    total: apps.length,
    active: apps.filter((a) => isActive(a.status)).length,
    // "Submitted" counts every record whose submission the person confirmed,
    // including ones that later closed.
    submitted: apps.filter(
      (a) => a.appliedConfirmedAt !== null || SUBMITTED_STATUSES.includes(a.status),
    ).length,
    byStatus,
    nextActions,
    recentActivity: recent.slice(0, recentLimit),
    generatedAt: now.toISOString(),
    analytics: analytics(apps, now),
    reminders: reminderViews(reminders, apps, now),
  };
}

import type { ApplicationView, FollowUpSuggestion, Reminder } from '@reboundops/contracts';

const DAY = 86_400_000;
const RANK = { high: 0, normal: 1, low: 2 } as const;

const daysBetween = (fromIso: string, now: Date) => Math.max(0, Math.floor((now.getTime() - Date.parse(fromIso)) / DAY));
const lastActivity = (app: ApplicationView) => app.activity.reduce((latest, e) => (e.at > latest ? e.at : latest), app.statusChangedAt);

/**
 * Ranks follow-ups worth considering, from saved records only: overdue or
 * imminent reminders, and submitted applications that have gone quiet.
 * Thresholds are fixed and explained in each reason; nothing is sent.
 */
export function followUpPriorities(apps: readonly ApplicationView[], reminders: readonly Reminder[], now: Date): FollowUpSuggestion[] {
  const today = now.toISOString().slice(0, 10);
  const soon = new Date(now.getTime() + 3 * DAY).toISOString().slice(0, 10);
  const byId = new Map(apps.map((a) => [a.id, a]));
  const out: FollowUpSuggestion[] = [];
  const covered = new Set<string>();

  for (const r of reminders) {
    const app = byId.get(r.applicationId);
    if (!app || r.done) continue;
    const base = { applicationId: app.id, jobTitle: app.job.title, employer: app.job.employer };
    if (r.dueOn < today) {
      out.push({ ...base, priority: 'high', reason: `Reminder overdue since ${r.dueOn}: ${r.label}`, suggestedKind: null, days: daysBetween(`${r.dueOn}T00:00:00.000Z`, now) });
    } else if (r.dueOn === today) {
      out.push({ ...base, priority: 'high', reason: `Reminder due today: ${r.label}`, suggestedKind: null, days: 0 });
    } else if (r.dueOn <= soon && r.priority === 'high') {
      out.push({ ...base, priority: 'normal', reason: `High-priority reminder due ${r.dueOn}: ${r.label}`, suggestedKind: null, days: 0 });
    } else continue;
    covered.add(app.id);
  }

  for (const app of apps) {
    if (covered.has(app.id)) continue;
    // An open reminder already plans the next step.
    if (reminders.some((r) => r.applicationId === app.id && !r.done)) continue;
    const quiet = daysBetween(lastActivity(app), now);
    const base = { applicationId: app.id, jobTitle: app.job.title, employer: app.job.employer, days: quiet };
    if (app.status === 'applied' && quiet >= 14) out.push({ ...base, priority: 'normal', reason: `No recorded response ${quiet} days after your last update.`, suggestedKind: 'after_applying' });
    else if (app.status === 'applied' && quiet >= 7) out.push({ ...base, priority: 'low', reason: `Applied ${quiet} days ago with nothing recorded since.`, suggestedKind: 'after_applying' });
    else if (app.status === 'interviewing' && quiet >= 5) out.push({ ...base, priority: 'normal', reason: `Interviewing, but nothing recorded for ${quiet} days.`, suggestedKind: 'after_interview' });
    else if (app.status === 'offer' && quiet >= 3) out.push({ ...base, priority: 'normal', reason: `An offer has been open for ${quiet} days without a recorded decision.`, suggestedKind: null });
  }

  return out.sort((a, b) => RANK[a.priority] - RANK[b.priority] || b.days - a.days || a.jobTitle.localeCompare(b.jobTitle));
}

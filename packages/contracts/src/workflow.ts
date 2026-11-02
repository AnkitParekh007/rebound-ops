import type { Intake, Evidence, Route, RouteId, Session, Plan } from './schema.js';
import { IntakeSchema, SessionSchema } from './schema.js';

export const ROUTE_META: Record<RouteId, { label: string; uncertainty: string; nextTest: string; missingProof: string }> = {
  return: {
    label: 'Return',
    uncertainty: 'Current job requirements and hiring availability have not been checked.',
    nextTest: 'Compare two real job descriptions with confirmed achievements.',
    missingProof: 'Which current role requirements are not yet supported by sourced achievements?'
  },
  shift: {
    label: 'Shift',
    uncertainty: 'Experience in an adjacent field does not prove readiness for the new specialty.',
    nextTest: 'Compare two real descriptions and demonstrate one concrete requirement.',
    missingProof: 'What specialty-specific work have you not yet demonstrated?'
  },
  bridge: {
    label: 'Bridge',
    uncertainty: 'Demand, timing and actual contract income are unknown.',
    nextTest: 'Define one narrow deliverable and validate it with a potential client.',
    missingProof: 'Can you show a relevant, permission-safe example and define the scope?'
  }
};

const TASKS: Record<RouteId, ReadonlyArray<readonly [string, number]>> = {
  return: [
    ['Identify three achievements and verify their sources', 30],
    ['Compare two supplied role descriptions to confirmed evidence', 45],
    ['Revise one application asset using only supported claims', 50],
    ['Send one targeted application or request a relevant conversation', 50],
    ['Review evidence and outcomes; decide what to test next', 25]
  ],
  shift: [
    ['Inventory verified transferable work and missing requirements', 30],
    ['Compare two adjacent-role descriptions and choose one gap', 45],
    ['Create a small, time-boxed proof-of-work outline', 60],
    ['Request practitioner feedback on the example', 45],
    ['Record the result and update the hypothesis', 20]
  ],
  bridge: [
    ['List deliverables you can already produce', 30],
    ['Define a narrow contract scope and clear exclusions', 40],
    ['Prepare a non-confidential example of prior work', 45],
    ['Ask one relevant contact for feedback or review an opportunity', 50],
    ['Review actual interest and adjust the offer', 20]
  ]
};

export function buildRoutes(intake: Intake): Route[] {
  // All supplied evidence is merely a candidate for manual relevance review.
  // We never assert that a self-reported achievement meets a target requirement.
  const ids = intake.evidence.filter(e => e.status !== 'rejected').map(e => e.id);
  const targets: Record<RouteId, string> = {
    return: intake.role,
    shift: intake.shiftTarget || 'Adjacent software role (to define)',
    bridge: intake.bridgeTarget || 'Scoped contract work (to define)'
  };
  return (['return', 'shift', 'bridge'] as const).map(id => ({
    id,
    label: ROUTE_META[id].label,
    target: targets[id],
    candidateEvidenceIds: [...ids],
    missingProof: [ROUTE_META[id].missingProof],
    uncertainty: ROUTE_META[id].uncertainty,
    nextTest: ROUTE_META[id].nextTest
  }));
}

export function buildPlan(routeId: RouteId, weeklyHours: number): Plan {
  if (!Number.isInteger(weeklyHours) || weeklyHours < 1 || weeklyHours > 20) {
    throw new RangeError('Available hours must be 1–20 per week.');
  }
  const budgetMinutes = weeklyHours * 60;
  let plannedMinutes = 0;
  const actions: Plan['actions'] = [];
  for (const [title, minutes] of TASKS[routeId]) {
    if (plannedMinutes + minutes > budgetMinutes) continue;
    actions.push({ id: routeId + '-' + (actions.length + 1), day: actions.length + 1, title, minutes, completed: false });
    plannedMinutes += minutes;
  }
  return { routeId, budgetMinutes, plannedMinutes, actions };
}

export function createSession(input: Intake, id: string, now: string): Session {
  const intake = IntakeSchema.parse(input);
  return SessionSchema.parse({
    schemaVersion: 1, id, revision: 0, createdAt: now, updatedAt: now,
    intake, routes: buildRoutes(intake), plan: null, reviewNotes: ''
  });
}

export function replaceIntake(session: Session, input: Intake): Session {
  const intake = IntakeSchema.parse(input);
  // Explicitly invalidate prior route selection, progress and review after changing evidence/constraints.
  return { ...session, intake, routes: buildRoutes(intake), plan: null, reviewNotes: '' };
}

export function decideEvidence(session: Session, evidenceId: string, status: Evidence['status']): Session {
  if (!session.intake.evidence.some(item => item.id === evidenceId)) throw new Error('Evidence not found.');
  const intake = {
    ...session.intake,
    evidence: session.intake.evidence.map(item => item.id === evidenceId ? { ...item, status } : item)
  };
  return { ...session, intake, routes: buildRoutes(intake) };
}

export function selectRoute(session: Session, routeId: RouteId): Session {
  return { ...session, plan: buildPlan(routeId, session.intake.weeklyHours), reviewNotes: '' };
}

export function completeAction(session: Session, actionId: string, completed: boolean): Session {
  if (!session.plan || !session.plan.actions.some(a => a.id === actionId)) throw new Error('Action not found.');
  return { ...session, plan: {
    ...session.plan,
    actions: session.plan.actions.map(a => a.id === actionId ? { ...a, completed } : a)
  } };
}

export function recordReview(session: Session, notes: string): Session {
  return { ...session, reviewNotes: notes.trim() };
}

export function exportMarkdown(session: Session): string {
  if (!session.plan) throw new Error('Choose a route first.');
  const safe = (x: string): string => x.replace(/\r?\n/g, ' ').trim();
  const { intake, plan } = session;
  const lines = [
    '# ReboundOps — Seven-day recovery plan', '',
    '> Local prototype. Career directions are hypotheses, not verified job matches.', '',
    '## Starting point',
    '- Recent role: ' + safe(intake.role),
    '- Work preference: ' + safe(intake.location),
    '- Hours available: ' + intake.weeklyHours,
    '- Income urgency: ' + intake.urgency,
    '- Priorities: ' + safe(intake.priorities), '',
    '## Evidence and provenance'
  ];
  if (intake.evidence.length === 0) lines.push('- No evidence entered.');
  for (const evidence of intake.evidence) {
    lines.push('- [' + evidence.status + '] ' + safe(evidence.claim) + ' — ' + safe(evidence.source.label) + ' (' + evidence.source.kind + ')');
  }
  const route = session.routes.find(r => r.id === plan.routeId);
  lines.push('', '## Direction to test', '- ' + route?.label + ': ' + safe(route?.target ?? ''), '- Uncertainty: ' + route?.uncertainty, '- Next test: ' + route?.nextTest, '',
    '## Seven-day actions', 'Budget: ' + plan.plannedMinutes + ' / ' + plan.budgetMinutes + ' minutes.');
  for (const task of plan.actions) lines.push('- [' + (task.completed ? 'x' : ' ') + '] Day ' + task.day + ': ' + safe(task.title) + ' (' + task.minutes + ' min)');
  lines.push('', '## Check-in', safe(session.reviewNotes) || 'No outcome recorded.', '', 'This document is user-controlled and has not been professionally verified.');
  return lines.join('\n') + '\n';
}

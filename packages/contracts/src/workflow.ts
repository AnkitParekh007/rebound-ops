import type { Intake, Evidence, Route, RouteId, Session, Plan, JobTarget, RequirementStatus } from './schema.js';
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
    intake, routes: buildRoutes(intake), jobTargets: [], plan: null, reviewNotes: ''
  });
}

export function replaceIntake(session: Session, input: Intake): Session {
  const intake = IntakeSchema.parse(input);
  // Explicitly invalidate prior route selection, progress and review after changing evidence/constraints.
  return { ...session, intake, routes: buildRoutes(intake), jobTargets: [], plan: null, reviewNotes: '' };
}

export function decideEvidence(session: Session, evidenceId: string, status: Evidence['status']): Session {
  if (!session.intake.evidence.some(item => item.id === evidenceId)) throw new Error('Evidence not found.');
  const intake = {
    ...session.intake,
    evidence: session.intake.evidence.map(item => item.id === evidenceId ? { ...item, status } : item)
  };
  // Downgrading evidence invalidates any previously supported requirement links.
  const jobTargets = session.jobTargets.map(target => ({
    ...target,
    requirements: target.requirements.map(req =>
      req.status === 'supported' && req.evidenceIds.includes(evidenceId) && status !== 'confirmed'
        ? { ...req, status: 'unreviewed' as const, evidenceIds: [] } : req)
  }));
  return { ...session, intake, routes: buildRoutes(intake), jobTargets };
}

export function addJobTarget(
  session: Session,
  input: { title: string; sourceUrl: string; requirements: string[] },
  id: string,
  requirementIds: string[]
): Session {
  if (session.jobTargets.length >= 3) throw new Error('At most three job targets are supported.');
  if (input.requirements.length !== requirementIds.length) throw new Error('A source ID is required for each requirement.');
  const target: JobTarget = {
    id, title: input.title, sourceUrl: input.sourceUrl,
    requirements: input.requirements.map((text, index) => ({
      id: requirementIds[index]!, text, status: 'unreviewed' as const, evidenceIds: []
    }))
  };
  return { ...session, jobTargets: [...session.jobTargets, target] };
}

export function removeJobTarget(session: Session, targetId: string): Session {
  if (!session.jobTargets.some(item => item.id === targetId)) throw new Error('Job target not found.');
  return { ...session, jobTargets: session.jobTargets.filter(item => item.id !== targetId) };
}

export function reviewRequirement(
  session: Session,
  targetId: string,
  requirementId: string,
  status: RequirementStatus,
  evidenceIds: string[]
): Session {
  const target = session.jobTargets.find(item => item.id === targetId);
  if (!target || !target.requirements.some(item => item.id === requirementId)) {
    throw new Error('Job requirement not found.');
  }
  const matched = [...new Set(evidenceIds)];
  if (status === 'supported') {
    if (matched.length === 0) throw new Error('Link at least one confirmed achievement before marking as supported.');
    const confirmed = new Set(session.intake.evidence.filter(item => item.status === 'confirmed').map(item => item.id));
    if (matched.some(id => !confirmed.has(id))) {
      throw new Error('Only participant-confirmed evidence can support a job requirement.');
    }
  } else if (matched.length) {
    throw new Error('Clear evidence links when marking a requirement as unreviewed or a gap.');
  }
  const jobTargets = session.jobTargets.map(item => ({
    ...item,
    requirements: item.id === targetId
      ? item.requirements.map(req => req.id === requirementId
          ? { ...req, status, evidenceIds: matched } : req)
      : item.requirements
  }));
  return { ...session, jobTargets };
}

/** Only accepts portable snapshots with internally consistent references and budgets. */
export function validateRestoredSession(session: Session): Session {
  const validated = SessionSchema.parse(session);
  const confirmed = new Set(validated.intake.evidence.filter(e => e.status === 'confirmed').map(e => e.id));
  const ids = new Set(validated.intake.evidence.map(e => e.id));
  if (ids.size !== validated.intake.evidence.length) throw new Error('Duplicate evidence IDs.');
  for (const target of validated.jobTargets) {
    const requirementIds = target.requirements.map(r => r.id);
    if (new Set(requirementIds).size !== requirementIds.length) throw new Error('Duplicate requirement IDs.');
    for (const req of target.requirements) {
      if (req.status === 'supported' && (req.evidenceIds.length === 0 || req.evidenceIds.some(id => !confirmed.has(id)))) {
        throw new Error('Unsupported requirement links in snapshot.');
      }
      if (req.status !== 'supported' && req.evidenceIds.length) throw new Error('Unreviewed requirements cannot carry evidence links.');
    }
  }
  if (validated.plan) {
    const plan = validated.plan;
    if (plan.budgetMinutes !== validated.intake.weeklyHours * 60 ||
        plan.plannedMinutes !== plan.actions.reduce((n, a) => n + a.minutes, 0) ||
        plan.plannedMinutes > plan.budgetMinutes ||
        plan.actions.some((a, i) => a.day !== i + 1)) {
      throw new Error('Invalid time budget or task order.');
    }
  }
  return validated;
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
  lines.push('', '## Supplied job requirements (manual review)');
  if (session.jobTargets.length === 0) lines.push('- No job descriptions supplied.');
  for (const target of session.jobTargets) {
    lines.push('', '### ' + safe(target.title), 'Source URL: ' + (safe(target.sourceUrl) || 'Not provided'));
    for (const req of target.requirements) {
      const sources = req.evidenceIds.map(id => intake.evidence.find(e => e.id === id)?.claim ?? '(missing source)');
      lines.push('- [' + req.status + '] ' + safe(req.text) + (sources.length ? ' — Linked: ' + sources.map(safe).join('; ') : ''));
    }
  }
  const route = session.routes.find(r => r.id === plan.routeId);
  lines.push('', '## Direction to test', '- ' + route?.label + ': ' + safe(route?.target ?? ''), '- Uncertainty: ' + route?.uncertainty, '- Next test: ' + route?.nextTest, '',
    '## Seven-day actions', 'Budget: ' + plan.plannedMinutes + ' / ' + plan.budgetMinutes + ' minutes.');
  for (const task of plan.actions) lines.push('- [' + (task.completed ? 'x' : ' ') + '] Day ' + task.day + ': ' + safe(task.title) + ' (' + task.minutes + ' min)');
  lines.push('', '## Check-in', safe(session.reviewNotes) || 'No outcome recorded.', '', 'This document is user-controlled and has not been professionally verified.');
  return lines.join('\n') + '\n';
}

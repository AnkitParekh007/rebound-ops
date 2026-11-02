import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, createSession, replaceIntake, decideEvidence, selectRoute, completeAction, recordReview, exportMarkdown, IntakeSchema } from '../dist/index.js';

const uuid = 'f43c4046-cc60-4ffb-bbbe-a742d14c119e';
const evidenceId = 'f8ee1101-72e6-49a1-8d42-61d06247fda4';
const now = '2026-11-02T00:00:00.000Z';
const input = {
  role: 'Frontend engineer', location: 'Remote', weeklyHours: 3, urgency: 'quarter',
  priorities: 'Hands-on work', shiftTarget: 'AI app engineer', bridgeTarget: 'Frontend consulting',
  evidence: [{ id: evidenceId, claim: 'Led a UI migration', status: 'unverified',
    source: { kind: 'manual', label: 'Self reported, line 1' } }]
};

test('explicit source and confirmation are required', () => {
  assert.equal(IntakeSchema.safeParse(input).success, true);
  assert.equal(IntakeSchema.safeParse({ ...input, evidence: [{ id: evidenceId, claim: 'Invented result' }] }).success, false);
  assert.equal(IntakeSchema.safeParse({ ...input, weeklyHours: 0 }).success, false);
});

test('three directions remain hypotheses with no probability scores', () => {
  const session = createSession(input, uuid, now);
  assert.deepEqual(session.routes.map(r => r.id), ['return', 'shift', 'bridge']);
  assert.equal(session.routes[0].candidateEvidenceIds[0], evidenceId);
  assert.ok(!('score' in session.routes[0]));
  assert.equal(session.plan, null);
});

test('every route is bounded by declared time budget', () => {
  for (const hours of [1, 2, 3, 20]) {
    for (const route of ['return', 'shift', 'bridge']) {
      const plan = buildPlan(route, hours);
      assert.ok(plan.actions.length > 0);
      assert.ok(plan.plannedMinutes <= hours * 60);
      assert.ok(plan.actions.every(a => a.day <= 7));
    }
  }
});

test('replacing intake resets planned progress and notes', () => {
  let session = createSession(input, uuid, now);
  session = selectRoute(session, 'return');
  session = completeAction(session, session.plan.actions[0].id, true);
  session = recordReview(session, 'One step completed');
  session = replaceIntake(session, { ...input, weeklyHours: 2 });
  assert.equal(session.plan, null);
  assert.equal(session.reviewNotes, '');
  assert.equal(session.intake.weeklyHours, 2);
});

test('confirming evidence is explicit and export distinguishes its provenance', () => {
  let session = createSession(input, uuid, now);
  session = decideEvidence(session, evidenceId, 'confirmed');
  session = selectRoute(session, 'shift');
  session = completeAction(session, session.plan.actions[0].id, true);
  const md = exportMarkdown(session);
  assert.match(md, /\[confirmed\] Led a UI migration/);
  assert.match(md, /Self reported, line 1 \(manual\)/);
  assert.match(md, /\[x\] Day 1/);
  assert.throws(() => completeAction(session, 'unknown', true));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { addJobTarget, addSourceDocument, buildPlan, correctEvidence, createSession, replaceIntake, decideEvidence, selectRoute, completeAction, recordReview, reviewRequirement, exportMarkdown, IntakeSchema } from '../dist/index.js';

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

test('plans retain concrete first deliverables, target context and short-week task meaning', () => {
  const words = { return: /résumé bullet/, shift: /requirement.*achievement/, bridge: /three-line outline/ };
  for (const route of ['return', 'shift', 'bridge']) {
    const s = selectRoute(createSession(input, uuid, now), route);
    assert.match(s.plan.actions[0].title, words[route]);
    assert(s.plan.actions[0].title.includes(s.routes.find(item => item.id === route).target));
    assert.equal(s.plan.plannedMinutes, buildPlan(route, input.weeklyHours).plannedMinutes);
    assert(s.plan.actions.every(action => action.title.length <= 500));
  }
  const short = selectRoute(createSession({ ...input, weeklyHours: 1 }, uuid, now), 'shift');
  assert(short.plan.actions[1].title.includes('Record the test result'));
  assert(short.plan.plannedMinutes <= 60);
});

test('intake edits preserve plan progress, check-ins, citations and unrelated reviews', () => {
  const documentId = '9c368ce5-75bf-4ae5-9fc5-26fbe56452b8';
  const targetId = '2c102a2b-2dce-4e14-b4ac-bce70dbdbd60';
  const requirementId = 'eb44830e-dcb3-4b9e-a742-3cba44eb3314';
  let session = createSession(input, uuid, now);
  session = addSourceDocument(session, { label: 'Project note', kind: 'project_note', body: 'Led an accessible UI migration.' }, documentId);
  session = correctEvidence(session, evidenceId, {
    claim: 'Led an accessible UI migration', reason: 'Use the exact source wording',
    source: { mode: 'document', documentId, excerpt: 'Led an accessible UI migration' }
  }, now);
  session = decideEvidence(session, evidenceId, 'confirmed');
  session = addJobTarget(session, { title: 'Frontend engineer', sourceUrl: '', requirements: ['Lead a UI migration'] }, targetId, [requirementId]);
  session = reviewRequirement(session, targetId, requirementId, 'supported', [evidenceId]);
  session = selectRoute(session, 'return');
  session = completeAction(session, session.plan.actions[0].id, true);
  session = recordReview(session, 'One step completed');
  const updated = replaceIntake(session, { ...session.intake, location: 'Berlin', weeklyHours: 1 });
  assert.equal(updated.intake.location, 'Berlin');
  assert.equal(updated.intake.weeklyHours, 1);
  assert.deepEqual(updated.plan, session.plan);
  assert.equal(updated.reviewNotes, session.reviewNotes);
  assert.deepEqual(updated.sourceDocuments, session.sourceDocuments);
  assert.deepEqual(updated.corrections, session.corrections);
  assert.deepEqual(updated.intake.evidence, session.intake.evidence);
  assert.deepEqual(updated.jobTargets, session.jobTargets);
  assert.equal(selectRoute(updated, 'shift').plan.budgetMinutes, 60);

  const removed = replaceIntake(updated, { ...updated.intake, evidence: [] });
  assert.deepEqual(removed.sourceDocuments, session.sourceDocuments);
  assert.equal(removed.jobTargets[0].requirements[0].status, 'unreviewed');
  assert.deepEqual(removed.jobTargets[0].requirements[0].evidenceIds, []);
  assert.deepEqual(removed.plan, session.plan);
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


test('manual requirement links survive export and are revoked when evidence is rejected', async () => {
  const { addJobTarget, reviewRequirement, removeJobTarget, validateRestoredSession } = await import('../dist/index.js');
  const targetId = '8ec34282-38c0-44d0-81e2-6e017a055db3';
  const requirementId = 'a9958768-cb40-4855-a453-eb498e99c86d';
  let s = createSession(input, uuid, now);
  s = addJobTarget(s, { title: 'Frontend platform', sourceUrl: 'https://example.org/job', requirements: ['Test accessible UIs'] },
    targetId, [requirementId]);
  assert.equal(s.jobTargets.length, 1);
  assert.throws(() => reviewRequirement(s, targetId, requirementId, 'supported', [evidenceId]));
  s = decideEvidence(s, evidenceId, 'confirmed');
  s = reviewRequirement(s, targetId, requirementId, 'supported', [evidenceId]);
  assert.equal(validateRestoredSession(s).jobTargets[0].requirements[0].status, 'supported');
  s = selectRoute(s, 'return');
  const output = exportMarkdown(s);
  assert.match(output, /Supplied job requirements/);
  assert.match(output, /\[supported\] Test accessible UIs/);
  s = decideEvidence(s, evidenceId, 'rejected');
  assert.equal(s.jobTargets[0].requirements[0].status, 'unreviewed');
  s = removeJobTarget(s, targetId);
  assert.equal(s.jobTargets.length, 0);
});

test('invalid snapshots with fabricated evidence references are rejected', async () => {
  const { addJobTarget, validateRestoredSession } = await import('../dist/index.js');
  const targetId = '8ec34282-38c0-44d0-81e2-6e017a055db3';
  const requirementId = 'a9958768-cb40-4855-a453-eb498e99c86d';
  let s = createSession(input, uuid, now);
  s = addJobTarget(s, { title: 'Frontend platform', sourceUrl: '', requirements: ['Test accessible UIs'] }, targetId, [requirementId]);
  const tampered = { ...s, jobTargets: [{ ...s.jobTargets[0], requirements: [{
    ...s.jobTargets[0].requirements[0], status: 'supported', evidenceIds: [evidenceId]
  }] }] };
  assert.throws(() => validateRestoredSession(tampered));
});

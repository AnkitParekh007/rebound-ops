import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSession, addSourceDocument, removeSourceDocument, correctEvidence,
  decideEvidence, addJobTarget, reviewRequirement, validateRestoredSession, exportMarkdown
} from '../dist/index.js';

const sessionId = 'f43c4046-cc60-4ffb-bbbe-a742d14c119e';
const evidenceId = 'f8ee1101-72e6-49a1-8d42-61d06247fda4';
const documentId = '8ec34282-38c0-44d0-81e2-6e017a055db3';
const targetId = 'a9958768-cb40-4855-a453-eb498e99c86d';
const reqId = 'df133fb9-e29a-4991-8c53-b38b0bc0437b';
const now = '2026-11-03T10:00:00.000Z';
const sample = {
  role: 'Frontend developer', weeklyHours: 2, urgency: 'quarter',
  location: '', priorities: '', shiftTarget: '', bridgeTarget: '',
  evidence: [{ id: evidenceId, claim: 'Implemented a migration', status: 'unverified',
    source: { kind: 'manual', label: 'Participant note' } }]
};
const body = 'Context: fictional sample.\nLed an accessible component migration; validated keyboard navigation.\nOutcome: review pending.';
const excerpt = 'Led an accessible component migration; validated keyboard navigation.';
function fixture() {
  let session = createSession(sample, sessionId, now);
  session = addSourceDocument(session, { kind: 'project_note', label: 'Example project brief', body }, documentId);
  return session;
}
function correction(session, quoted = excerpt) {
  return correctEvidence(session, evidenceId, {
    expectedRevision: session.revision, claim: 'Led an accessible component migration',
    reason: 'Linked a precise sample document excerpt',
    source: { mode: 'document', documentId, excerpt: quoted }
  }, now);
}

test('source quote produces exact UTF-16 character offsets and a correction record', () => {
  const s = correction(fixture());
  const item = s.intake.evidence[0];
  assert.equal(item.status, 'unverified');
  assert.equal(item.source.kind, 'project_note');
  assert.equal(item.source.span.documentId, documentId);
  assert.equal(body.slice(item.source.span.start, item.source.span.end), excerpt);
  assert.equal(s.corrections.length, 1);
  assert.equal(s.corrections[0].previousSource.kind, 'manual');
  assert.equal(s.corrections[0].revisedSource.span.documentId, documentId);
  assert.equal(validateRestoredSession(s).intake.evidence[0].claim, 'Led an accessible component migration');
  assert.throws(() => removeSourceDocument(s, documentId), /linked evidence/);
});

test('falsified/missing/ambiguous quote and forged backup offsets are refused', () => {
  let s = fixture();
  assert.throws(() => correction(s, 'No supporting passage'), /exactly/);
  s = addSourceDocument(s, { kind: 'resume', label: 'Repeated notes', body: 'repeated repeated' },
    'a9e327e1-1a91-4abb-b009-0f6d34457b71');
  assert.throws(() => correctEvidence(s, evidenceId, {
    expectedRevision: 0, claim: 'Repeated', reason: 'Try ambiguous match',
    source: { mode: 'document', documentId: 'a9e327e1-1a91-4abb-b009-0f6d34457b71', excerpt: 'repeated' }
  }, now), /more than once/);
  const corrected = correction(s);
  const tampered = structuredClone(corrected);
  tampered.intake.evidence[0].source.span.start += 1;
  assert.throws(() => validateRestoredSession(tampered), /span/);
  const missing = structuredClone(corrected);
  missing.sourceDocuments = [];
  assert.throws(() => validateRestoredSession(missing), /span/);
});

test('correcting a confirmed achievement revokes previously supported job requirements', () => {
  let s = fixture();
  s = decideEvidence(s, evidenceId, 'confirmed');
  s = addJobTarget(s, { title: 'Frontend engineer', sourceUrl: '', requirements: ['Accessibility'] },
    targetId, [reqId]);
  s = reviewRequirement(s, targetId, reqId, 'supported', [evidenceId]);
  assert.equal(s.jobTargets[0].requirements[0].status, 'supported');
  s = correction(s);
  assert.equal(s.intake.evidence[0].status, 'unverified');
  assert.equal(s.jobTargets[0].requirements[0].status, 'unreviewed');
  assert.deepEqual(s.jobTargets[0].requirements[0].evidenceIds, []);
  s = decideEvidence(s, evidenceId, 'confirmed');
  s = reviewRequirement(s, targetId, reqId, 'supported', [evidenceId]);
  s = { ...s, plan: { routeId: 'return', budgetMinutes: 120, plannedMinutes: 30,
    actions: [{ id: 'return-1', day: 1, title: 'Check proof', minutes: 30, completed: false }] } };
  const md = exportMarkdown(s);
  assert.match(md, /exact excerpt: "Led an accessible component migration/);
  assert.match(md, /Corrections \(user-supplied\)/);
  assert.match(md, /Linked a precise sample document excerpt/);
  assert.equal(validateRestoredSession(s).jobTargets[0].requirements[0].status, 'supported');
});

test('legacy backups with no source arrays retain unanchored evidence', () => {
  const s = createSession(sample, sessionId, now);
  const legacy = structuredClone(s);
  delete legacy.sourceDocuments;
  delete legacy.corrections;
  legacy.intake.evidence[0].source = { kind: 'resume', label: 'Old résumé note' };
  const parsed = validateRestoredSession(legacy);
  assert.deepEqual(parsed.sourceDocuments, []);
  assert.deepEqual(parsed.corrections, []);
  assert.equal(parsed.intake.evidence[0].source.span, undefined);
});

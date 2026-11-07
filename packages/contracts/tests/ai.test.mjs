import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiPayload, validateAiAnalysis, createSession, decideEvidence, addJobTarget } from '../dist/index.js';

const evidenceId = '38ab3f7d-35de-4704-8e62-02a3c747190f';
const targetId = '8ec34282-38c0-44d0-81e2-6e017a055db3';
const requirementId = 'a9958768-cb40-4855-a453-eb498e99c86d';
function fixture() {
  let s = createSession({
    role: 'Frontend engineer', location: 'Personal location not shared',
    weeklyHours: 2, urgency: 'soon', priorities: 'Private medical notes must NOT leave this machine',
    shiftTarget: '', bridgeTarget: '',
    evidence: [{
      id: evidenceId, claim: 'Led a component migration', status: 'unverified',
      source: { kind: 'manual', label: 'Personal résumé section 5' }
    }]
  }, 'f43c4046-cc60-4ffb-bbbe-a742d14c119e', '2026-11-02T00:00:00.000Z');
  s = addJobTarget(s, { title: 'Frontend platform', sourceUrl: 'https://example.org/jobs',
    requirements: ['Build accessible components'] }, targetId, [requirementId]);
  return s;
}
test('AI preview excludes location, urgency, priorities, source labels, and unconfirmed claims', () => {
  let s = fixture();
  let payload = createAiPayload(s, targetId);
  assert.deepEqual(payload.evidence, []);
  s = decideEvidence(s, evidenceId, 'confirmed');
  payload = createAiPayload(s, targetId);
  const encoded = JSON.stringify(payload);
  assert.match(encoded, /Led a component migration/);
  assert.doesNotMatch(encoded, /Private medical notes|Personal location|soon|Résumé section 5/i);
  assert.equal(payload.target.requirements.length, 1);
});

test('AI output cannot inject a fabricated evidence ID or omit a job requirement', () => {
  let s = decideEvidence(fixture(), evidenceId, 'confirmed');
  const payload = createAiPayload(s, targetId);
  const response = (id = evidenceId) => ({
    findings: [{ requirementId, assessment: 'possible_support', evidenceIds: [id],
      explanation: 'The claimed migration may be relevant, but accessibility work is unverified.',
      nextTest: 'Show accessible API design and testing.' }],
    caution: 'User-entered claims need independent verification.'
  });
  assert.equal(validateAiAnalysis(payload, response()).findings.length, 1);
  assert.throws(() => validateAiAnalysis(payload, response('2d0ecf4b-722f-4f5d-8efe-3c49dfebc9c0')));
  assert.throws(() => validateAiAnalysis(payload, { findings: [], caution: 'Nothing found' }));
  assert.throws(() => validateAiAnalysis(payload, {
    ...response(), findings: [{ ...response().findings[0], assessment: 'gap' }]
  }));
});

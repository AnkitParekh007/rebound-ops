import test from 'node:test';
import assert from 'node:assert/strict';
import { EVIDENCE_REVIEW_PROMPT, PROMPT_FINGERPRINT, PROMPT_VERSION } from '../../../dist/api/prompt.js';
import { loadAiProvider } from '../../../dist/api/provider.js';
import { buildApp } from '../../../dist/api/app.js';

/**
 * One fingerprint per prompt version. Pin a new version here, then run the
 * live golden-set evaluation before enabling it for participants.
 */
const PINNED = {
  '1.0.0': 'c55002ee04c4d83e',
  '1.1.0': 'e1e698e9cd2549c5'
};

test('prompt text is pinned to its version (no silent prompt edits)', () => {
  const expected = PINNED[EVIDENCE_REVIEW_PROMPT.version];
  assert.ok(expected, 'new prompt version ' + EVIDENCE_REVIEW_PROMPT.version + ': pin its fingerprint here');
  assert.equal(PROMPT_FINGERPRINT, expected,
    'prompt text changed without a version bump; bump EVIDENCE_REVIEW_PROMPT.version and re-run the evaluation');
  assert.equal(PROMPT_VERSION, 'evidence-review@' + EVIDENCE_REVIEW_PROMPT.version);
});

test('the Anthropic adapter reports its prompt version without making any call', () => {
  const saved = { ...process.env };
  try {
    process.env.REBOUNDOPS_AI_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'test-placeholder-not-a-real-key';
    const provider = loadAiProvider();
    assert.equal(provider.promptVersion, PROMPT_VERSION);
  } finally {
    for (const key of ['REBOUNDOPS_AI_ENABLED', 'ANTHROPIC_API_KEY']) {
      if (key in saved) process.env[key] = saved[key]; else delete process.env[key];
    }
  }
});

test('status and every analysis response record model and prompt version', async () => {
  const app = buildApp({ aiProvider: {
    name: 'fictional-mock', model: 'offline-evaluation', promptVersion: PROMPT_VERSION,
    async analyze(payload) {
      return { findings: payload.target.requirements.map(r => ({
        requirementId: r.id, assessment: 'gap', evidenceIds: [],
        explanation: 'No confirmed claim addresses this.', nextTest: 'Try a small sample task.'
      })), caution: 'Claims are not independent proof.' };
    }
  } });
  try {
    const status = (await app.inject({ method: 'GET', url: '/api/ai/status' })).json();
    assert.equal(status.promptVersion, PROMPT_VERSION);
    assert.equal(status.model, 'offline-evaluation');
    let r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake: {
      role: 'Fictional engineer', location: '', weeklyHours: 2, urgency: 'quarter',
      priorities: '', shiftTarget: '', bridgeTarget: '', evidence: [] } } });
    let s = r.json();
    r = await app.inject({ method: 'POST', url: '/api/sessions/' + s.id + '/targets', payload: {
      expectedRevision: s.revision, title: 'Fictional role', sourceUrl: '', requirements: ['Write tests'] } });
    s = r.json();
    const targetId = s.jobTargets[0].id;
    const preview = (await app.inject({ method: 'POST', url: '/api/sessions/' + s.id + '/ai/preview', payload: { targetId } })).json();
    r = await app.inject({ method: 'POST', url: '/api/sessions/' + s.id + '/ai/analyze', payload: {
      targetId, expectedRevision: s.revision, previewHash: preview.previewHash, consent: true } });
    assert.equal(r.statusCode, 200);
    assert.equal(r.json().promptVersion, PROMPT_VERSION);
    assert.equal(r.json().model, 'offline-evaluation');
    assert.equal(r.json().autoApplied, false);
  } finally { await app.close(); }
});

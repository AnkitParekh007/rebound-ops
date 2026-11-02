import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../../dist/api/app.js';

const evidenceId = '38ab3f7d-35de-4704-8e62-02a3c747190f';
const intake = {
  role: 'Frontend engineer', location: 'Remote', weeklyHours: 2, urgency: 'quarter',
  priorities: 'Hands-on work', shiftTarget: 'AI application engineer',
  bridgeTarget: 'Frontend consulting',
  evidence: [{ id: evidenceId, claim: 'Led component migration',
    status: 'unverified', source: { kind: 'manual', label: 'Self-reported example' } }]
};

test('local API health never claims AI or persistence', async () => {
  const app = buildApp();
  const r = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().aiEnabled, false);
  assert.equal(r.json().persistence, 'memory');
  await app.close();
});

test('create, confirm, select, complete, review and export', async () => {
  const app = buildApp();
  const create = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
  assert.equal(create.statusCode, 201);
  let session = create.json();
  assert.equal(session.revision, 0);
  assert.equal(session.routes.length, 3);

  let response = await app.inject({
    method: 'PUT', url: '/api/sessions/' + session.id + '/evidence/' + evidenceId,
    payload: { expectedRevision: session.revision, status: 'confirmed' }
  });
  assert.equal(response.statusCode, 200);
  session = response.json();
  assert.equal(session.intake.evidence[0].status, 'confirmed');

  response = await app.inject({
    method: 'PUT', url: '/api/sessions/' + session.id + '/route',
    payload: { expectedRevision: session.revision, routeId: 'shift' }
  });
  assert.equal(response.statusCode, 200);
  session = response.json();
  assert.ok(session.plan.plannedMinutes <= 120);

  response = await app.inject({
    method: 'PUT', url: '/api/sessions/' + session.id + '/actions/' + session.plan.actions[0].id,
    payload: { expectedRevision: session.revision, completed: true }
  });
  assert.equal(response.statusCode, 200);
  session = response.json();
  assert.equal(session.plan.actions[0].completed, true);

  response = await app.inject({
    method: 'PUT', url: '/api/sessions/' + session.id + '/review',
    payload: { expectedRevision: session.revision, notes: 'Made progress on the sample' }
  });
  assert.equal(response.statusCode, 200);
  session = response.json();
  const exported = await app.inject({ method: 'GET', url: '/api/sessions/' + session.id + '/export' });
  assert.equal(exported.statusCode, 200);
  assert.match(exported.body, /\[confirmed\] Led component migration/);
  assert.match(exported.body, /\[x\] Day 1/);
  assert.match(exported.body, /Made progress on the sample/);
  await app.close();
});

test('invalid requests, stale revisions and untrusted origins are rejected', async () => {
  const app = buildApp();
  let response = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake: { ...intake, weeklyHours: 99 } } });
  assert.equal(response.statusCode, 400);

  response = await app.inject({
    method: 'POST', url: '/api/sessions', headers: { origin: 'https://untrusted.example' }, payload: { intake }
  });
  assert.equal(response.statusCode, 403);
  response = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
  const session = response.json();
  response = await app.inject({ method: 'PUT', url: '/api/sessions/' + session.id + '/route', payload: { expectedRevision: 999, routeId: 'return' } });
  assert.equal(response.statusCode, 409);
  response = await app.inject({ method: 'GET', url: '/api/sessions/missing' });
  assert.equal(response.statusCode, 404);
  await app.close();
});

test('changing constraints resets the plan and loses old progress intentionally', async () => {
  const app = buildApp();
  let r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
  let s = r.json();
  r = await app.inject({ method: 'PUT', url: '/api/sessions/' + s.id + '/route', payload: { expectedRevision: s.revision, routeId: 'return' } });
  s = r.json();
  r = await app.inject({ method: 'PUT', url: '/api/sessions/' + s.id + '/intake',
    payload: { expectedRevision: s.revision, intake: { ...intake, weeklyHours: 1 } } });
  s = r.json();
  assert.equal(s.plan, null);
  assert.equal(s.intake.weeklyHours, 1);
  await app.close();
});


test('job requirements require confirmed evidence for support and are invalidated on downgrade', async () => {
  const app = buildApp();
  let r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
  let s = r.json();
  const path = '/api/sessions/' + s.id;
  r = await app.inject({ method: 'POST', url: path + '/targets',
    payload: {
      expectedRevision: s.revision, title: 'Frontend platform engineer',
      sourceUrl: 'https://example.org/careers/platform', requirements: [
        'Design reusable frontend components', 'Evaluate production architecture'
      ]
    } });
  assert.equal(r.statusCode, 200);
  s = r.json();
  assert.equal(s.jobTargets.length, 1);
  assert.equal(s.jobTargets[0].requirements[0].status, 'unreviewed');
  const target = s.jobTargets[0];
  const reqId = target.requirements[0].id;
  r = await app.inject({ method: 'PUT', url: path + '/targets/' + target.id + '/requirements/' + reqId,
    payload: { expectedRevision: s.revision, status: 'supported', evidenceIds: [evidenceId] } });
  assert.equal(r.statusCode, 400, 'unconfirmed evidence must not count as support');
  r = await app.inject({ method: 'PUT', url: path + '/evidence/' + evidenceId,
    payload: { expectedRevision: s.revision, status: 'confirmed' } });
  assert.equal(r.statusCode, 200);
  s = r.json();
  r = await app.inject({ method: 'PUT', url: path + '/targets/' + target.id + '/requirements/' + reqId,
    payload: { expectedRevision: s.revision, status: 'supported', evidenceIds: [evidenceId] } });
  assert.equal(r.statusCode, 200);
  s = r.json();
  assert.equal(s.jobTargets[0].requirements[0].status, 'supported');
  r = await app.inject({ method: 'PUT', url: path + '/evidence/' + evidenceId,
    payload: { expectedRevision: s.revision, status: 'rejected' } });
  assert.equal(r.statusCode, 200);
  s = r.json();
  assert.equal(s.jobTargets[0].requirements[0].status, 'unreviewed');
  assert.deepEqual(s.jobTargets[0].requirements[0].evidenceIds, []);
  await app.close();
});

test('explicit snapshot restore preserves actions without using disk; deletion is permanent for current API process', async () => {
  const app = buildApp();
  let r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
  let s = r.json();
  r = await app.inject({ method: 'PUT', url: '/api/sessions/' + s.id + '/route',
    payload: { expectedRevision: s.revision, routeId: 'return' } });
  s = r.json();
  r = await app.inject({ method: 'POST', url: '/api/sessions/restore',
    payload: { session: s } });
  assert.equal(r.statusCode, 201);
  const restored = r.json();
  assert.notEqual(restored.id, s.id);
  assert.equal(restored.revision, 0);
  assert.equal(restored.plan.routeId, 'return');

  const tampered = { ...s, plan: { ...s.plan, plannedMinutes: 99999 } };
  r = await app.inject({ method: 'POST', url: '/api/sessions/restore', payload: { session: tampered } });
  assert.equal(r.statusCode, 400);

  r = await app.inject({ method: 'DELETE', url: '/api/sessions/' + restored.id,
    payload: { expectedRevision: restored.revision } });
  assert.equal(r.statusCode, 204);
  r = await app.inject({ method: 'GET', url: '/api/sessions/' + restored.id });
  assert.equal(r.statusCode, 404);
  await app.close();
});


test('opt-in AI preview shares only confirmed claims and mock analysis never mutates the session', async () => {
  let calls = 0;
  const app = buildApp({
    aiProvider: {
      name: 'mock-offline',
      model: 'test-only',
      async analyze(payload) {
        calls++;
        return {
          findings: payload.target.requirements.map(r => ({
            requirementId: r.id, assessment: 'uncertain', evidenceIds: [],
            explanation: 'A user claim cannot establish independent evidence of this requirement.',
            nextTest: 'Review one demonstrable work sample.'
          })),
          caution: 'No independent credentials or job-market information were checked.'
        };
      }
    }
  });
  let r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
  let s = r.json();
  const base = '/api/sessions/' + s.id;
  r = await app.inject({ method: 'POST', url: base + '/targets',
    payload: { expectedRevision: s.revision, title: 'Frontend platform',
      sourceUrl: '', requirements: ['Deliver accessible UI libraries'] } });
  s = r.json();
  const targetId = s.jobTargets[0].id;
  r = await app.inject({ method: 'POST', url: base + '/ai/preview', payload: { targetId } });
  assert.equal(r.statusCode, 200);
  let preview = r.json();
  assert.equal(preview.enabled, true);
  assert.equal(calls, 0, 'preview must not invoke the provider');
  assert.deepEqual(preview.payload.evidence, []);
  assert.ok(!JSON.stringify(preview.payload).includes(intake.location));
  assert.ok(!JSON.stringify(preview.payload).includes(intake.priorities));
  r = await app.inject({ method: 'POST', url: base + '/ai/analyze',
    payload: { targetId, expectedRevision: s.revision, previewHash: preview.previewHash, consent: false } });
  assert.equal(r.statusCode, 400, 'explicit consent is required');
  r = await app.inject({ method: 'POST', url: base + '/ai/analyze',
    payload: { targetId, expectedRevision: s.revision, previewHash: 'a'.repeat(64), consent: true } });
  assert.equal(r.statusCode, 409);
  assert.equal(calls, 0);
  r = await app.inject({ method: 'POST', url: base + '/ai/analyze',
    payload: { targetId, expectedRevision: s.revision, previewHash: preview.previewHash, consent: true } });
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().autoApplied, false);
  assert.equal(calls, 1);
  const saved = await app.inject({ method: 'GET', url: base });
  assert.equal(saved.json().revision, s.revision, 'AI output must not modify the session');
  await app.close();
});

test('invalid AI suggestions and disabled-by-default provider are handled safely', async () => {
  const defaultApp = buildApp();
  let response = await defaultApp.inject({ method: 'GET', url: '/api/ai/status' });
  assert.equal(response.json().enabled, false);
  await defaultApp.close();
  const invalidProvider = {
    name: 'mock-offline', model: 'test-only',
    async analyze() {
      return {
        findings: [{ requirementId: '309c9b50-5586-4ae4-8377-cf2377eefac5',
          assessment: 'possible_support', evidenceIds: ['309c9b50-5586-4ae4-8377-cf2377eefac5'],
          explanation: 'A fabricated claim', nextTest: 'Do something' }],
        caution: 'Not validated'
      };
    }
  };
  const app = buildApp({ aiProvider: invalidProvider });
  let r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
  let s = r.json();
  const base = '/api/sessions/' + s.id;
  r = await app.inject({ method: 'POST', url: base + '/targets',
    payload: { expectedRevision: s.revision, title: 'Frontend platform',
      sourceUrl: '', requirements: ['Deliver accessible UI libraries'] } });
  s = r.json();
  const targetId = s.jobTargets[0].id;
  r = await app.inject({ method: 'POST', url: base + '/ai/preview', payload: { targetId } });
  const preview = r.json();
  r = await app.inject({ method: 'POST', url: base + '/ai/analyze',
    payload: { targetId, expectedRevision: s.revision, previewHash: preview.previewHash, consent: true } });
  assert.equal(r.statusCode, 502, 'invalid model output must be discarded');
  await app.close();
});

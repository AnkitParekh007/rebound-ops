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

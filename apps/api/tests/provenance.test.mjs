import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../../dist/api/app.js';

const evidenceId = 'f8ee1101-72e6-49a1-8d42-61d06247fda4';
const intake = {
  role: 'Fictional Frontend Developer', location: 'Remote', weeklyHours: 3,
  urgency: 'quarter', priorities: '', shiftTarget: 'Platform engineer',
  bridgeTarget: 'Contract frontend work',
  evidence: [{ id: evidenceId, claim: 'Built UI components', status: 'unverified',
    source: { kind: 'manual', label: 'Fictional participant statement' } }]
};
const body = 'Project summary: Built accessible UI components for a fictional product.';

test('local API document-to-claim correction, confirmation, revocation and export', async () => {
  const app = buildApp();
  try {
    let response = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
    assert.equal(response.statusCode, 201);
    let s = response.json();
    const path = '/api/sessions/' + s.id;
    response = await app.inject({ method: 'POST', url: path + '/documents',
      payload: { expectedRevision: s.revision, kind: 'project_note',
        label: 'Fictional project summary', body } });
    assert.equal(response.statusCode, 200);
    s = response.json();
    const documentId = s.sourceDocuments[0].id;
    response = await app.inject({ method: 'PUT', url: path + '/evidence/' + evidenceId + '/correction',
      payload: { expectedRevision: s.revision, claim: 'Built accessible UI components',
        reason: 'Fixed the claim and added an exact quote',
        source: { mode: 'document', documentId,
          excerpt: 'Built accessible UI components' } } });
    assert.equal(response.statusCode, 200);
    s = response.json();
    assert.equal(s.intake.evidence[0].status, 'unverified');
    assert.equal(s.corrections.length, 1);
    assert.equal(s.intake.evidence[0].source.span.start, body.indexOf('Built accessible UI components'));
    response = await app.inject({ method: 'PUT', url: path + '/evidence/' + evidenceId,
      payload: { expectedRevision: s.revision, status: 'confirmed' } });
    assert.equal(response.statusCode, 200);
    s = response.json();
    response = await app.inject({ method: 'POST', url: path + '/targets',
      payload: { expectedRevision: s.revision, title: 'UI engineer',
        sourceUrl: '', requirements: ['Build accessible UI'] } });
    assert.equal(response.statusCode, 200);
    s = response.json();
    const targetId = s.jobTargets[0].id;
    const reqId = s.jobTargets[0].requirements[0].id;
    response = await app.inject({ method: 'PUT',
      url: path + '/targets/' + targetId + '/requirements/' + reqId,
      payload: { expectedRevision: s.revision, status: 'supported', evidenceIds: [evidenceId] } });
    assert.equal(response.statusCode, 200);
    s = response.json();
    response = await app.inject({ method: 'PUT', url: path + '/evidence/' + evidenceId + '/correction',
      payload: { expectedRevision: s.revision, claim: 'Built UI components with tests',
        reason: 'Adjusted claim after review', source: { mode: 'manual', label: 'Self-revised' } } });
    assert.equal(response.statusCode, 200);
    s = response.json();
    assert.equal(s.jobTargets[0].requirements[0].status, 'unreviewed');
    assert.deepEqual(s.jobTargets[0].requirements[0].evidenceIds, []);
    response = await app.inject({ method: 'DELETE', url: path + '/documents/' + documentId,
      payload: { expectedRevision: s.revision } });
    assert.equal(response.statusCode, 200);
    s = response.json();
    assert.equal(s.sourceDocuments.length, 0);
    response = await app.inject({ method: 'PUT', url: path + '/route',
      payload: { expectedRevision: s.revision, routeId: 'return' } });
    assert.equal(response.statusCode, 200);
    s = response.json();
    const exported = await app.inject({ method: 'GET', url: path + '/export' });
    assert.match(exported.body, /Corrections \(user-supplied\)/);
    assert.match(exported.body, /Adjusted claim after review/);
  } finally { await app.close(); }
});

test('API refuses forged citations, missing excerpts and stale revisions', async () => {
  const app = buildApp();
  try {
    let r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
    let s = r.json();
    const path = '/api/sessions/' + s.id;
    r = await app.inject({ method: 'POST', url: path + '/documents',
      payload: { expectedRevision: s.revision, kind: 'resume', label: 'Fictional résumé',
        body: 'First success. Second success.' } });
    assert.equal(r.statusCode, 200);
    s = r.json();
    const documentId = s.sourceDocuments[0].id;
    const basePayload = { expectedRevision: s.revision, claim: 'Claim', reason: 'Better citation' };
    r = await app.inject({ method: 'PUT', url: path + '/evidence/' + evidenceId + '/correction',
      payload: { ...basePayload, source: { mode: 'document', documentId, excerpt: 'Nonexistent' } } });
    assert.equal(r.statusCode, 400);
    r = await app.inject({ method: 'PUT', url: path + '/evidence/' + evidenceId + '/correction',
      payload: { ...basePayload, source: { mode: 'manual', label: 'Self' }, extra: 'unsafe' } });
    assert.equal(r.statusCode, 400);
    r = await app.inject({ method: 'PUT', url: path + '/evidence/' + evidenceId + '/correction',
      payload: { ...basePayload, expectedRevision: 999, source: { mode: 'manual', label: 'Self' } } });
    assert.equal(r.statusCode, 409);
    const tampered = structuredClone(s);
    tampered.intake.evidence[0].source = {
      kind: 'resume', label: 'Fictional résumé', excerpt: 'First success.',
      span: { documentId, start: 4, end: 18 }
    };
    r = await app.inject({ method: 'POST', url: '/api/sessions/restore',
      payload: { session: tampered } });
    assert.equal(r.statusCode, 400);
    const restored = await app.inject({ method: 'POST', url: '/api/sessions/restore',
      payload: { session: s } });
    assert.equal(restored.statusCode, 201);
    assert.equal(restored.json().sourceDocuments.length, 1);
  } finally { await app.close(); }
});

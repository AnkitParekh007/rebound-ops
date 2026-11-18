import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { ApplicationView, Assessment, AssessmentSummary, DashboardSummary, JobCreateResult, JobExtraction } from '@reboundops/contracts';
import { openStore, type Store } from '@reboundops/storage';
import { buildServer, Workspace } from '../src/index.ts';

const ORIGIN = 'http://localhost:4174';
const fixture = (name: string) =>
  readFileSync(new URL(`../../../tests/fixtures/jobs/${name}`, import.meta.url), 'utf8');

let store: Store;
let app: FastifyInstance;
let clock: Date;

beforeEach(() => {
  clock = new Date('2026-03-01T09:00:00.000Z');
  store = openStore({ memory: true });
  app = buildServer({ workspace: new Workspace(store, { now: () => clock }), allowedOrigins: [ORIGIN], logLevel: 'silent' });
});
afterEach(async () => {
  await app.close();
  store.close();
});

const send = (method: 'GET' | 'POST' | 'PUT', url: string, body?: unknown, headers: Record<string, string> = {}) =>
  app.inject({
    method,
    url,
    headers: { host: '127.0.0.1:4175', ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
  });

async function saveLabelledJob(): Promise<JobCreateResult> {
  const ex = (await send('POST', '/api/jobs/extract', { description: fixture('labelled.txt'), sourceUrl: 'https://careers.example.test/jobs/77' })).json<JobExtraction>();
  const res = await send('POST', '/api/jobs', {
    title: ex.title!.value,
    employer: ex.employer!.value,
    location: ex.location!.value,
    salary: ex.salary!.value,
    workArrangement: ex.workArrangement!.value,
    sourceUrl: ex.sourceUrl,
    description: ex.description,
    provenance: {
      title: { origin: 'extracted', evidence: ex.title!.evidence },
      employer: { origin: 'extracted', evidence: ex.employer!.evidence },
      location: { origin: 'extracted', evidence: ex.location!.evidence },
      salary: { origin: 'extracted', evidence: ex.salary!.evidence },
    },
  });
  expect(res.statusCode).toBe(201);
  return res.json<JobCreateResult>();
}

describe('request guards', () => {
  it('rejects non-loopback Host headers (DNS rebinding)', async () => {
    const res = await send('GET', '/api/health', undefined, { host: 'attacker.example:4175' });
    expect(res.statusCode).toBe(421);
  });

  it('rejects unknown origins and allows the configured one with CORS headers', async () => {
    expect((await send('GET', '/api/health', undefined, { origin: 'https://evil.example' })).statusCode).toBe(403);
    const ok = await send('GET', '/api/health', undefined, { origin: ORIGIN });
    expect(ok.statusCode).toBe(200);
    expect(ok.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(ok.headers['x-content-type-options']).toBe('nosniff');
    expect(ok.headers['cache-control']).toBe('no-store');
  });

  it('requires JSON for state-changing requests (blocks form CSRF)', async () => {
    const res = await app.inject({ method: 'PUT', url: '/api/profile', headers: { host: 'localhost', 'content-type': 'application/x-www-form-urlencoded' }, payload: 'a=b' });
    expect(res.statusCode).toBe(415);
  });

  it('returns structured validation errors', async () => {
    const res = await send('PUT', '/api/onboarding', { aiMode: 'telepathy' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('invalid_request');
  });

  it('returns 404 JSON for unknown routes and records', async () => {
    expect((await send('GET', '/api/nope')).json().error.code).toBe('not_found');
    expect((await send('GET', '/api/applications/missing')).statusCode).toBe(404);
  });
});

describe('health', () => {
  it('reports AI off by default', async () => {
    expect((await send('GET', '/api/health')).json()).toMatchObject({ status: 'ok', schemaVersion: 1, aiMode: 'off' });
  });
});

describe('onboarding and profile', () => {
  it('supports progressing, skipping and persisting goals', async () => {
    expect((await send('GET', '/api/onboarding')).json().status).toBe('not_started');
    await send('PUT', '/api/onboarding', { status: 'in_progress', step: 1, aiMode: 'off' });
    const after = (await send('PUT', '/api/onboarding', { step: 2, goals: { targetRoles: ['Data Analyst', ' data analyst '], timeline: 'within_3_months' } })).json();
    expect(after).toMatchObject({ status: 'in_progress', step: 2, goals: { targetRoles: ['Data Analyst'], timeline: 'within_3_months' } });
    const skipped = (await send('PUT', '/api/onboarding', { status: 'skipped' })).json();
    expect(skipped.goals.targetRoles).toEqual(['Data Analyst']);
  });

  it('saves preferences, normalising lists and validating experience dates', async () => {
    const saved = (await send('PUT', '/api/profile', {
      displayName: 'Robin Example',
      targetRoles: ['Analyst', 'analyst'],
      preferredCountries: ['Portugal', 'Spain'],
      workArrangements: ['remote', 'hybrid', 'remote'],
      openToRelocation: 'yes',
      skills: ['SQL', 'Python'],
      experience: [{ id: 'e1', employer: 'Fictional Corp', title: 'Analyst', start: '2021-04', end: null, verified: true }],
    })).json();
    expect(saved.targetRoles).toEqual(['Analyst']);
    expect(saved.workArrangements).toEqual(['remote', 'hybrid']);
    expect(saved.updatedAt).toBe(clock.toISOString());

    const bad = await send('PUT', '/api/profile', { experience: [{ id: 'e1', employer: 'X', title: 'Y', start: '2022-05', end: '2021-01' }] });
    expect(bad.statusCode).toBe(422);
  });
});

describe('job intake', () => {
  it('requires some input to extract', async () => {
    expect((await send('POST', '/api/jobs/extract', { description: '  ' })).statusCode).toBe(422);
  });

  it('rejects non-http source URLs', async () => {
    expect((await send('POST', '/api/jobs/extract', { description: 'x', sourceUrl: 'javascript:alert(1)' })).statusCode).toBe(400);
  });

  it('saves a job as unverified and starts tracking it as discovered', async () => {
    const { job, application } = await saveLabelledJob();
    expect(job.verification.status).toBe('unverified');
    expect(job.salary).toBe('€68,000 - €82,000 per year');
    expect(application.status).toBe('discovered');
    expect(application.activity).toHaveLength(1);
    expect(application.allowedNext).toContain('shortlisted');
  });

  it('refuses extracted fields that the description does not support', async () => {
    const res = await send('POST', '/api/jobs', {
      title: 'Data Engineer',
      employer: 'Example Co',
      salary: '$300,000',
      description: 'Data Engineer at Example Co',
      provenance: {
        title: { origin: 'user', evidence: null },
        employer: { origin: 'user', evidence: null },
        location: null,
        salary: { origin: 'extracted', evidence: 'Salary: $300,000' },
      },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('ungrounded_fields');
  });

  it('flags duplicates by canonical URL unless explicitly allowed', async () => {
    await saveLabelledJob();
    const dup = await send('POST', '/api/jobs', {
      title: 'Another title',
      employer: 'Someone',
      sourceUrl: 'https://careers.example.test/jobs/77/?utm_campaign=x',
      provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null },
    });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.details.existingJobIds).toHaveLength(1);
  });
});

describe('tracker workflow', () => {
  it('moves through statuses, requires confirmation for applied, and keeps an activity trail', async () => {
    const { application } = await saveLabelledJob();
    const url = `/api/applications/${application.id}/transitions`;

    expect((await send('POST', url, { to: 'offer' })).statusCode).toBe(409);
    for (const to of ['shortlisted', 'preparing', 'ready_for_review'] as const) {
      clock = new Date(clock.getTime() + 60_000);
      expect((await send('POST', url, { to })).statusCode).toBe(200);
    }
    const unconfirmed = await send('POST', url, { to: 'applied' });
    expect(unconfirmed.statusCode).toBe(428);
    expect(unconfirmed.json().error.code).toBe('confirmation_required');

    clock = new Date(clock.getTime() + 60_000);
    const applied = (await send('POST', url, { to: 'applied', confirmSubmitted: true })).json<ApplicationView>();
    expect(applied.status).toBe('applied');
    expect(applied.appliedConfirmedAt).toBe(clock.toISOString());

    const noted = (await send('POST', `/api/applications/${application.id}/notes`, { note: 'Recruiter said decisions in two weeks.' })).json<ApplicationView>();
    expect(noted.activity.map((a) => a.kind)).toEqual(['note', 'status_changed', 'status_changed', 'status_changed', 'status_changed', 'created']);
    expect(noted.activity[1]?.note).toMatch(/confirmed you submitted/);
  });

  it('derives the dashboard from saved records', async () => {
    const { application } = await saveLabelledJob();
    await send('POST', `/api/applications/${application.id}/transitions`, { to: 'applied', confirmSubmitted: true });
    clock = new Date('2026-03-12T09:00:00.000Z');
    const dash = (await send('GET', '/api/dashboard')).json<DashboardSummary>();
    expect(dash).toMatchObject({ total: 1, active: 1, submitted: 1 });
    expect(dash.byStatus.applied).toBe(1);
    expect(dash.nextActions[0]?.label).toMatch(/consider a follow-up/);
  });

  it('exports everything as a versioned bundle', async () => {
    await saveLabelledJob();
    const res = await send('GET', '/api/export');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="reboundops-export-2026-03-01.json"/);
    expect(res.json()).toMatchObject({ format: 'reboundops-export', formatVersion: 1, jobs: [{ employer: 'Brightwater Analytics' }] });
  });
});

describe('assessment', () => {
  it('assesses against the current profile and reflects profile changes', async () => {
    const { application } = await saveLabelledJob();
    const url = `/api/applications/${application.id}/assessment`;

    const before = (await send('GET', url)).json<Assessment>();
    expect(before.fit.overall).toBeNull();
    expect(before.eligibility.status).toBe('unconfirmed');
    expect(before.missingInfo).toContain('Countries where you are authorised to work');

    await send('PUT', '/api/onboarding', { goals: { targetRoles: ['Platform Engineer'] } });
    await send('PUT', '/api/profile', {
      skills: ['TypeScript', 'PostgreSQL'],
      preferredCountries: ['Portugal'],
      workArrangements: ['hybrid'],
      workAuthorizedCountries: ['Portugal'],
      requiresSponsorship: 'no',
    });
    const after = (await send('GET', url)).json<Assessment>();
    expect(after.eligibility.status).toBe('confirmed');
    expect(after.fit.criteria.find((c) => c.key === 'role')?.score).toBe(5);
    expect(after.fit.overall).not.toBeNull();
    expect(after.rubricVersion).toBe('fit-2026.1');

    const summaries = (await send('GET', '/api/assessments')).json<AssessmentSummary[]>();
    expect(summaries).toEqual([{ applicationId: application.id, overall: after.fit.overall, eligibility: 'confirmed' }]);
  });

  it('exposes the rubric definition and 404s for unknown applications', async () => {
    const rubric = (await send('GET', '/api/rubric')).json();
    expect(rubric.criteria.map((c: { key: string }) => c.key)).toEqual(['role', 'skills', 'experience', 'location']);
    expect((await send('GET', '/api/applications/nope/assessment')).statusCode).toBe(404);
  });
});

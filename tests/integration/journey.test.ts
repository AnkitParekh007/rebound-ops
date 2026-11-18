/**
 * The CLAUDE.md acceptance journey, end to end through the real HTTP API and a
 * real on-disk database, with AI off and with AI on (mocked local model):
 * launch → onboarding/skip → import resume → preferences → add job → grounded
 * assessment → tailored editable drafts → PDF/DOCX → official link →
 * user-confirmed status → follow-up → analytics. Fictional data only.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openStore } from '@reboundops/storage';
import { renderDocx, docxToText, pdfTextOf } from '@reboundops/documents';
import { buildServer, Workspace } from '../../apps/api/src/index.ts';

const resumeText = readFileSync(new URL('../fixtures/resumes/jordan-fictional.txt', import.meta.url), 'utf8');
const posting = readFileSync(new URL('../fixtures/jobs/labelled.txt', import.meta.url), 'utf8');

async function journey(aiOn: boolean) {
  const dir = mkdtempSync(join(tmpdir(), 'rbo-journey-'));
  let clock = new Date('2026-05-04T09:00:00.000Z');
  const aiCalls: string[] = [];
  const aiFetch = async (input: string | URL | Request, init?: RequestInit) => {
    aiCalls.push(String(input));
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const original = /<original>\n([\s\S]*?)\n<\/original>/.exec(body.messages?.[1]?.content ?? '')?.[1] ?? '';
    return new Response(JSON.stringify({ message: { content: original.replace(/^Built/, 'Created') } }), { status: 200 });
  };
  const open = () => {
    const store = openStore({ dataDir: dir });
    const app = buildServer({ workspace: new Workspace(store, { now: () => clock, env: {}, aiFetch }), allowedOrigins: ['http://localhost:4174'], logLevel: 'silent' });
    return { store, app };
  };
  let { store, app } = open();
  const call = async (method: 'GET' | 'POST' | 'PUT', url: string, body?: unknown) => {
    const res = await app.inject({ method, url, headers: { host: '127.0.0.1', ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, ...(body === undefined ? {} : { payload: JSON.stringify(body) }) });
    return res;
  };
  const ok = async (method: 'GET' | 'POST' | 'PUT', url: string, body?: unknown) => {
    const res = await call(method, url, body);
    expect(res.statusCode, `${method} ${url}: ${res.payload.slice(0, 200)}`).toBeLessThan(300);
    return res;
  };

  try {
    // 1. Launch
    expect((await ok('GET', '/api/health')).json()).toMatchObject({ status: 'ok', aiMode: 'off' });
    // 2. Onboarding, skipped part-way
    await ok('PUT', '/api/onboarding', { status: 'in_progress', step: 1, aiMode: aiOn ? 'local' : 'off' });
    await ok('PUT', '/api/onboarding', { status: 'skipped' });
    if (aiOn) await ok('PUT', '/api/settings/ai', { provider: 'ollama', model: 'local-test' });
    expect((await ok('GET', '/api/settings/ai')).json().active).toBe(aiOn);

    // 3. Import resume (DOCX), review, verify
    const docx = renderDocx(resumeText.split('\n').filter(Boolean).map((text) => ({ type: 'para' as const, text })), { title: 'cv' });
    const imported = (await ok('POST', '/api/resume/import', { filename: 'jordan.docx', contentBase64: docx.toString('base64') })).json();
    const p = imported.proposal;
    // 4. Preferences + verified facts
    await ok('PUT', '/api/profile', {
      displayName: p.displayName, headline: p.headline, contact: p.contact, skills: p.skills,
      targetRoles: ['Platform Engineer'], preferredCountries: ['Portugal'], workArrangements: ['hybrid', 'remote'],
      workAuthorizedCountries: ['Portugal'], requiresSponsorship: 'no', openToRelocation: 'no',
      experience: p.experience.map((e: Record<string, unknown>) => ({ ...e, verified: true })),
      education: p.education.map((e: Record<string, unknown>) => ({ ...e, verified: true })),
      certifications: p.certifications.map((c: Record<string, unknown>) => ({ ...c, verified: true })),
    });

    // 5. Add job from a pasted description + URL
    const ex = (await ok('POST', '/api/jobs/extract', { description: posting, sourceUrl: 'https://careers.example.test/brightwater/77' })).json();
    const prov = (f: { evidence: string } | null) => (f ? { origin: 'extracted', evidence: f.evidence } : null);
    const created = (await ok('POST', '/api/jobs', {
      title: ex.title.value, employer: ex.employer.value, location: ex.location.value, salary: ex.salary.value, workArrangement: ex.workArrangement.value,
      sourceUrl: ex.sourceUrl, description: ex.description,
      provenance: { title: prov(ex.title), employer: prov(ex.employer), location: prov(ex.location), salary: prov(ex.salary) },
    })).json();
    const id = created.application.id;
    expect(created.job.verification.status).toBe('unverified');

    // 6. Grounded assessment
    const assessment = (await ok('GET', `/api/applications/${id}/assessment`)).json();
    expect(assessment.eligibility.status).toBe('confirmed');
    expect(assessment.fit.overall).toBeGreaterThanOrEqual(4);
    for (const c of assessment.fit.criteria) if (c.score !== null) expect(c.evidence.length).toBeGreaterThan(0);

    // 7. Tailored, editable drafts (optionally AI-assisted wording)
    const docs = (await ok('POST', `/api/applications/${id}/documents/generate`, {})).json();
    const first = docs.resume.experience[0];
    let highlight = first.highlights[0];
    if (aiOn) {
      const r = (await ok('POST', '/api/ai/rewrite', { text: highlight.text, purpose: 'highlight' })).json();
      expect(r).toMatchObject({ accepted: true, local: true });
      highlight = { ...highlight, text: r.suggestion };
    } else {
      expect((await call('POST', '/api/ai/rewrite', { text: highlight.text, purpose: 'highlight' })).statusCode).toBe(409);
    }
    await ok('PUT', `/api/applications/${id}/documents/resume`, { experience: [{ factId: first.factId, include: true, highlights: [{ id: highlight.id, text: highlight.text, include: true }] }] });
    const letter = docs.coverLetter.text.replace(/\[\[[^\]]*\]\]/g, 'Your platform team’s focus on reliability matches my work.');
    await ok('PUT', `/api/applications/${id}/documents/cover_letter`, { text: letter });

    // 8. PDF and DOCX with content checks
    const pdf = await ok('GET', `/api/applications/${id}/documents/resume/export?format=pdf`);
    const docxOut = await ok('GET', `/api/applications/${id}/documents/resume/export?format=docx`);
    await ok('GET', `/api/applications/${id}/documents/cover_letter/export?format=pdf`);
    for (const text of [pdfTextOf(pdf.rawPayload), docxToText(docxOut.rawPayload)]) {
      for (const fact of ['Lumenfield Systems', 'Northgate Freight', 'Mar 2022 – Present', 'University of Porto', 'linkedin.com/in/jordan-fictional-example']) expect(text).toContain(fact);
    }

    // 9. Application prep: screening answers + official link + user checks
    const pkg = (await ok('POST', `/api/applications/${id}/package/questions`, { questions: ['Are you authorized to work in Portugal?', 'What are your salary expectations?'] })).json();
    const [auth, salary] = pkg.package.answers;
    expect(auth.status).toBe('drafted');
    expect(salary.status).toBe('needs_input');
    await ok('PUT', `/api/applications/${id}/package/answers/${auth.id}`, { answer: auth.answer, reviewed: true });
    await ok('PUT', `/api/applications/${id}/package/answers/${salary.id}`, { answer: 'Within the posted range.', reviewed: true });
    const ready = (await ok('PUT', `/api/applications/${id}/package`, { eligibilityAcknowledged: true, postingCheckedByUser: true })).json();
    expect(ready.applyUrl).toBe('https://careers.example.test/brightwater/77');
    expect(ready.ready).toBe(true);

    // 10. User-confirmed status
    for (const to of ['shortlisted', 'preparing', 'ready_for_review']) await ok('POST', `/api/applications/${id}/transitions`, { to });
    expect((await call('POST', `/api/applications/${id}/transitions`, { to: 'applied' })).statusCode).toBe(428);
    const applied = (await ok('POST', `/api/applications/${id}/transitions`, { to: 'applied', confirmSubmitted: true })).json();
    expect(applied.activity[0].note).toMatch(/5 of 5 required items complete/);

    // 11. Follow-up: contact, auto reminder, draft (never sent)
    await ok('POST', `/api/applications/${id}/contacts`, { name: 'Riley Recruiter', email: 'riley@example.test' });
    clock = new Date('2026-05-12T09:00:00.000Z');
    const dash = (await ok('GET', '/api/dashboard')).json();
    expect(dash.reminders[0]).toMatchObject({ overdue: true });
    expect((await ok('GET', `/api/applications/${id}/follow-up?kind=after_applying`)).json().to).toBe('riley@example.test');
    clock = new Date('2026-05-14T09:00:00.000Z');
    await ok('POST', `/api/applications/${id}/transitions`, { to: 'interviewing' });

    // Restart: everything persists
    await app.close();
    store.close();
    ({ store, app } = open());

    // 12–13. Analytics from saved records
    const after = (await ok('GET', '/api/dashboard')).json();
    expect(after).toMatchObject({ total: 1, submitted: 1, byStatus: { interviewing: 1 } });
    expect(after.analytics).toMatchObject({ submittedTotal: 1, responded: 1 });
    expect(aiCalls.length > 0).toBe(aiOn);
  } finally {
    await app.close();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('acceptance journey', () => {
  it('works end to end with AI off', () => journey(false), 30_000);
  it('works end to end with AI on (local model, mocked)', () => journey(true), 30_000);
});

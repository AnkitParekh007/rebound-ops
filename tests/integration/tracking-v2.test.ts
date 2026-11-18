/**
 * v0.2.0 tracking: follow-up prioritisation, templates, interview notes and
 * preparation prompts, CSV export. In-memory store, fictional data.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openStore, type Store } from '@reboundops/storage';
import { buildServer, Workspace } from '../../apps/api/src/index.ts';
import { toCsv } from '../../apps/api/src/workspace.ts';

let store: Store;
let app: ReturnType<typeof buildServer>;
let clock: Date;
beforeEach(() => {
  store = openStore({ memory: true });
  clock = new Date('2026-11-01T09:00:00.000Z');
  app = buildServer({ workspace: new Workspace(store, { env: {}, now: () => clock }), allowedOrigins: ['http://localhost:4174'], logLevel: 'silent' });
});
afterEach(async () => {
  await app.close();
  store.close();
});
const send = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown) =>
  app.inject({ method, url, headers: { host: '127.0.0.1', ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, ...(body === undefined ? {} : { payload: JSON.stringify(body) }) });
const job = async (title: string, description = '') =>
  (await send('POST', '/api/jobs', { title, employer: 'Fictional Co', description, sourceUrl: null, workArrangement: null, provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null } })).json().application.id as string;

describe('follow-up prioritisation', () => {
  it('ranks overdue reminders first, then quiet submitted applications, and shows them on the dashboard', async () => {
    const quiet = await job('Quiet Role');
    await send('POST', `/api/applications/${quiet}/transitions`, { to: 'applied', confirmSubmitted: true });
    // The automatic reminder (due in 7 days) is completed, so nothing is planned.
    const auto = (await send('GET', `/api/applications/${quiet}/reminders`)).json()[0];
    await send('PUT', `/api/applications/${quiet}/reminders/${auto.id}`, { done: true });
    const overdue = await job('Overdue Role');
    await send('POST', `/api/applications/${overdue}/reminders`, { label: 'Send portfolio', dueOn: '2026-11-03', priority: 'high' });

    clock = new Date('2026-11-20T09:00:00.000Z');
    const s = (await send('GET', '/api/follow-up/suggestions')).json();
    expect(s.map((x: { jobTitle: string; priority: string }) => `${x.jobTitle}:${x.priority}`)).toEqual(['Overdue Role:high', 'Quiet Role:normal']);
    expect(s[0].reason).toBe('Reminder overdue since 2026-11-03: Send portfolio');
    expect(s[1]).toMatchObject({ suggestedKind: 'after_applying', reason: expect.stringMatching(/No recorded response 19 days/) });
    expect((await send('GET', '/api/dashboard')).json().followUps).toHaveLength(2);
  });
});

describe('templates', () => {
  it('fills only saved values and marks the rest for the person to complete', async () => {
    const id = await job('Analyst');
    const saved = (await send('PUT', '/api/follow-up/templates', [{ name: 'Short check-in', subject: 'Re: {role} at {employer}', body: 'Hi {contactFirstName},\nApplied {appliedDate}. {unknownThing}\n{yourName}' }])).json();
    expect(saved[0].id).toEqual(expect.any(String));
    const d = (await send('GET', `/api/applications/${id}/follow-up?templateId=${saved[0].id}`)).json();
    expect(d.subject).toBe('Re: Analyst at Fictional Co');
    expect(d.body).toBe('Hi [[contactFirstName]],\nApplied [[appliedDate]]. {unknownThing}\n[[yourName]]');
    expect(d.placeholders).toBe(3);
    expect((await send('GET', `/api/applications/${id}/follow-up?templateId=nope`)).statusCode).toBe(404);
    expect((await send('PUT', '/api/follow-up/templates', [{ name: '', subject: 'x', body: 'y' }])).statusCode).toBe(400);
  });
});

describe('interviews', () => {
  it('records interview notes on the activity trail and offers preparation prompts from the posting', async () => {
    const id = await job('Platform Engineer', 'Requirements\n- Experience with Kubernetes\n- 5+ years with TypeScript');
    await send('PUT', '/api/profile', { skills: ['TypeScript'] });
    const n = (await send('POST', `/api/applications/${id}/interviews`, { stage: 'Technical interview', scheduledFor: '2026-11-10T14:00:00.000Z', interviewers: 'Sam Example' })).json();
    expect(n).toMatchObject({ stage: 'Technical interview', outcome: 'pending' });
    await send('PUT', `/api/applications/${id}/interviews/${n.id}`, { outcome: 'went_well', notes: 'Discussed scaling.' });
    const list = (await send('GET', `/api/applications/${id}/interviews`)).json();
    expect(list[0]).toMatchObject({ outcome: 'went_well', notes: 'Discussed scaling.', interviewers: 'Sam Example' });
    const trail = (await send('GET', `/api/applications/${id}`)).json().activity.filter((a: { kind: string }) => a.kind === 'interview').map((a: { note: string }) => a.note);
    expect(trail).toEqual(['Technical interview: outcome recorded as went well.', 'Interview added: Technical interview on 2026-11-10.']);
    const prep = (await send('GET', `/api/applications/${id}/interview-prep`)).json().prompts;
    expect(prep).toEqual(expect.arrayContaining(['Have a specific example ready for: “5+ years with TypeScript”.', 'Think about how your experience relates to: “Experience with Kubernetes”.', 'Be ready to discuss a gap honestly: Kubernetes (required).']));
    expect((await send('DELETE', `/api/applications/${id}/interviews/${n.id}`)).statusCode).toBe(204);
  });
});

describe('CSV export', () => {
  it('exports applications and activity, neutralising spreadsheet formulas', async () => {
    await job('=HYPERLINK("http://evil.example")');
    const res = await send('GET', '/api/export/applications.csv');
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.payload.split('\r\n');
    expect(lines[0]).toBe('application_id,title,employer,location,status,saved_at,status_changed_at,submitted_at,posting_url,source,listing');
    expect(lines[1]).toContain(`"'=HYPERLINK(""http://evil.example"")"`);
    const act = await send('GET', '/api/export/activity.csv');
    expect(act.payload.split('\r\n')[0]).toBe('at,application_id,title,employer,kind,from,to,note');
    expect(toCsv(['a'], [['-1'], ['x,y'], ['line\nbreak']])).toBe(`a\r\n'-1\r\n"x,y"\r\n"line\nbreak"\r\n`);
  });
});

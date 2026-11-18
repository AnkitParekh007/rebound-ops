/**
 * Neutral import format: v0.2.0 additive fields (contacts, reminders), per-job
 * rejection of malformed records, and export → import round trip. Synthetic data only.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { openStore, type Store } from '@reboundops/storage';
import { buildServer, Workspace } from '../../apps/api/src/index.ts';

const open: { store: Store; app: ReturnType<typeof buildServer> }[] = [];
function server() {
  const store = openStore({ memory: true });
  const app = buildServer({ workspace: new Workspace(store, { env: {} }), allowedOrigins: ['http://localhost:4174'], logLevel: 'silent' });
  open.push({ store, app });
  return (method: 'GET' | 'POST' | 'PUT', url: string, body?: unknown) =>
    app.inject({ method, url, headers: { host: '127.0.0.1', ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, ...(body === undefined ? {} : { payload: JSON.stringify(body) }) });
}
afterEach(async () => {
  for (const o of open.splice(0)) {
    await o.app.close();
    o.store.close();
  }
});

describe('import with tracking records', () => {
  it('imports contacts and reminders, keeps history and the submission date, and rejects only the malformed job', async () => {
    const send = server();
    const content = readFileSync(new URL('../fixtures/import/synthetic-v1-tracking.json', import.meta.url), 'utf8');
    const preview = (await send('POST', '/api/import/preview', { filename: 'legacy.json', content })).json();
    expect(preview.jobs.toAdd).toHaveLength(1);
    expect(preview.jobs.rejected).toHaveLength(1);
    const result = (await send('POST', '/api/import/commit', { token: preview.token, confirm: true })).json();
    expect(result).toMatchObject({ jobsAdded: 1, rejected: 1 });
    const [app] = (await send('GET', '/api/applications')).json();
    expect(app).toMatchObject({ status: 'interviewing', appliedConfirmedAt: '2026-03-02T10:00:00.000Z' });
    expect((await send('GET', `/api/applications/${app.id}/contacts`)).json()).toEqual([expect.objectContaining({ name: 'Robin Placeholder', role: 'Recruiter' })]);
    const reminders = (await send('GET', `/api/applications/${app.id}/reminders`)).json();
    expect(reminders.map((r: { label: string; done: boolean; priority: string }) => [r.label, r.done, r.priority])).toEqual([['Old task', true, 'normal'], ['Send thank-you note', false, 'high']]);
  });

  it('round-trips contacts and reminders through export and import', async () => {
    const a = server();
    const job = (await a('POST', '/api/jobs', { title: 'Data Engineer', employer: 'Fictional Co', description: '', sourceUrl: null, workArrangement: null, provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null } })).json();
    await a('POST', `/api/applications/${job.application.id}/contacts`, { name: 'Sam Example', email: 'sam@example.test' });
    await a('POST', `/api/applications/${job.application.id}/reminders`, { label: 'Check in', dueOn: '2026-12-01', priority: 'low' });
    const exported = (await a('GET', '/api/export')).payload;

    const b = server();
    const preview = (await b('POST', '/api/import/preview', { filename: 'export.json', content: exported })).json();
    expect(preview.sourceFormat).toBe('reboundops-export');
    await b('POST', '/api/import/commit', { token: preview.token, confirm: true });
    const [app] = (await b('GET', '/api/applications')).json();
    expect((await b('GET', `/api/applications/${app.id}/contacts`)).json()[0]).toMatchObject({ name: 'Sam Example', email: 'sam@example.test' });
    expect((await b('GET', `/api/applications/${app.id}/reminders`)).json()[0]).toMatchObject({ label: 'Check in', priority: 'low' });
  });
});

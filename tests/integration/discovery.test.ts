/**
 * Discovery through official job boards, end to end over HTTP with a mocked
 * provider transport (synthetic, fictional boards). No real network.
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openStore, type Store } from '@reboundops/storage';
import { buildServer, Workspace } from '../../apps/api/src/index.ts';

const fx = (n: string) => readFileSync(new URL(`../../packages/job-sources/test/fixtures/${n}`, import.meta.url), 'utf8');
const GH_BOARD = 'https://boards-api.greenhouse.io/v1/boards/examplerobotics/jobs?content=true';
const GH_POSTING = 'https://boards-api.greenhouse.io/v1/boards/examplerobotics/jobs/4001001?pay_transparency=true';

let store: Store;
let app: ReturnType<typeof buildServer>;
let clock: Date;
let routes: Record<string, string | number>;
let calls: string[];

beforeEach(() => {
  store = openStore({ memory: true });
  clock = new Date('2026-11-18T10:00:00.000Z');
  routes = { [GH_BOARD]: fx('greenhouse-board.json'), [GH_POSTING]: fx('greenhouse-posting.json') };
  calls = [];
  const sourceFetch = async (url: string) => {
    calls.push(url);
    const r = routes[url];
    if (typeof r === 'number') return new Response('', { status: r });
    return r === undefined ? new Response('Not Found', { status: 404 }) : new Response(r, { status: 200 });
  };
  const ws = new Workspace(store, { env: {}, now: () => clock, sourceFetch });
  app = buildServer({ workspace: ws, allowedOrigins: ['http://localhost:4174'], logLevel: 'silent' });
});
afterEach(async () => {
  await app.close();
  store.close();
});

const send = (method: 'GET' | 'POST' | 'PUT', url: string, body?: unknown) =>
  app.inject({ method, url, headers: { host: '127.0.0.1', ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, ...(body === undefined ? {} : { payload: JSON.stringify(body) }) });

async function profileWith(skills: string[]) {
  await send('PUT', '/api/profile', { displayName: 'Jordan Fictional', skills, targetRoles: ['Platform Engineer'], preferredCountries: ['Portugal'], workArrangements: ['remote'], workAuthorizedCountries: ['Portugal'], requiresSponsorship: 'no' });
}

describe('discovery', () => {
  it('contacts no job board until the person allows it', async () => {
    const res = await send('POST', '/api/discovery/search', { board: 'https://job-boards.greenhouse.io/examplerobotics' });
    expect(res.statusCode).toBe(428);
    expect(res.json().error.code).toBe('discovery_consent_required');
    expect(calls).toEqual([]);
    const s = (await send('GET', '/api/discovery/sources')).json();
    expect(s.consent).toBe(false);
    expect(s.sources.find((x: { id: string }) => x.id === 'workday').supported).toBe(false);
  });

  it('discovers, filters, scores, shows freshness, saves to the tracker with published pay, and warns about duplicates', async () => {
    await profileWith(['TypeScript', 'Kubernetes']);
    await send('PUT', '/api/discovery/consent', { granted: true });
    let r = (await send('POST', '/api/discovery/search', { board: 'https://job-boards.greenhouse.io/examplerobotics/jobs/4001001' })).json();
    expect(r).toMatchObject({ source: 'greenhouse', board: 'examplerobotics', employer: 'Example Robotics', fromCache: false, totalListed: 2 });
    expect(r.postings).toHaveLength(2);
    const platform = r.postings.find((p: { title: string }) => p.title === 'Senior Platform Engineer');
    expect(platform).toMatchObject({ availability: 'listed', ageHours: 0, eligibility: expect.any(String), duplicates: [] });
    expect(platform.fit.score).toBeGreaterThan(0);

    // Filters run locally on what was fetched.
    r = (await send('POST', '/api/discovery/search', { board: 'examplerobotics', source: 'greenhouse', remoteOnly: true })).json();
    expect(r.fromCache).toBe(true);
    expect(r.postings.map((p: { title: string }) => p.title)).toEqual(['Senior Platform Engineer']);
    r = (await send('POST', '/api/discovery/search', { board: 'examplerobotics', source: 'greenhouse', country: 'Germany' })).json();
    expect(r.postings.map((p: { title: string }) => p.title)).toEqual(['Data Analyst']);
    expect(calls.filter((c) => c === GH_BOARD)).toHaveLength(1); // cached

    clock = new Date('2026-11-18T13:00:00.000Z');
    const recent = (await send('GET', '/api/discovery/recent?q=platform')).json();
    expect(recent).toHaveLength(1);
    expect(recent[0].ageHours).toBe(3);

    // Save: pay is read from the posting endpoint; every field carries job-board provenance.
    const saved = await send('POST', `/api/discovery/${platform.id}/save`, {});
    expect(saved.statusCode).toBe(201);
    const job = saved.json().job;
    expect(job).toMatchObject({
      title: 'Senior Platform Engineer', employer: 'Example Robotics', salary: 'EUR 60,000 – 75,000 (Portugal base salary)', workArrangement: 'remote',
      sourceUrl: 'https://job-boards.greenhouse.io/examplerobotics/jobs/4001001',
      provenance: { title: { origin: 'source' }, employer: { origin: 'source' }, salary: { origin: 'source', evidence: 'Greenhouse job board: published pay' } },
      verification: { status: 'unverified' },
      source: { provider: 'greenhouse', board: 'examplerobotics', postingId: '4001001', availability: 'listed' },
    });
    expect(saved.json().application.activity[0].note).toMatch(/Saved from the official Greenhouse board/);
    expect((await send('POST', `/api/discovery/${platform.id}/save`, {})).statusCode).toBe(409);

    // The same posting now shows as saved, not as a duplicate of itself.
    const after = (await send('GET', '/api/discovery/recent')).json().find((p: { id: string }) => p.id === platform.id);
    expect(after).toMatchObject({ savedJobId: job.id, duplicates: [] });

    // A manual entry of the same role is flagged as a duplicate of the saved one.
    const manual = await send('POST', '/api/jobs', {
      title: 'Senior Platform Engineer', employer: 'Example Robotics', description: 'Copied text', sourceUrl: null, workArrangement: null,
      provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null },
    });
    expect(manual.statusCode).toBe(409);
  });

  it('marks postings that disappear from the board, and re-checks a saved posting', async () => {
    await send('PUT', '/api/discovery/consent', { granted: true });
    const r = (await send('POST', '/api/discovery/search', { board: 'examplerobotics', source: 'greenhouse' })).json();
    const analyst = r.postings.find((p: { title: string }) => p.title === 'Data Analyst');
    const job = (await send('POST', `/api/discovery/${analyst.id}/save`, {})).json().job;

    // The board no longer lists the analyst role.
    const board = JSON.parse(fx('greenhouse-board.json'));
    board.jobs = board.jobs.filter((j: { id: number }) => j.id !== 4001002);
    routes[GH_BOARD] = JSON.stringify(board);
    const again = (await send('POST', '/api/discovery/search', { board: 'examplerobotics', source: 'greenhouse', refresh: true })).json();
    expect(again.notes.join(' ')).toMatch(/1 posting\(s\) seen earlier are no longer listed/);
    expect(again.postings.map((p: { title: string }) => p.title)).toEqual(['Senior Platform Engineer']);
    expect((await send('GET', '/api/discovery/recent?includeUnlisted=true')).json().find((p: { id: string }) => p.id === analyst.id).availability).toBe('not_listed');

    const checked = (await send('POST', `/api/jobs/${job.id}/check-posting`, {})).json();
    expect(checked.source).toMatchObject({ availability: 'not_listed', lastCheckedAt: '2026-11-18T10:00:00.000Z' });
    const manual = await send('POST', '/api/jobs', { title: 'X', employer: 'Y', description: '', sourceUrl: null, workArrangement: null, provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null } });
    const notFromBoard = await send('POST', `/api/jobs/${manual.json().job.id}/check-posting`, {});
    expect(notFromBoard.statusCode).toBe(422);
  });

  it('explains unsupported sources, missing boards and rate limits', async () => {
    await send('PUT', '/api/discovery/consent', { granted: true });
    const wd = await send('POST', '/api/discovery/search', { board: 'https://example.wd1.myworkdayjobs.com/en-US/External' });
    expect(wd.statusCode).toBe(422);
    expect(wd.json().error.message).toMatch(/Workday does not publish/);
    const missing = await send('POST', '/api/discovery/search', { board: 'nosuchboard', source: 'lever' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('source_not_found');
    routes['https://api.ashbyhq.com/posting-api/job-board/busy?includeCompensation=true'] = 429;
    const busy = await send('POST', '/api/discovery/search', { board: 'busy', source: 'ashby' });
    expect(busy.statusCode).toBe(429);
    expect((await send('POST', '/api/discovery/search', { board: '../etc', source: 'ashby' })).statusCode).toBe(400);
  });

  it('does not let manual intake claim job-board provenance', async () => {
    const res = await send('POST', '/api/jobs', {
      title: 'Made up', employer: 'Nobody', description: '', sourceUrl: null, workArrangement: null,
      provenance: { title: { origin: 'source', evidence: 'fake' }, employer: { origin: 'user', evidence: null }, location: null, salary: null },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('invalid_provenance');
  });
});

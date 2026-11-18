/**
 * Job-source adapters and the HTTP client, against synthetic provider-shaped
 * fixtures (fictional companies) through an injected fetch. No network.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADAPTERS, htmlToText, listSources, MemoryCache, resolveBoard, SourceClient, SourceError, type FetchLike } from '../src/index.ts';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

function mockFetch(routes: Record<string, string | { status: number; body?: string; headers?: Record<string, string> }>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const r = routes[url];
    if (r === undefined) return new Response('Not Found', { status: 404 });
    if (typeof r === 'string') return new Response(r, { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response(r.body ?? '', { status: r.status, headers: r.headers });
  };
  return { fn, calls };
}

const clock = (start = '2026-11-18T10:00:00.000Z') => {
  let t = Date.parse(start);
  return { now: () => new Date(t), advance: (ms: number) => (t += ms) };
};
const noSleep = async () => {};

describe('Greenhouse', () => {
  const GH = 'https://boards-api.greenhouse.io/v1/boards/examplerobotics/jobs?content=true';
  it('normalises the public board feed without inventing fields', async () => {
    const { fn, calls } = mockFetch({ [GH]: fixture('greenhouse-board.json') });
    const client = new SourceClient({ fetch: fn, sleep: noSleep });
    const r = await ADAPTERS.greenhouse.fetchBoard(client, 'examplerobotics', {});
    expect(r.employer).toBe('Example Robotics');
    expect(r.postings).toHaveLength(2); // empty title and unsafe URL dropped
    const p = r.postings[0]!;
    expect(p).toMatchObject({
      source: 'greenhouse', postingId: '4001001', title: 'Senior Platform Engineer', employerOrigin: 'provider',
      location: 'Remote - Portugal', countries: ['Portugal'], workArrangement: 'remote', workArrangementOrigin: 'location_text',
      postingUrl: 'https://job-boards.greenhouse.io/examplerobotics/jobs/4001001', salary: null, employmentType: null, department: 'Infrastructure',
      postedAt: '2026-10-01T16:00:00.000Z', updatedAt: '2026-11-10T14:00:00.000Z',
    });
    expect(p.description).toContain('Example Robotics builds warehouse robots.');
    expect(p.description).not.toMatch(/<|alert\(1\)/);
    expect(p.requirements).toEqual(['5+ years of experience with TypeScript', 'Experience operating Kubernetes in production', '(preferred) Terraform is a plus', '(preferred) Go']);
    // Berlin office: no remote/hybrid word, so no arrangement is claimed.
    expect(r.postings[1]).toMatchObject({ workArrangement: null, workArrangementOrigin: null, countries: ['Germany'] });
    // No cookies, credentials or personal data in the request.
    const headers = calls[0]!.init!.headers as Record<string, string>;
    expect(Object.keys(headers).sort()).toEqual(['accept', 'user-agent']);
    expect(calls[0]!.init!.credentials).toBe('omit');
  });

  it('reads published pay only from the single-posting endpoint', async () => {
    const { fn } = mockFetch({ 'https://boards-api.greenhouse.io/v1/boards/examplerobotics/jobs/4001001?pay_transparency=true': fixture('greenhouse-posting.json') });
    const p = await ADAPTERS.greenhouse.fetchPosting!(new SourceClient({ fetch: fn, sleep: noSleep }), 'examplerobotics', '4001001', {});
    expect(p!.salary).toEqual({ min: 60000, max: 75000, currency: 'EUR', interval: null, text: 'EUR 60,000 – 75,000 (Portugal base salary)' });
    const gone = await ADAPTERS.greenhouse.fetchPosting!(new SourceClient({ fetch: fn, sleep: noSleep }), 'examplerobotics', '999', {});
    expect(gone).toBeNull();
  });
});

describe('Lever, Ashby, Workable', () => {
  it('Lever: structured workplace type, salary range, requirements from lists; no company name invented', async () => {
    const { fn } = mockFetch({ 'https://api.lever.co/v0/postings/fictionalpay?mode=json': fixture('lever-board.json') });
    const r = await ADAPTERS.lever.fetchBoard(new SourceClient({ fetch: fn, sleep: noSleep }), 'fictionalpay', {});
    const [a, b] = r.postings;
    expect(a).toMatchObject({
      employer: 'fictionalpay', employerOrigin: 'board', workArrangement: 'hybrid', workArrangementOrigin: 'provider_field',
      location: 'Lisbon, Portugal', locations: ['Porto, Portugal'], employmentType: 'Full-time',
      salary: { min: 55000, max: 70000, currency: 'EUR', interval: 'per-year-salary' },
      applyUrl: 'https://jobs.lever.co/fictionalpay/0b6c7d2e-1111-4a2b-9c3d-000000000001/apply',
    });
    expect(a!.requirements).toEqual(['Node.js and PostgreSQL', '3+ years building APIs', '(preferred) Kafka']);
    expect(b).toMatchObject({ workArrangement: null, salary: null });
  });

  it('Lever EU boards use the EU API host', async () => {
    const { fn, calls } = mockFetch({ 'https://api.eu.lever.co/v0/postings/fictionalpay?mode=json': '[]' });
    await ADAPTERS.lever.fetchBoard(new SourceClient({ fetch: fn, sleep: noSleep }), 'eu:fictionalpay', {});
    expect(calls[0]!.url).toBe('https://api.eu.lever.co/v0/postings/fictionalpay?mode=json');
  });

  it('Ashby: unlisted postings are skipped; compensation and on-site flag are read from fields', async () => {
    const { fn } = mockFetch({ 'https://api.ashbyhq.com/posting-api/job-board/exampledesign?includeCompensation=true': fixture('ashby-board.json') });
    const r = await ADAPTERS.ashby.fetchBoard(new SourceClient({ fetch: fn, sleep: noSleep }), 'exampledesign', {});
    expect(r.postings).toHaveLength(1);
    expect(r.postings[0]).toMatchObject({ workArrangement: 'onsite', workArrangementOrigin: 'provider_field', salary: { min: 60000, max: 80000, currency: 'EUR', text: '€60K - €80K' }, locations: ['Remote (EU)'] });
    expect(r.postings[0]!.requirements).toEqual(['Figma', 'Design systems experience']);
  });

  it('Workable: company name from the feed, explicit remote flag only, no salary', async () => {
    const { fn } = mockFetch({ 'https://apply.workable.com/api/v1/widget/accounts/sampleanalytics?details=true': fixture('workable-board.json') });
    const r = await ADAPTERS.workable.fetchBoard(new SourceClient({ fetch: fn, sleep: noSleep }), 'sampleanalytics', {});
    expect(r.employer).toBe('Sample Analytics Ltd');
    expect(r.postings[0]).toMatchObject({ postingId: 'AB12CD34EF', employerOrigin: 'provider', workArrangement: 'remote', location: 'Dublin, Ireland', locations: ['Paris, France'], salary: null, postedAt: '2026-11-05T00:00:00.000Z' });
    expect(r.postings[0]!.countries.sort()).toEqual(['France', 'Ireland']);
    expect(r.postings[0]!.requirements).toEqual(['Python', 'PyTorch']);
  });
});

describe('resolveBoard', () => {
  it('recognises careers-page URLs and refuses unsupported or mismatched ones', () => {
    expect(resolveBoard('https://job-boards.greenhouse.io/examplerobotics/jobs/4001001')).toMatchObject({ board: 'examplerobotics', adapter: { info: { id: 'greenhouse' } } });
    expect(resolveBoard('https://boards.greenhouse.io/embed/job_board?for=examplerobotics').board).toBe('examplerobotics');
    expect(resolveBoard('https://jobs.lever.co/fictionalpay').board).toBe('fictionalpay');
    expect(resolveBoard('https://jobs.eu.lever.co/fictionalpay/abc').board).toBe('eu:fictionalpay');
    expect(resolveBoard('https://jobs.ashbyhq.com/exampledesign').adapter.info.id).toBe('ashby');
    expect(resolveBoard('https://apply.workable.com/sampleanalytics/').board).toBe('sampleanalytics');
    expect(resolveBoard('examplerobotics', 'greenhouse').board).toBe('examplerobotics');
    expect(() => resolveBoard('https://example.wd5.myworkdayjobs.com/External')).toThrow(/does not publish a documented public job-posting API/);
    expect(() => resolveBoard('https://careers.example.test/jobs')).toThrow(/not on a supported job board/);
    expect(() => resolveBoard('https://jobs.lever.co/x', 'ashby')).toThrow(/is a Lever page/);
    expect(() => resolveBoard('examplerobotics')).toThrow(/Choose the job board provider/);
  });

  it('rejects board identifiers that could alter the request path', async () => {
    const { fn, calls } = mockFetch({});
    for (const bad of ['../admin', 'a/b', 'a?x=1', '', 'a b']) {
      await expect(ADAPTERS.greenhouse.fetchBoard(new SourceClient({ fetch: fn, sleep: noSleep }), bad, {})).rejects.toMatchObject({ code: 'invalid_board' });
    }
    expect(calls).toHaveLength(0);
  });

  it('lists every source with an honest support status', () => {
    const s = listSources();
    expect(s.map((x) => [x.id, x.supported])).toEqual([['greenhouse', true], ['lever', true], ['ashby', true], ['workable', true], ['workday', false]]);
    expect(s.every((x) => x.capabilities.keywordSearch === false)).toBe(true);
  });
});

describe('SourceClient', () => {
  const URL_A = 'https://boards-api.greenhouse.io/v1/boards/a/jobs?content=true';
  const hosts = ['boards-api.greenhouse.io'];

  it('caches responses, and refresh bypasses the cache', async () => {
    const c = clock();
    const { fn, calls } = mockFetch({ [URL_A]: '{"jobs":[]}' });
    const client = new SourceClient({ fetch: fn, now: c.now, sleep: noSleep, ttlMs: 60_000 });
    expect((await client.getJson(URL_A, hosts)).fromCache).toBe(false);
    expect((await client.getJson(URL_A, hosts)).fromCache).toBe(true);
    c.advance(61_000);
    expect((await client.getJson(URL_A, hosts)).fromCache).toBe(false);
    expect((await client.getJson(URL_A, hosts, { refresh: true })).fromCache).toBe(false);
    expect(calls).toHaveLength(3);
  });

  it('spaces requests to the same host', async () => {
    const c = clock();
    const waits: number[] = [];
    const { fn } = mockFetch({ [URL_A]: '{}', 'https://boards-api.greenhouse.io/v1/boards/b/jobs?content=true': '{}' });
    const client = new SourceClient({ fetch: fn, now: c.now, sleep: async (ms) => { waits.push(ms); c.advance(ms); }, minIntervalMs: 1000 });
    await client.getJson(URL_A, hosts);
    await client.getJson('https://boards-api.greenhouse.io/v1/boards/b/jobs?content=true', hosts);
    expect(waits).toEqual([1000]);
  });

  it('honours Retry-After and reports rate limiting', async () => {
    const c = clock();
    const { fn, calls } = mockFetch({ [URL_A]: { status: 429, headers: { 'retry-after': '120' } } });
    const client = new SourceClient({ fetch: fn, now: c.now, sleep: noSleep });
    await expect(client.getJson(URL_A, hosts)).rejects.toMatchObject({ code: 'rate_limited' });
    await expect(client.getJson(URL_A, hosts, { refresh: true })).rejects.toMatchObject({ code: 'rate_limited' });
    expect(calls).toHaveLength(1); // the second call never reached the provider
    c.advance(121_000);
    await expect(client.getJson(URL_A, hosts)).rejects.toMatchObject({ code: 'rate_limited' });
    expect(calls).toHaveLength(2);
  });

  it('falls back to an older cached copy when a refresh fails, saying so', async () => {
    const c = clock();
    let fail = false;
    const fn: FetchLike = async () => {
      if (fail) throw new TypeError('fetch failed');
      return new Response('{"jobs":[]}', { status: 200 });
    };
    const client = new SourceClient({ fetch: fn, now: c.now, sleep: noSleep, cache: new MemoryCache() });
    await client.getJson(URL_A, hosts);
    fail = true;
    const r = await client.getJson(URL_A, hosts, { refresh: true });
    expect(r).toMatchObject({ fromCache: true, staleBecause: expect.stringMatching(/Could not reach/) });
  });

  it('times out, caps response size, refuses non-allowlisted hosts and invalid JSON', async () => {
    const slow: FetchLike = (_u, init) => new Promise((_r, reject) => init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('t'), { name: 'TimeoutError' }))));
    await expect(new SourceClient({ fetch: slow, timeoutMs: 20, sleep: noSleep }).getJson(URL_A, hosts)).rejects.toMatchObject({ code: 'timeout' });
    const big: FetchLike = async () => new Response('x'.repeat(2048), { status: 200 });
    await expect(new SourceClient({ fetch: big, maxBytes: 1024, sleep: noSleep }).getJson(URL_A, hosts)).rejects.toMatchObject({ code: 'too_large' });
    await expect(new SourceClient({ sleep: noSleep }).getJson('https://evil.example.test/x', hosts)).rejects.toMatchObject({ code: 'unsupported' });
    await expect(new SourceClient({ sleep: noSleep }).getJson('http://boards-api.greenhouse.io/x', hosts)).rejects.toMatchObject({ code: 'unsupported' });
    const html: FetchLike = async () => new Response('<html>blocked</html>', { status: 200 });
    await expect(new SourceClient({ fetch: html, sleep: noSleep }).getJson(URL_A, hosts)).rejects.toMatchObject({ code: 'bad_response' });
    const missing: FetchLike = async () => new Response('', { status: 404 });
    await expect(new SourceClient({ fetch: missing, sleep: noSleep }).getJson(URL_A, hosts)).rejects.toBeInstanceOf(SourceError);
  });
});

describe('htmlToText', () => {
  it('drops scripts and tags and decodes entities', () => {
    expect(htmlToText('<p>A &amp; B</p><script>x()</script><ul><li>One</li><li>Two&#8217;s</li></ul>')).toBe('A & B\n\n• One\n• Two’s');
  });
});

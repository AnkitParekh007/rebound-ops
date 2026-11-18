/**
 * Adapters for official, public job-board interfaces. Each maps the provider's
 * documented response fields onto a neutral posting record. A field the
 * provider does not publish stays null; nothing is guessed.
 *
 *   Greenhouse  Job Board API          https://developers.greenhouse.io/job-board.html
 *   Lever       Postings API           https://github.com/lever/postings-api
 *   Ashby       Public Job Posting API https://developers.ashbyhq.com/docs/public-job-posting-api
 *   Workable    Public jobs widget feed behind apply.workable.com careers pages (unauthenticated, read-only)
 *   Workday     no documented public job API for third parties → not implemented
 */
import type { JobSourceId, JobSourceInfo, SourceSalary, WorkArrangement } from '@reboundops/contracts';
import { detectCountries, normalizeDescription, requirementLines } from '@reboundops/job-intelligence';
import { htmlToText } from './html.ts';
import { SourceError, type SourceClient } from './http.ts';

/** A posting as read from the provider, before ReboundOps assigns identity and availability. */
export interface SourcePosting {
  source: JobSourceId;
  board: string;
  postingId: string;
  title: string;
  employer: string;
  employerOrigin: 'provider' | 'board';
  location: string | null;
  locations: string[];
  countries: string[];
  workArrangement: WorkArrangement | null;
  workArrangementOrigin: 'provider_field' | 'location_text' | null;
  postingUrl: string;
  applyUrl: string | null;
  description: string;
  requirements: string[];
  salary: SourceSalary | null;
  employmentType: string | null;
  department: string | null;
  postedAt: string | null;
  updatedAt: string | null;
}

export interface BoardFetch {
  employer: string | null;
  postings: SourcePosting[];
  fetchedAt: string;
  fromCache: boolean;
  staleBecause: string | null;
}

export interface JobSourceAdapter {
  readonly info: JobSourceInfo;
  readonly hosts: readonly string[];
  /** Board identifier from a careers-page URL on this provider, or null. */
  boardFromUrl(url: URL): string | null;
  fetchBoard(client: SourceClient, board: string, opts: { refresh?: boolean }): Promise<BoardFetch>;
  /** Re-reads one posting (used for details such as pay ranges, and availability checks). Null when gone. */
  fetchPosting?(client: SourceClient, board: string, postingId: string, opts: { refresh?: boolean }): Promise<SourcePosting | null>;
}

const BOARD = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;
export function assertBoard(board: string): string {
  if (!BOARD.test(board)) throw new SourceError('invalid_board', 'That does not look like a job-board identifier (letters, digits, dots, dashes or underscores).');
  return board;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function httpsUrl(v: unknown): string | null {
  const s = str(v);
  if (!s || s.length > 2048) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function iso(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v).toISOString();
  const s = str(v);
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** Only an explicit word in the location counts; nothing is assumed to be on-site. */
function arrangementFromText(texts: (string | null)[]): WorkArrangement | null {
  const t = texts.filter(Boolean).join(' | ');
  if (/\bhybrid\b/i.test(t)) return 'hybrid';
  if (/\bremote\b/i.test(t)) return 'remote';
  return null;
}

function finish(p: Omit<SourcePosting, 'countries' | 'requirements' | 'workArrangement' | 'workArrangementOrigin'> & { workArrangement?: WorkArrangement | null }): SourcePosting {
  const description = normalizeDescription(p.description);
  const providerArrangement = p.workArrangement ?? null;
  const textArrangement = providerArrangement ? null : arrangementFromText([p.location, ...p.locations]);
  return {
    ...p,
    description,
    countries: detectCountries([p.location, ...p.locations].filter(Boolean).join('\n')),
    requirements: requirementLines(description, 25).map((r) => (r.kind === 'preferred' ? `(preferred) ${r.text}` : r.text)),
    workArrangement: providerArrangement ?? textArrangement,
    workArrangementOrigin: providerArrangement ? 'provider_field' : textArrangement ? 'location_text' : null,
  };
}

const money = (n: number | null, currency: string | null) =>
  n === null ? '' : `${currency ?? ''} ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`.trim();

function salaryText(min: number | null, max: number | null, currency: string | null, interval: string | null): string {
  const range = min !== null && max !== null && min !== max ? `${money(min, currency)} – ${money(max, null)}` : money(min ?? max, currency);
  return interval ? `${range} per ${interval.toLowerCase().replace(/^1 /, '').replace(/-/g, ' ')}` : range;
}

/* ------------------------------ Greenhouse ------------------------------ */

const GH_HOSTS = ['boards-api.greenhouse.io'] as const;

function ghPosting(board: string, j: Record<string, unknown>): SourcePosting | null {
  const id = j['id'];
  const title = str(j['title']);
  const url = httpsUrl(j['absolute_url']);
  if ((typeof id !== 'number' && typeof id !== 'string') || !title || !url) return null;
  const company = str(j['company_name']);
  const location = str(obj(j['location'])['name']);
  const offices = arr(j['offices']).map((o) => str(obj(o)['name'])).filter((x): x is string => Boolean(x));
  const ranges = arr(j['pay_input_ranges']).map(obj);
  const r = ranges[0];
  let salary: SourceSalary | null = null;
  if (r) {
    const min = typeof r['min_cents'] === 'number' ? r['min_cents'] / 100 : null;
    const max = typeof r['max_cents'] === 'number' ? r['max_cents'] / 100 : null;
    const currency = str(r['currency_type']);
    if (min !== null || max !== null) salary = { min, max, currency, interval: null, text: `${salaryText(min, max, currency, null)}${str(r['title']) ? ` (${str(r['title'])})` : ''}` };
  }
  return finish({
    source: 'greenhouse',
    board,
    postingId: String(id),
    title,
    employer: company ?? board,
    employerOrigin: company ? 'provider' : 'board',
    location,
    locations: offices,
    postingUrl: url,
    applyUrl: url,
    description: htmlToText(htmlToText(String(j['content'] ?? ''))), // content is HTML-escaped HTML
    salary,
    employmentType: null,
    department: str(obj(arr(j['departments'])[0])['name']),
    postedAt: iso(j['first_published']),
    updatedAt: iso(j['updated_at']),
  });
}

export const greenhouse: JobSourceAdapter = {
  info: {
    id: 'greenhouse',
    label: 'Greenhouse',
    supported: true,
    capabilities: { listBoard: true, singlePosting: true, salary: true, keywordSearch: false },
    boardHint: 'The company’s board token, e.g. “examplecorp” from job-boards.greenhouse.io/examplecorp',
    docsUrl: 'https://developers.greenhouse.io/job-board.html',
    limitations: [
      'Lists one company’s published jobs; there is no cross-company search.',
      'Pay ranges are only published per posting; they are read when you open or save a posting, if the company publishes them.',
      'Employment type and work arrangement are not structured fields; remote/hybrid is taken only from the location text.',
    ],
  },
  hosts: GH_HOSTS,
  boardFromUrl(u) {
    if (!/(^|\.)greenhouse\.io$/.test(u.hostname)) return null;
    const q = u.searchParams.get('for');
    if (q) return q;
    const seg = u.pathname.split('/').filter(Boolean);
    if (u.hostname === 'boards-api.greenhouse.io') return seg[2] ?? null; // /v1/boards/{token}
    return seg[0] && seg[0] !== 'embed' ? seg[0] : null;
  },
  async fetchBoard(client, board, opts) {
    assertBoard(board);
    const r = await client.getJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`, GH_HOSTS, opts);
    const postings = arr(obj(r.data)['jobs']).map((j) => ghPosting(board, obj(j))).filter((p): p is SourcePosting => p !== null);
    return { employer: postings.find((p) => p.employerOrigin === 'provider')?.employer ?? null, postings, fetchedAt: r.fetchedAt, fromCache: r.fromCache, staleBecause: r.staleBecause };
  },
  async fetchPosting(client, board, postingId, opts) {
    assertBoard(board);
    if (!/^\d{1,20}$/.test(postingId)) return null;
    try {
      const r = await client.getJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs/${postingId}?pay_transparency=true`, GH_HOSTS, opts);
      return ghPosting(board, obj(r.data));
    } catch (err) {
      if (err instanceof SourceError && err.code === 'not_found') return null;
      throw err;
    }
  },
};

/* -------------------------------- Lever -------------------------------- */

const LEVER_HOSTS = ['api.lever.co', 'api.eu.lever.co'] as const;
const leverApi = (board: string) => {
  const eu = board.startsWith('eu:');
  const site = assertBoard(eu ? board.slice(3) : board);
  return `https://${eu ? 'api.eu.lever.co' : 'api.lever.co'}/v0/postings/${encodeURIComponent(site)}`;
};

function leverArrangement(v: unknown): WorkArrangement | null {
  const s = (str(v) ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return s === 'remote' ? 'remote' : s === 'hybrid' ? 'hybrid' : s === 'onsite' ? 'onsite' : null;
}

function leverPosting(board: string, j: Record<string, unknown>): SourcePosting | null {
  const id = str(j['id']);
  const title = str(j['text']);
  const url = httpsUrl(j['hostedUrl']);
  if (!id || !title || !url) return null;
  const cat = obj(j['categories']);
  const location = str(cat['location']);
  const all = arr(cat['allLocations']).map(str).filter((x): x is string => Boolean(x));
  const lists = arr(j['lists']).map(obj).map((l) => `${str(l['text']) ?? ''}\n${htmlToText(String(l['content'] ?? ''))}`);
  const description = [str(j['descriptionPlain']) ?? htmlToText(String(j['description'] ?? '')), ...lists, str(j['additionalPlain']) ?? ''].join('\n\n');
  const sr = obj(j['salaryRange']);
  const min = typeof sr['min'] === 'number' ? sr['min'] : null;
  const max = typeof sr['max'] === 'number' ? sr['max'] : null;
  const currency = str(sr['currency']);
  const interval = str(sr['interval']);
  const salaryPlain = str(j['salaryDescriptionPlain']);
  const salary: SourceSalary | null =
    min !== null || max !== null ? { min, max, currency, interval, text: salaryText(min, max, currency, interval) } : salaryPlain ? { min: null, max: null, currency: null, interval: null, text: salaryPlain.slice(0, 300) } : null;
  return finish({
    source: 'lever',
    board,
    postingId: id,
    title,
    employer: board.replace(/^eu:/, ''),
    employerOrigin: 'board',
    location,
    locations: all.filter((l) => l !== location),
    postingUrl: url,
    applyUrl: httpsUrl(j['applyUrl']),
    description,
    salary,
    employmentType: str(cat['commitment']),
    department: str(cat['department']) ?? str(cat['team']),
    postedAt: iso(j['createdAt']),
    updatedAt: null,
    workArrangement: leverArrangement(j['workplaceType']),
  });
}

export const lever: JobSourceAdapter = {
  info: {
    id: 'lever',
    label: 'Lever',
    supported: true,
    capabilities: { listBoard: true, singlePosting: true, salary: true, keywordSearch: false },
    boardHint: 'The company’s Lever site name, e.g. “examplecorp” from jobs.lever.co/examplecorp (EU sites: jobs.eu.lever.co/…)',
    docsUrl: 'https://github.com/lever/postings-api',
    limitations: [
      'Lists one company’s published jobs; there is no cross-company search.',
      'Lever does not return the company’s display name; the site name is shown until you edit it.',
      'Salary appears only when the company publishes a salary range.',
    ],
  },
  hosts: LEVER_HOSTS,
  boardFromUrl(u) {
    if (u.hostname !== 'jobs.lever.co' && u.hostname !== 'jobs.eu.lever.co') return null;
    const seg = u.pathname.split('/').filter(Boolean)[0];
    return seg ? (u.hostname === 'jobs.eu.lever.co' ? `eu:${seg}` : seg) : null;
  },
  async fetchBoard(client, board, opts) {
    const r = await client.getJson(`${leverApi(board)}?mode=json`, LEVER_HOSTS, opts);
    if (!Array.isArray(r.data)) throw new SourceError('bad_response', 'Lever returned an unexpected response.');
    const postings = r.data.map((j) => leverPosting(board, obj(j))).filter((p): p is SourcePosting => p !== null);
    return { employer: null, postings, fetchedAt: r.fetchedAt, fromCache: r.fromCache, staleBecause: r.staleBecause };
  },
  async fetchPosting(client, board, postingId, opts) {
    if (!/^[0-9a-f-]{8,64}$/i.test(postingId)) return null;
    try {
      const r = await client.getJson(`${leverApi(board)}/${postingId}?mode=json`, LEVER_HOSTS, opts);
      return leverPosting(board, obj(r.data));
    } catch (err) {
      if (err instanceof SourceError && err.code === 'not_found') return null;
      throw err;
    }
  },
};

/* -------------------------------- Ashby -------------------------------- */

const ASHBY_HOSTS = ['api.ashbyhq.com'] as const;

function ashbyArrangement(j: Record<string, unknown>): WorkArrangement | null {
  const w = (str(j['workplaceType']) ?? '').toLowerCase().replace(/[^a-z]/g, '');
  if (w === 'remote') return 'remote';
  if (w === 'hybrid') return 'hybrid';
  if (w === 'onsite') return 'onsite';
  return j['isRemote'] === true ? 'remote' : null;
}

function ashbyPosting(board: string, j: Record<string, unknown>): SourcePosting | null {
  const id = str(j['id']);
  const title = str(j['title']);
  const url = httpsUrl(j['jobUrl']);
  if (!id || !title || !url || j['isListed'] === false) return null;
  const location = str(j['location']);
  const secondary = arr(j['secondaryLocations']).map((l) => str(obj(l)['location']) ?? str(l)).filter((x): x is string => Boolean(x));
  const comp = obj(j['compensation']);
  const salaryPart = arr(comp['summaryComponents']).map(obj).find((c) => c['compensationType'] === 'Salary');
  let salary: SourceSalary | null = null;
  if (salaryPart) {
    const min = typeof salaryPart['minValue'] === 'number' ? salaryPart['minValue'] : null;
    const max = typeof salaryPart['maxValue'] === 'number' ? salaryPart['maxValue'] : null;
    const currency = str(salaryPart['currencyCode']);
    const interval = str(salaryPart['interval']);
    if (min !== null || max !== null) salary = { min, max, currency, interval, text: str(comp['scrapeableCompensationSalarySummary']) ?? salaryText(min, max, currency, interval) };
  } else if (str(comp['compensationTierSummary'])) {
    salary = { min: null, max: null, currency: null, interval: null, text: str(comp['compensationTierSummary'])! };
  }
  return finish({
    source: 'ashby',
    board,
    postingId: id,
    title,
    employer: board,
    employerOrigin: 'board',
    location,
    locations: secondary,
    postingUrl: url,
    applyUrl: httpsUrl(j['applyUrl']),
    description: str(j['descriptionPlain']) ?? htmlToText(String(j['descriptionHtml'] ?? '')),
    salary,
    employmentType: str(j['employmentType']),
    department: str(j['department']) ?? str(j['team']),
    postedAt: iso(j['publishedAt']),
    updatedAt: null,
    workArrangement: ashbyArrangement(j),
  });
}

export const ashby: JobSourceAdapter = {
  info: {
    id: 'ashby',
    label: 'Ashby',
    supported: true,
    capabilities: { listBoard: true, singlePosting: false, salary: true, keywordSearch: false },
    boardHint: 'The job board name, e.g. “examplecorp” from jobs.ashbyhq.com/examplecorp',
    docsUrl: 'https://developers.ashbyhq.com/docs/public-job-posting-api',
    limitations: [
      'Lists one company’s published jobs; there is no cross-company search.',
      'The public API returns the whole board; a single posting is checked by re-reading the board.',
      'The company’s display name is not returned; the board name is shown until you edit it.',
    ],
  },
  hosts: ASHBY_HOSTS,
  boardFromUrl(u) {
    if (u.hostname !== 'jobs.ashbyhq.com') return null;
    return u.pathname.split('/').filter(Boolean)[0] ?? null;
  },
  async fetchBoard(client, board, opts) {
    assertBoard(board);
    const r = await client.getJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`, ASHBY_HOSTS, opts);
    const postings = arr(obj(r.data)['jobs']).map((j) => ashbyPosting(board, obj(j))).filter((p): p is SourcePosting => p !== null);
    return { employer: null, postings, fetchedAt: r.fetchedAt, fromCache: r.fromCache, staleBecause: r.staleBecause };
  },
};

/* ------------------------------- Workable ------------------------------- */

const WORKABLE_HOSTS = ['apply.workable.com'] as const;

function workablePosting(board: string, employer: string | null, j: Record<string, unknown>): SourcePosting | null {
  const id = str(j['shortcode']);
  const title = str(j['title']);
  const url = httpsUrl(j['url']) ?? httpsUrl(j['shortlink']);
  if (!id || !title || !url) return null;
  const places = arr(j['locations'])
    .map(obj)
    .filter((l) => l['hidden'] !== true)
    .map((l) => [str(l['city']), str(l['region']), str(l['country'])].filter(Boolean).join(', '))
    .filter(Boolean);
  const primary = [str(j['city']), str(j['state']), str(j['country'])].filter(Boolean).join(', ') || null;
  return finish({
    source: 'workable',
    board,
    postingId: id,
    title,
    employer: employer ?? board,
    employerOrigin: employer ? 'provider' : 'board',
    location: primary,
    locations: places.filter((p) => p !== primary),
    postingUrl: url,
    applyUrl: httpsUrl(j['application_url']),
    description: htmlToText(String(j['description'] ?? '')),
    salary: null,
    employmentType: str(j['employment_type']),
    department: str(j['department']),
    postedAt: iso(j['published_on']) ?? iso(j['created_at']),
    updatedAt: null,
    // "telecommuting" true is an explicit remote flag; false does not mean on-site.
    workArrangement: j['telecommuting'] === true ? 'remote' : null,
  });
}

export const workable: JobSourceAdapter = {
  info: {
    id: 'workable',
    label: 'Workable',
    supported: true,
    capabilities: { listBoard: true, singlePosting: false, salary: false, keywordSearch: false },
    boardHint: 'The account’s subdomain, e.g. “examplecorp” from apply.workable.com/examplecorp',
    docsUrl: 'https://apply.workable.com/',
    limitations: [
      'Uses the public, unauthenticated jobs feed behind Workable-hosted careers pages (the one Workable offers for embedding a company’s job list). It is not part of Workable’s authenticated developer API, so if Workable changes it this source will report the board as unavailable.',
      'Lists one company’s published jobs; there is no cross-company search.',
      'The feed does not include salary; check the posting itself.',
      'Hybrid and on-site are not distinguished in the feed; only an explicit remote flag is used.',
    ],
  },
  hosts: WORKABLE_HOSTS,
  boardFromUrl(u) {
    if (u.hostname === 'apply.workable.com') {
      const seg = u.pathname.split('/').filter(Boolean)[0];
      return seg && seg !== 'j' && seg !== 'api' ? seg : null;
    }
    const m = /^([a-z0-9-]+)\.workable\.com$/i.exec(u.hostname);
    return m && m[1] !== 'www' && m[1] !== 'apply' ? m[1]! : null;
  },
  async fetchBoard(client, board, opts) {
    assertBoard(board);
    const r = await client.getJson(`https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(board)}?details=true`, WORKABLE_HOSTS, opts);
    const data = obj(r.data);
    const employer = str(data['name']);
    const postings = arr(data['jobs']).map((j) => workablePosting(board, employer, obj(j))).filter((p): p is SourcePosting => p !== null);
    return { employer, postings, fetchedAt: r.fetchedAt, fromCache: r.fromCache, staleBecause: r.staleBecause };
  },
};

/* -------------------------------- Workday -------------------------------- */

export const workday: JobSourceAdapter = {
  info: {
    id: 'workday',
    label: 'Workday',
    supported: false,
    capabilities: { listBoard: false, singlePosting: false, salary: false, keywordSearch: false },
    boardHint: 'Not available',
    docsUrl: 'https://www.workday.com/',
    limitations: [
      'Workday does not publish a documented public job-posting API for third-party apps. Its career sites use internal endpoints that ReboundOps will not call.',
      'To track a Workday posting, open it in your browser and paste its URL and text into “Add a job”.',
    ],
  },
  hosts: [],
  boardFromUrl(u) {
    return /(^|\.)myworkdayjobs\.com$|(^|\.)myworkdaysite\.com$/.test(u.hostname) ? u.hostname.split('.')[0] ?? 'workday' : null;
  },
  async fetchBoard() {
    throw new SourceError('unsupported', workday.info.limitations.join(' '));
  },
};

export const ADAPTERS: Readonly<Record<JobSourceId, JobSourceAdapter>> = { greenhouse, lever, ashby, workable, workday };

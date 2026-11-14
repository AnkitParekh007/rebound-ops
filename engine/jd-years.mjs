// @ts-check
/**
 * jd-years.mjs — the years of experience a job description asks for, and
 * whether that is within reach of the candidate (#6153).
 *
 * Titles say little about this. "Lead" roles ask for four years and plain
 * "Analyst" roles ask for ten, so skip_tiers (classify-tier.mjs, which reads
 * the title) cannot answer it. The number is in the JD body, and this module
 * reads it there: rules only, no LLM, so the scanner stays zero-token.
 *
 * Nothing is dropped unless `action: drop` is set; by default an out-of-band
 * posting is kept and marked `above band`. With `drop` on, the one rule
 * everything below serves: a posting is dropped only when the JD
 * states a clear overall requirement and even its lowest reading is out of
 * reach. Everything else (no statement, a preferred-only or skill-only figure,
 * bars that disagree, a JD that could not be read) is kept and labelled. A
 * wrong drop costs the user a real job they never see; a wrong keep costs a
 * glance at one pipeline row.
 *
 * The parse, per sentence:
 *   1. Find each "N years" mention: digits or spelled out ("five (5)"), "N+",
 *      "N or more", "at least N", ranges ("3-5", "between 3 and 5"), months.
 *   2. Keep only mentions about the candidate's experience: the words after
 *      "years" must read as experience ("of", "in", "experience", "working",
 *      ...), and the sentence must not be about age, tenure, contracts,
 *      vesting, degree length ("4-year degree") or the company's own history.
 *   3. Tag each one:
 *      - kind: required / preferred, from the nearest cue in the sentence
 *        ("preferred", "nice to have", "a plus" / "required", "minimum",
 *        "must"), else from the section heading above it.
 *      - scope: overall / skill ("3 years of experience with SQL") /
 *        degree-substitute ("a degree or 4 years of equivalent experience",
 *        which binds only candidates without the degree) / sub ("7 years,
 *        including 2 managing people").
 *      - degreeAlt: one of several degree-conditional bars in one sentence
 *        ("7 with a BS or 5 with an MS").
 *   4. The gating figure is the LOWEST floor among required overall mentions,
 *      the most lenient honest reading. Several bars that differ ("5+ years
 *      of software", "2+ years leading a team") are all required, so the real
 *      bar is at least the highest; gating on the lowest means a drop happens
 *      only when every one of them is out of reach. A bar with an
 *      "equivalent combination" route, or read from a listing description
 *      rather than the full JD, is shown but never drops.
 */

import {
  jdHtmlToText,
  fetchJdViaKnownApi,
  normalizeAshbyJob,
  normalizeGreenhouseJob,
  normalizeLeverJob,
  normalizeSmartRecruitersJob,
  normalizeWorkdayJob,
} from './browser-extract.mjs';
import { resolveAtsApi, JD_TEXT_API_ATS, throttleProviderRequest } from './liveness-api.mjs';
import { fetchJsonWithRetry, makeHttpCtx } from './providers/_http.mjs';


import {
  parseYearsRequirement as parseYearsText,
  classifyYears,
  formatYearsSegment,
  resolveExperienceFilter,
} from './web/src/lib/eligibility/years.mjs';

export { classifyYears, formatYearsSegment, resolveExperienceFilter };

/**
 * Read the stated years-of-experience requirement from JD text or HTML. The
 * parser lives in web/src/lib/eligibility/years.mjs; the engine adds its own
 * HTML-to-text step for provider descriptions.
 * @param {string} jd
 * @returns {import('./web/src/lib/eligibility/years.mjs').YearsRequirement}
 */
export function parseYearsRequirement(jd) {
  return parseYearsText(jd, { htmlToText: jdHtmlToText });
}

// ── JD fetch ────────────────────────────────────────────────────────

// ATS whose JD comes from one public GET returning JSON. These go through
// providers/_http.mjs (SSRF-guarded connect, no redirects, body cap) with its
// shared retry, which honours Retry-After on a 429. The remaining
// JD_TEXT_API_ATS entries (an embed hop, an HTML page) use
// fetchJdViaKnownApi as-is. Normalizers are browser-extract.mjs's own, so
// fetch-jd.mjs, `browser-extract.mjs jd` and this read the same text.
const JSON_JD = /** @type {Record<string, (json: any, resolved: any, url: string, cap: number) => {text: string}|null>} */ ({
  greenhouse: (json, _r, url, cap) => normalizeGreenhouseJob(json, url, cap),
  lever: (json, _r, url, cap) => normalizeLeverJob(json, url, cap),
  ashby: (json, r, url, cap) => normalizeAshbyJob(json, r.parts.jobId, url, cap),
  workday: (json, _r, url, cap) => normalizeWorkdayJob(json, url, cap),
  smartrecruiters: (json, _r, url, cap) => normalizeSmartRecruitersJob(json, url, cap),
});

// A whole JD, qualifications included: they often sit at the end.
const JD_TEXT_CAP = 60_000;
const JD_TIMEOUT_MS = 15_000;
const JD_RETRY_POLICY = { retries: 2 };

/**
 * Full JD text for a posting, or null when its host has no known public JD
 * API. Throws on a failed request (the caller labels the row `unread`).
 *
 * @param {string} url
 * @param {{ boardCache?: Map<string, Promise<any>>, ctx?: any }} [opts]
 *   boardCache: Ashby's API is the whole board, so one fetch serves every
 *   posting on it for the rest of the run.
 * @returns {Promise<string|null>}
 */
export async function fetchJdText(url, { boardCache, ctx = makeHttpCtx() } = {}) {
  const resolved = resolveAtsApi(url);
  if (!resolved || !JD_TEXT_API_ATS.has(resolved.ats)) return null;
  const normalize = JSON_JD[resolved.ats];
  if (!normalize) {
    const result = await fetchJdViaKnownApi(url, JD_TEXT_CAP, JD_TIMEOUT_MS);
    if (!result) throw new Error(`${resolved.ats} JD fetch returned nothing`);
    return result.text;
  }
  const apiUrl = resolved.ats === 'greenhouse' ? `${resolved.apiUrl}?content=true` : resolved.apiUrl;
  const get = async () => {
    await throttleProviderRequest(resolved.ats, resolved.throttleMs);
    return fetchJsonWithRetry(ctx, apiUrl, {
      timeoutMs: resolved.timeoutMs || JD_TIMEOUT_MS,
      headers: { accept: 'application/json' },
    }, JD_RETRY_POLICY);
  };
  let json;
  if (resolved.ats === 'ashby' && boardCache) {
    // A failure is cached too: get() already retried, so asking again for
    // every other posting on a down board would only repeat that backoff.
    if (!boardCache.has(apiUrl)) boardCache.set(apiUrl, get());
    json = await boardCache.get(apiUrl);
  } else {
    json = await get();
  }
  const result = normalize(json, resolved, url, JD_TEXT_CAP);
  if (!result?.text) throw new Error(`${resolved.ats} answered without a JD for this posting`);
  return result.text;
}

/**
 * @typedef {Object} YearsVerdict
 * @property {YearsRequirement|null} req   null when the JD could not be read
 * @property {'in'|'out'|'unknown'} verdict
 * @property {'ats'|'listing'|null} source
 * @property {string|null} error
 * @property {string} label                 the `yrs:` segment body ("5+", "unread")
 */

/**
 * Where an offer annotated by applyExperienceFilter keeps the full ATS
 * description it read (non-enumerable, so never serialized). Absent when the
 * JD could not be fetched.
 */
export const JD_TEXT = Symbol.for('reboundops.jdText');

/**
 * Read each offer's stated years and split the list by band.
 *
 * One JD request per offer at most, through its ATS's public API. The full JD
 * always wins over the listing's own description: a listing can carry a
 * teaser or a capped excerpt that states a bar and leaves out the
 * alternative or the "preferred" that follows it. So a reading taken from the
 * listing (no JD API for the host, or the request failed) is shown but never
 * drops. Every failure keeps the offer. Order is preserved.
 *
 * @template {{url: string, description?: string}} T
 * @param {T[]} offers
 * @param {{years: number, stretchYears: number, action: 'drop'|'label', concurrency: number}} filter
 * @param {{ fetchJd?: (url: string) => Promise<string|null>, onProgress?: (done: number, total: number) => void }} [deps]
 * @returns {Promise<{ kept: Array<T & {years: YearsVerdict}>, dropped: Array<T & {years: YearsVerdict}> }>}
 */
export async function applyExperienceFilter(offers, filter, deps = {}) {
  const boardCache = new Map();
  const fetchJd = deps.fetchJd || (url => fetchJdText(url, { boardCache }));
  /** @type {Array<T & {years: YearsVerdict}>} */
  const annotated = new Array(offers.length);
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < offers.length) {
      const i = cursor++;
      const offer = offers[i];
      /** @type {YearsRequirement|null} */
      let req = null;
      /** @type {YearsVerdict['source']} */
      let source = null;
      let error = null;
      let text = null;
      try {
        text = await fetchJd(offer.url);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
      // Capped like an ATS read: a provider's description has no size limit.
      const listing = typeof offer.description === 'string' ? offer.description.slice(0, JD_TEXT_CAP).trim() : '';
      if (text) {
        req = parseYearsRequirement(text);
        source = 'ats';
      } else if (listing) {
        req = { ...parseYearsRequirement(listing), confident: false };
        source = 'listing';
      }
      const verdict = classifyYears(req, filter);
      const label = formatYearsSegment(req, verdict).replace(/^yrs: /, '');
      annotated[i] = { ...offer, years: { req, verdict, source, error, label } };
      // Kept out of JSON and the pipeline row: the eligibility screen reuses it
      // so a scan with both on makes one request per offer, not two.
      if (text) Object.defineProperty(annotated[i], JD_TEXT, { value: text, enumerable: false });
      deps.onProgress?.(++done, offers.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(filter.concurrency, offers.length) }, worker));
  const dropped = filter.action === 'drop' ? annotated.filter(o => o.years.verdict === 'out') : [];
  const kept = annotated.filter(o => !dropped.includes(o));
  return { kept, dropped };
}

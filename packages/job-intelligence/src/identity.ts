import type { JobCreate } from '@reboundops/contracts';
import { normalizeDescription } from './extract.ts';

const TRACKING_PARAMS = /^(utm_.*|gclid|fbclid|msclkid|mc_[a-z]+|ref|refid|source|src|trk|trackingid)$/i;

/** Canonical form of a posting URL for duplicate detection. */
export function canonicalUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  url.hash = '';
  url.username = '';
  url.password = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const query = url.searchParams.toString();
  return `${host}${path}${query ? `?${query}` : ''}`;
}

const squash = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Stable identity used to flag likely duplicates before saving. */
export function dedupeKey(job: Pick<JobCreate, 'sourceUrl' | 'employer' | 'title' | 'location'>): string {
  const url = job.sourceUrl ? canonicalUrl(job.sourceUrl) : null;
  if (url) return `url:${url}`;
  return `id:${squash(job.employer)}|${squash(job.title)}|${squash(job.location ?? '')}`;
}

export type GroundingProblem = { field: string; message: string };

/**
 * Ensures any field marked as "extracted" is actually supported by the stored
 * description: the evidence must appear verbatim in the text and the value must
 * appear in the evidence. User-entered fields are accepted as the person's own claim.
 */
export function checkGrounding(job: {
  title: string;
  employer: string;
  location: string | null;
  salary: string | null;
  description: string;
  provenance: JobCreate['provenance'];
}): GroundingProblem[] {
  const problems: GroundingProblem[] = [];
  const text = normalizeDescription(job.description).replace(/\s+/g, ' ').toLowerCase();
  const fold = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

  const check = (
    name: string,
    value: string | null,
    prov: { origin: string; evidence: string | null } | null,
  ) => {
    if (value === null || value === '') {
      return;
    }
    if (!prov) {
      problems.push({ field: name, message: `${name} has a value but no provenance.` });
      return;
    }
    if (prov.origin !== 'extracted') return;
    if (!prov.evidence) {
      problems.push({ field: name, message: `${name} is marked extracted but has no evidence.` });
      return;
    }
    const ev = fold(prov.evidence);
    if (!text.includes(ev)) {
      problems.push({ field: name, message: `Evidence for ${name} does not appear in the description.` });
    } else if (!ev.includes(fold(value))) {
      problems.push({ field: name, message: `${name} value is not supported by its evidence.` });
    }
  };

  check('title', job.title, job.provenance.title);
  check('employer', job.employer, job.provenance.employer);
  check('location', job.location, job.provenance.location);
  check('salary', job.salary, job.provenance.salary);
  return problems;
}

export interface DuplicateMatch {
  jobId: string;
  reason: 'same_posting_url' | 'same_employer_and_title' | 'same_description';
}

/**
 * Likely duplicates of a new job among saved ones. Uses several independent
 * signals, because the same posting is often saved once with a URL and once
 * without, from two different sites, or with the location typed differently.
 * The caller lets the person save anyway: two openings can share a title.
 */
export function findDuplicates(
  candidate: Pick<JobCreate, 'sourceUrl' | 'employer' | 'title' | 'location' | 'description'>,
  saved: readonly { id: string; sourceUrl: string | null; employer: string; title: string; description: string }[],
): DuplicateMatch[] {
  const url = candidate.sourceUrl ? canonicalUrl(candidate.sourceUrl) : null;
  const who = `${squash(candidate.employer)}|${squash(candidate.title)}`;
  const text = squash(normalizeDescription(candidate.description ?? ''));
  const matches: DuplicateMatch[] = [];
  for (const job of saved) {
    const jobUrl = job.sourceUrl ? canonicalUrl(job.sourceUrl) : null;
    if (url && jobUrl && url === jobUrl) matches.push({ jobId: job.id, reason: 'same_posting_url' });
    else if (squash(job.employer) && who === `${squash(job.employer)}|${squash(job.title)}`) matches.push({ jobId: job.id, reason: 'same_employer_and_title' });
    else if (text.length >= 40 && text === squash(normalizeDescription(job.description))) matches.push({ jobId: job.id, reason: 'same_description' });
  }
  return matches;
}

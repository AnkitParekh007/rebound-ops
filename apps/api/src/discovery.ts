import {
  DiscoveryRequest,
  type DiscoveredPosting,
  type DiscoveredPostingView,
  type DiscoveryResult,
  type FitWeights,
  type Job,
  type JobSourceInfo,
  type OnboardingState,
  type Profile,
} from '@reboundops/contracts';
import { assess, canonicalCountries, dedupeKey, findDuplicates } from '@reboundops/job-intelligence';
import { ADAPTERS, listSources, resolveBoard, SourceClient, SourceError, type FetchLike, type SourcePosting } from '@reboundops/job-sources';
import type { Store } from '@reboundops/storage';
import { z } from 'zod';
import { AppError, notFound } from './errors.ts';

export const DiscoveryConsent = z.object({ granted: z.boolean(), at: z.string() });

const DUP_LABEL: Record<string, string> = {
  same_posting_url: 'same posting link',
  same_employer_and_title: 'same employer and title',
  same_description: 'same description',
};

export interface DiscoveryDeps {
  store: Store;
  now: () => Date;
  newId: () => string;
  fetch?: FetchLike;
  getProfile: () => Profile;
  getOnboarding: () => OnboardingState;
  getWeights?: () => Partial<FitWeights>;
}

function sourceError(err: unknown): never {
  if (err instanceof SourceError) {
    const status = { not_found: 404, rate_limited: 429, timeout: 504, network: 502, bad_response: 502, too_large: 502, unsupported: 422, invalid_board: 400 }[err.code];
    throw new AppError(status, `source_${err.code}`, err.message);
  }
  throw err;
}

/**
 * Discovery over official job-board interfaces. Nothing is fetched until the
 * person allows ReboundOps to contact job boards; requests carry only the
 * board identifier they typed. Results are kept locally with their retrieval
 * time, so freshness is always visible.
 */
export class DiscoveryService {
  readonly client: SourceClient;
  private readonly deps: DiscoveryDeps;

  constructor(deps: DiscoveryDeps) {
    this.deps = deps;
    const store = deps.store;
    this.client = new SourceClient({
      fetch: deps.fetch,
      now: deps.now,
      cache: { get: (k) => store.getCachedResponse(k), put: (k, v) => store.putCachedResponse(k, v) },
    });
  }

  sources(): { sources: JobSourceInfo[]; consent: boolean } {
    return { sources: listSources(), consent: this.consented() };
  }

  consented(): boolean {
    return this.deps.store.getSetting('discovery_consent', DiscoveryConsent)?.granted === true;
  }

  setConsent(granted: boolean): { consent: boolean } {
    this.deps.store.putSetting('discovery_consent', { granted, at: this.deps.now().toISOString() });
    return { consent: granted };
  }

  private requireConsent() {
    if (!this.consented()) {
      throw new AppError(428, 'discovery_consent_required', 'Allow ReboundOps to contact job boards first. Only the company board you enter is sent; none of your personal data is.');
    }
  }

  async discover(input: unknown): Promise<DiscoveryResult> {
    const req = DiscoveryRequest.parse(input);
    this.requireConsent();
    let resolved;
    try {
      resolved = resolveBoard(req.board, req.source);
    } catch (err) {
      sourceError(err);
    }
    const { adapter, board } = resolved;
    let fetched;
    try {
      fetched = await adapter.fetchBoard(this.client, board, { refresh: req.refresh });
    } catch (err) {
      sourceError(err);
    }
    const notes: string[] = [];
    const store = this.deps.store;
    // Only a fresh, successful fetch is evidence of what is (and is no longer) listed.
    const fresh = !fetched.fromCache;
    store.transaction(() => {
      for (const p of fetched.postings) {
        // upsertDiscovered keeps an existing record's id and saved-job link.
        store.upsertDiscovered({ ...p, id: this.deps.newId(), retrievedAt: fetched.fetchedAt, availability: 'listed', lastSeenAt: fetched.fetchedAt, savedJobId: null });
      }
      if (fresh) {
        const gone = store.markNotListed(adapter.info.id, board, fetched.postings.map((p) => p.postingId));
        if (gone) notes.push(`${gone} posting(s) seen earlier are no longer listed on this board.`);
      }
    });
    if (fetched.staleBecause) notes.push(`Could not refresh (${fetched.staleBecause}). Showing the copy fetched at ${fetched.fetchedAt}.`);
    else if (fetched.fromCache) notes.push('Showing a recent copy (fetched in the last 30 minutes). Use Refresh to check the board again.');
    if (adapter.info.id === 'greenhouse') notes.push('Greenhouse publishes pay ranges per posting; they are read when you save a posting.');

    const all = store.listDiscovered({ source: adapter.info.id, board, limit: 2000 }).filter((p) => p.availability === 'listed');
    const filtered = this.filter(all, req.query, req.country, req.remoteOnly);
    return {
      source: adapter.info.id,
      board,
      employer: fetched.employer,
      fetchedAt: fetched.fetchedAt,
      fromCache: fetched.fromCache,
      totalListed: fetched.postings.length,
      postings: this.views(filtered),
      notes,
    };
  }

  /** Recently discovered postings from all boards, newest first (no network). */
  recent(query: { q?: string; country?: string; remoteOnly?: string; source?: string; includeUnlisted?: string } = {}): DiscoveredPostingView[] {
    let list = this.deps.store.listDiscovered({ source: query.source || undefined, limit: 500 });
    if (query.includeUnlisted !== 'true') list = list.filter((p) => p.availability !== 'not_listed');
    return this.views(this.filter(list, query.q ?? '', query.country ?? '', query.remoteOnly === 'true'));
  }

  private filter(list: DiscoveredPosting[], q: string, country: string, remoteOnly: boolean): DiscoveredPosting[] {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const wanted = country ? canonicalCountries([country])[0] ?? country : '';
    return list.filter((p) => {
      if (remoteOnly && p.workArrangement !== 'remote') return false;
      if (wanted && !p.countries.some((c) => c.toLowerCase() === wanted.toLowerCase())) return false;
      const hay = `${p.title} ${p.department ?? ''} ${p.location ?? ''} ${p.locations.join(' ')}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }

  private asJob(p: DiscoveredPosting): Job {
    return {
      id: `preview-${p.id}`,
      title: p.title,
      employer: p.employer,
      location: [p.location, ...p.locations].filter(Boolean).join('; ') || null,
      salary: p.salary?.text ?? null,
      workArrangement: p.workArrangement,
      sourceUrl: p.postingUrl,
      description: p.description,
      provenance: { title: { origin: 'source', evidence: null }, employer: { origin: 'source', evidence: null }, location: null, salary: null },
      verification: { status: 'unverified', checkedAt: null, note: '' },
      dedupeKey: '',
      capturedAt: p.retrievedAt,
      source: null,
    };
  }

  views(list: DiscoveredPosting[]): DiscoveredPostingView[] {
    const profile = this.deps.getProfile();
    const goalRoles = this.deps.getOnboarding().goals.targetRoles;
    const now = this.deps.now();
    const saved = this.deps.store.listJobs();
    const hasProfile = Boolean(profile.skills.length || profile.experience.length || profile.targetRoles.length || goalRoles.length);
    return list.map((p) => {
      const job = this.asJob(p);
      const a = hasProfile ? assess({ applicationId: job.id, job, profile, goalRoles, now, weights: this.deps.getWeights?.() }) : null;
      const dups = findDuplicates({ ...job, description: job.description }, saved).filter((m) => m.jobId !== p.savedJobId);
      return {
        ...p,
        fit: a && a.fit.overall !== null ? { score: a.fit.overall, label: `${a.fit.overall} / 5 (${a.fit.scoredCriteria} of ${a.fit.totalCriteria} criteria scored)` } : null,
        eligibility: a ? a.eligibility.status : null,
        duplicates: dups.map((d) => ({ jobId: d.jobId, title: saved.find((j) => j.id === d.jobId)?.title ?? '', reason: DUP_LABEL[d.reason] ?? d.reason })),
        ageHours: Math.max(0, Math.round(((now.getTime() - Date.parse(p.retrievedAt)) / 3_600_000) * 10) / 10),
      };
    });
  }

  /**
   * Re-reads a posting from its provider. Returns the fresh record, or null
   * when the provider no longer lists it.
   */
  async recheck(p: { source: DiscoveredPosting['source']; board: string; postingId: string }): Promise<{ posting: SourcePosting | null; checkedAt: string }> {
    this.requireConsent();
    const adapter = ADAPTERS[p.source];
    try {
      if (adapter.fetchPosting) {
        const posting = await adapter.fetchPosting(this.client, p.board, p.postingId, { refresh: true });
        return { posting, checkedAt: this.deps.now().toISOString() };
      }
      const board = await adapter.fetchBoard(this.client, p.board, { refresh: true });
      if (board.staleBecause) throw new SourceError('network', board.staleBecause);
      return { posting: board.postings.find((x) => x.postingId === p.postingId) ?? null, checkedAt: board.fetchedAt };
    } catch (err) {
      sourceError(err);
    }
  }

  get(id: string): DiscoveredPosting {
    return this.deps.store.getDiscovered(id) ?? (() => { throw notFound('Discovered posting'); })();
  }

  /** Builds the job record saved to the tracker. Every field is from the provider; nothing is added. */
  jobFrom(p: DiscoveredPosting, detail: SourcePosting | null, employerOverride: string | null, id: string, at: string): Job {
    const src = detail ?? p;
    const label = ADAPTERS[p.source].info.label;
    const employer = employerOverride?.trim() || p.employer;
    const employerByUser = Boolean(employerOverride?.trim()) && employerOverride!.trim() !== p.employer;
    const location = [src.location, ...src.locations].filter(Boolean).join('; ') || null;
    const salary = src.salary?.text ?? null;
    const base = {
      title: src.title,
      employer,
      location,
      salary,
      workArrangement: src.workArrangement,
      sourceUrl: src.postingUrl,
      description: src.description,
    };
    return {
      id,
      ...base,
      provenance: {
        title: { origin: 'source', evidence: `${label} job board: title` },
        employer: employerByUser ? { origin: 'user', evidence: null } : { origin: 'source', evidence: p.employerOrigin === 'provider' ? `${label} job board: company name` : `${label} board identifier` },
        location: location ? { origin: 'source', evidence: `${label} job board: location` } : null,
        salary: salary ? { origin: 'source', evidence: `${label} job board: published pay` } : null,
      },
      verification: {
        status: 'unverified',
        checkedAt: null,
        note: `Listed on the official ${label} board when retrieved (${p.retrievedAt.slice(0, 16).replace('T', ' ')} UTC). Confirm on the posting page before applying.`,
      },
      dedupeKey: dedupeKey(base),
      capturedAt: at,
      source: { provider: p.source, board: p.board, postingId: p.postingId, retrievedAt: p.retrievedAt, availability: 'listed', lastCheckedAt: p.retrievedAt },
    };
  }
}

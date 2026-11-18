/**
 * The one network path for job sources. Every request:
 *   - goes to an https host on the adapter's fixed allowlist;
 *   - carries no cookies, credentials or personal data (a generic User-Agent only);
 *   - times out, and is capped in size;
 *   - is spaced per host (polite rate limiting) and honours Retry-After;
 *   - is cached for a short time, so repeated views do not re-hit the provider.
 */

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type SourceErrorCode = 'not_found' | 'rate_limited' | 'timeout' | 'network' | 'bad_response' | 'too_large' | 'unsupported' | 'invalid_board';

export class SourceError extends Error {
  readonly code: SourceErrorCode;
  constructor(code: SourceErrorCode, message: string) {
    super(message);
    this.name = 'SourceError';
    this.code = code;
  }
}

export interface CachedResponse {
  data: string;
  fetchedAt: string;
  expiresAt: string;
}

export interface SourceCache {
  get(key: string): CachedResponse | null;
  put(key: string, value: CachedResponse): void;
}

export class MemoryCache implements SourceCache {
  private readonly map = new Map<string, CachedResponse>();
  get(key: string) {
    return this.map.get(key) ?? null;
  }
  put(key: string, value: CachedResponse) {
    this.map.set(key, value);
  }
}

export interface SourceClientOptions {
  fetch?: FetchLike;
  cache?: SourceCache;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  /** Minimum spacing between requests to the same host. */
  minIntervalMs?: number;
  timeoutMs?: number;
  maxBytes?: number;
  /** How long a successful response is reused. */
  ttlMs?: number;
}

export interface JsonResult {
  data: unknown;
  fetchedAt: string;
  fromCache: boolean;
  /** Set when a refresh failed and an older cached copy is returned instead. */
  staleBecause: string | null;
}

const USER_AGENT = 'ReboundOps/0.2 (local-first job search app)';
const MAX_RETRY_AFTER_MS = 10 * 60_000;

export class SourceClient {
  private readonly fetchImpl: FetchLike;
  private readonly cache: SourceCache;
  private readonly now: () => Date;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly minIntervalMs: number;
  private readonly timeoutMs: number;
  private readonly maxBytes: number;
  private readonly ttlMs: number;
  private readonly lastRequest = new Map<string, number>();
  private readonly blockedUntil = new Map<string, number>();
  private readonly queue = new Map<string, Promise<unknown>>();

  constructor(opts: SourceClientOptions = {}) {
    this.fetchImpl = opts.fetch ?? ((url, init) => fetch(url, init));
    this.cache = opts.cache ?? new MemoryCache();
    this.now = opts.now ?? (() => new Date());
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.minIntervalMs = opts.minIntervalMs ?? 1000;
    this.timeoutMs = opts.timeoutMs ?? 15_000;
    this.maxBytes = opts.maxBytes ?? 25 * 1024 * 1024;
    this.ttlMs = opts.ttlMs ?? 30 * 60_000;
  }

  /** GETs JSON from an allowlisted https host. */
  async getJson(url: string, allowedHosts: readonly string[], opts: { refresh?: boolean } = {}): Promise<JsonResult> {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !allowedHosts.includes(u.hostname) || u.username || u.password) {
      throw new SourceError('unsupported', `Refusing to contact ${u.hostname}: not an official endpoint for this source.`);
    }
    const cached = this.cache.get(url);
    const nowMs = this.now().getTime();
    if (cached && !opts.refresh && Date.parse(cached.expiresAt) > nowMs) {
      return { data: JSON.parse(cached.data), fetchedAt: cached.fetchedAt, fromCache: true, staleBecause: null };
    }
    try {
      const text = await this.serialized(u.hostname, () => this.fetchText(u));
      JSON.parse(text); // validate before caching
      const fetchedAt = this.now().toISOString();
      this.cache.put(url, { data: text, fetchedAt, expiresAt: new Date(this.now().getTime() + this.ttlMs).toISOString() });
      return { data: JSON.parse(text), fetchedAt, fromCache: false, staleBecause: null };
    } catch (err) {
      const e = err instanceof SourceError ? err : new SourceError('bad_response', 'The source returned something that is not valid JSON.');
      // A board that no longer exists must not be masked by an old copy.
      if (cached && e.code !== 'not_found') {
        return { data: JSON.parse(cached.data), fetchedAt: cached.fetchedAt, fromCache: true, staleBecause: e.message };
      }
      throw e;
    }
  }

  /** One request at a time per host, spaced by minIntervalMs. */
  private serialized<T>(host: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.queue.get(host) ?? Promise.resolve();
    const run = prev.catch(() => undefined).then(async () => {
      const blocked = this.blockedUntil.get(host) ?? 0;
      const nowMs = this.now().getTime();
      if (blocked > nowMs) {
        throw new SourceError('rate_limited', `The source asked ReboundOps to wait; try again after ${new Date(blocked).toLocaleTimeString()}.`);
      }
      const wait = (this.lastRequest.get(host) ?? -Infinity) + this.minIntervalMs - nowMs;
      if (wait > 0) await this.sleep(wait);
      this.lastRequest.set(host, this.now().getTime());
      return fn();
    });
    this.queue.set(host, run);
    return run;
  }

  private async fetchText(u: URL): Promise<string> {
    let res: Response;
    try {
      res = await this.fetchImpl(u.toString(), {
        method: 'GET',
        headers: { accept: 'application/json', 'user-agent': USER_AGENT },
        redirect: 'error',
        credentials: 'omit',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      const name = (err as Error).name;
      if (name === 'TimeoutError' || name === 'AbortError') throw new SourceError('timeout', `The source did not answer within ${Math.round(this.timeoutMs / 1000)} seconds.`);
      throw new SourceError('network', 'Could not reach the source. Check your internet connection.');
    }
    if (res.status === 404) throw new SourceError('not_found', 'No public job board was found for that identifier.');
    if (res.status === 429 || res.status === 503) {
      const ra = res.headers.get('retry-after');
      const seconds = ra && /^\d+$/.test(ra) ? Number(ra) : ra ? (Date.parse(ra) - this.now().getTime()) / 1000 : 60;
      const ms = Math.min(Math.max(seconds * 1000, 1000), MAX_RETRY_AFTER_MS);
      this.blockedUntil.set(u.hostname, this.now().getTime() + ms);
      throw new SourceError('rate_limited', `The source is limiting requests; try again in about ${Math.ceil(ms / 60_000)} minute(s).`);
    }
    if (!res.ok) throw new SourceError('bad_response', `The source answered with HTTP ${res.status}.`);
    const declared = Number(res.headers.get('content-length') ?? '0');
    if (declared > this.maxBytes) throw new SourceError('too_large', 'The source response is too large to process safely.');
    if (!res.body) return '';
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > this.maxBytes) {
        await reader.cancel();
        throw new SourceError('too_large', 'The source response is too large to process safely.');
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  }
}

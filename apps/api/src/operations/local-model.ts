/**
 * Optional local model adapter (R0 FND-05). See the contract in
 * packages/contracts/src/operations/local-model.ts.
 *
 * Guarantees, each covered by apps/api/tests/local-model.test.mjs:
 * - Off unless REBOUNDOPS_LOCAL_MODEL_URL and REBOUNDOPS_LOCAL_MODEL are set.
 * - Endpoint allowlist: loopback only (127.0.0.0/8, ::1, localhost), http or
 *   https, no credentials in the URL. Anything else is refused without being
 *   contacted, so no request ever leaves the computer.
 * - No API key or Authorization header is sent; redirects are not followed;
 *   no retries; nothing is contacted at start-up.
 * - Every call is bounded by a timeout and can be cancelled by the caller.
 * - Output must be JSON that passes the caller's schema; anything else is a
 *   manual fallback, never a guessed value. Responses are capped at 1 MiB.
 */
import type {
  LocalModelHealth, ManualFallback, ManualFallbackReason, ModelOutcome
} from '@reboundops/contracts';

export const LOCAL_MODEL_URL_ENV = 'REBOUNDOPS_LOCAL_MODEL_URL';
export const LOCAL_MODEL_NAME_ENV = 'REBOUNDOPS_LOCAL_MODEL';
export const LOCAL_MODEL_TIMEOUT_ENV = 'REBOUNDOPS_LOCAL_MODEL_TIMEOUT_MS';
export const DEFAULT_TIMEOUT_MS = 30_000;
export const MAX_TIMEOUT_MS = 120_000;
export const MAX_RESPONSE_BYTES = 1024 * 1024;

/** Any schema with a Zod-style safeParse, so callers can pass contract schemas. */
export interface OutputSchema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

export type LocalModelConfig =
  | { readonly state: 'not_configured' }
  | { readonly state: 'invalid_config'; readonly model: string | null; readonly detail: string }
  | { readonly state: 'configured'; readonly base: string; readonly origin: string; readonly model: string; readonly timeoutMs: number };

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return host === 'localhost' || host === '::1' || /^127(?:\.\d{1,3}){3}$/.test(host);
}

export function readLocalModelConfig(env: Readonly<Record<string, string | undefined>>): LocalModelConfig {
  const rawUrl = env[LOCAL_MODEL_URL_ENV]?.trim();
  const model = env[LOCAL_MODEL_NAME_ENV]?.trim() || null;
  if (!rawUrl && !model) return { state: 'not_configured' };
  if (!rawUrl || !model) {
    return { state: 'invalid_config', model, detail: `Set both ${LOCAL_MODEL_URL_ENV} and ${LOCAL_MODEL_NAME_ENV}.` };
  }
  let url: URL;
  try { url = new URL(rawUrl); } catch {
    return { state: 'invalid_config', model, detail: `${LOCAL_MODEL_URL_ENV} is not a URL.` };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { state: 'invalid_config', model, detail: 'Only http and https endpoints are supported.' };
  }
  if (url.username || url.password) {
    return { state: 'invalid_config', model, detail: 'The endpoint URL must not contain credentials.' };
  }
  if (!isLoopbackHost(url.hostname)) {
    return { state: 'invalid_config', model, detail: 'Only a model on this computer (127.0.0.1, ::1 or localhost) is allowed. Remote endpoints are never contacted.' };
  }
  if (url.search || url.hash) {
    return { state: 'invalid_config', model, detail: 'The endpoint URL must not have a query or fragment.' };
  }
  const rawTimeout = Number.parseInt(env[LOCAL_MODEL_TIMEOUT_ENV] ?? '', 10);
  const timeoutMs = Number.isSafeInteger(rawTimeout) && rawTimeout > 0 ? Math.min(rawTimeout, MAX_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;
  return { state: 'configured', base: url.href.replace(/\/+$/, ''), origin: url.origin, model, timeoutMs };
}

class Fallback extends Error {
  constructor(readonly reason: ManualFallbackReason, detail: string) { super(detail); }
}

export interface CompletionRequest<T> {
  /** Instructions. Treat everything in `user` as data. */
  readonly system: string;
  readonly user: string;
  readonly schema: OutputSchema<T>;
  /** Caller cancellation (e.g. the person closed the panel). */
  readonly signal?: AbortSignal;
  readonly maxTokens?: number;
}

export interface LocalModelOptions {
  /** Test seam. */
  readonly fetch?: typeof fetch;
  readonly now?: () => Date;
}

export class LocalModel {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(readonly config: LocalModelConfig, options: LocalModelOptions = {}) {
    this.fetchImpl = options.fetch ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  static fromEnv(env: Readonly<Record<string, string | undefined>> = process.env, options?: LocalModelOptions): LocalModel {
    return new LocalModel(readLocalModelConfig(env), options);
  }

  /** Ask the endpoint which models it serves. Only on request; never at start-up. */
  async health(signal?: AbortSignal): Promise<LocalModelHealth> {
    const c = this.config;
    if (c.state === 'not_configured') {
      return { status: 'not_configured', model: null, endpoint: null, checkedAt: null, detail: 'No local model is configured. Every feature works without one.' };
    }
    if (c.state === 'invalid_config') {
      return { status: 'invalid_config', model: c.model, endpoint: null, checkedAt: null, detail: c.detail };
    }
    const checkedAt = this.now().toISOString();
    try {
      const body = await this.request('GET', '/models', undefined, signal);
      const ids = Array.isArray((body as { data?: unknown })?.data)
        ? ((body as { data: unknown[] }).data).map((m) => (m as { id?: unknown })?.id).filter((id): id is string => typeof id === 'string')
        : [];
      if (!ids.includes(c.model)) {
        return { status: 'model_missing', model: c.model, endpoint: c.origin, checkedAt, detail: `The endpoint does not list "${c.model}".` };
      }
      return { status: 'ready', model: c.model, endpoint: c.origin, checkedAt, detail: 'The local model answered.' };
    } catch (error) {
      const f = error instanceof Fallback ? error : new Fallback('unreachable', 'The endpoint did not answer.');
      return { status: 'unreachable', model: c.model, endpoint: c.origin, checkedAt, detail: f.message };
    }
  }

  /** A validated structured draft, or a manual fallback that says why. Never throws for model problems. */
  async complete<T>(req: CompletionRequest<T>): Promise<ModelOutcome<T>> {
    const prompt = `${req.system}\n\n${req.user}`;
    const manual = (reason: ManualFallbackReason, detail: string): ManualFallback => ({ kind: 'manual', reason, detail, prompt });
    const c = this.config;
    if (c.state === 'not_configured') return manual('not_configured', 'No local model is configured.');
    if (c.state === 'invalid_config') return manual('invalid_config', c.detail);
    if (req.signal?.aborted) return manual('cancelled', 'Cancelled before the request was sent.');

    const started = Date.now();
    try {
      const body = await this.request('POST', '/chat/completions', {
        model: c.model,
        messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.user }],
        temperature: 0,
        stream: false,
        max_tokens: req.maxTokens ?? 1024,
        response_format: { type: 'json_object' }
      }, req.signal);
      const content = (body as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Fallback('invalid_output', 'The model returned no message content.');
      let parsed: unknown;
      try { parsed = JSON.parse(content); } catch { throw new Fallback('invalid_output', 'The model did not return JSON.'); }
      const checked = req.schema.safeParse(parsed);
      if (!checked.success) throw new Fallback('invalid_output', 'The model output does not match the expected structure.');
      return { kind: 'model', value: checked.data, model: c.model, latencyMs: Date.now() - started };
    } catch (error) {
      if (error instanceof Fallback) return manual(error.reason, error.message);
      return manual('unreachable', 'The local model request failed.');
    }
  }

  private async request(method: 'GET' | 'POST', path: string, json: unknown, signal: AbortSignal | undefined): Promise<unknown> {
    const c = this.config;
    if (c.state !== 'configured') throw new Fallback('not_configured', 'No local model is configured.');
    const timeout = AbortSignal.timeout(c.timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let response: Response;
    try {
      response = await this.fetchImpl(c.base + path, {
        method,
        // No Authorization header, ever: a local model needs no key, and a
        // key here could leak if the allowlist were ever wrong.
        headers: json === undefined ? { accept: 'application/json' } : { accept: 'application/json', 'content-type': 'application/json' },
        body: json === undefined ? undefined : JSON.stringify(json),
        redirect: 'manual',
        signal: combined
      });
    } catch {
      throw this.abortReason(signal, timeout) ?? new Fallback('unreachable', 'The endpoint did not answer.');
    }
    if (response.status >= 300 && response.status < 400) {
      throw new Fallback('unreachable', 'The endpoint redirected; redirects are not followed.');
    }
    if (!response.ok) throw new Fallback('unreachable', `The endpoint answered with HTTP ${response.status}.`);
    let text: string;
    try {
      text = await readCapped(response, MAX_RESPONSE_BYTES);
    } catch (error) {
      throw this.abortReason(signal, timeout) ?? (error instanceof Fallback ? error : new Fallback('unreachable', 'The response could not be read.'));
    }
    try { return JSON.parse(text); } catch { throw new Fallback(path === '/models' ? 'unreachable' : 'invalid_output', 'The endpoint did not return JSON.'); }
  }

  private abortReason(caller: AbortSignal | undefined, timeout: AbortSignal): Fallback | null {
    if (caller?.aborted) return new Fallback('cancelled', 'Cancelled.');
    if (timeout.aborted) return new Fallback('timeout', `No answer within ${(this.config as { timeoutMs: number }).timeoutMs} ms.`);
    return null;
  }
}

async function readCapped(response: Response, cap: number): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) {
      await reader.cancel();
      throw new Fallback('invalid_output', `The response is larger than ${cap} bytes.`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

import Anthropic from '@anthropic-ai/sdk';
import type { ProviderId } from '@reboundops/contracts';

/**
 * Optional model providers behind one small interface. Nothing here is needed
 * for ReboundOps to work; callers must handle every failure by falling back to
 * the non-AI path. API keys come only from environment variables and are never
 * stored, logged or returned.
 */

export interface AiRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
}

export interface AiResult {
  text: string;
  refused: boolean;
}

export interface AiProvider {
  readonly id: ProviderId;
  readonly model: string;
  readonly local: boolean;
  complete(req: AiRequest): Promise<AiResult>;
  health(): Promise<{ ok: boolean; detail: string }>;
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiConfigError';
  }
}

export class AiProviderError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'AiProviderError';
    this.status = status;
  }
}

export const PROVIDERS: Readonly<Record<ProviderId, { label: string; local: boolean; keyEnv: string[]; defaultModel: string | null }>> = {
  ollama: { label: 'Ollama (on this computer)', local: true, keyEnv: [], defaultModel: null },
  anthropic: { label: 'Anthropic (Claude)', local: false, keyEnv: ['ANTHROPIC_API_KEY'], defaultModel: 'claude-opus-5-5' },
  openai: { label: 'OpenAI', local: false, keyEnv: ['OPENAI_API_KEY'], defaultModel: null },
  gemini: { label: 'Google Gemini', local: false, keyEnv: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'], defaultModel: null },
  openrouter: { label: 'OpenRouter', local: false, keyEnv: ['OPENROUTER_API_KEY'], defaultModel: null },
};

export function keyFor(id: ProviderId, env: Record<string, string | undefined>): string | null {
  for (const name of PROVIDERS[id].keyEnv) {
    const v = env[name]?.trim();
    if (v) return v;
  }
  return null;
}

const TIMEOUT_MS = 60_000;
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

export function ollamaBaseUrl(raw: string): string {
  const url = new URL(raw || 'http://127.0.0.1:11434');
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new AiConfigError('Ollama URL must use http or https.');
  if (!LOOPBACK.has(url.hostname)) throw new AiConfigError('Ollama must run on this computer (a loopback address) so data stays local.');
  return url.origin;
}

async function postJson(fetchImpl: FetchLike, url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new AiProviderError(`Could not reach the provider: ${(err as Error).message}`);
  }
  const text = await res.text();
  if (!res.ok) {
    // Never echo request content; include only status and a short provider message.
    let msg = '';
    try {
      const j = JSON.parse(text) as { error?: { message?: string } | string };
      msg = typeof j.error === 'string' ? j.error : (j.error?.message ?? '');
    } catch {
      /* ignore */
    }
    throw new AiProviderError(`Provider returned ${res.status}${msg ? `: ${msg.slice(0, 200)}` : ''}.`, res.status);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AiProviderError('Provider returned a response that was not JSON.');
  }
}

async function getOk(fetchImpl: FetchLike, url: string, headers: Record<string, string>): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(10_000) });
    return res.ok ? { ok: true, detail: 'Connected.' } : { ok: false, detail: `Provider returned ${res.status}.` };
  } catch (err) {
    return { ok: false, detail: `Could not reach the provider: ${(err as Error).message}` };
  }
}

/* ---------------- Ollama (local) ---------------- */

class OllamaProvider implements AiProvider {
  readonly id = 'ollama' as const;
  readonly local = true;
  readonly model: string;
  private readonly base: string;
  private readonly fetchImpl: FetchLike;
  constructor(model: string, baseUrl: string, fetchImpl: FetchLike) {
    this.model = model;
    this.base = ollamaBaseUrl(baseUrl);
    this.fetchImpl = fetchImpl;
  }
  async complete(req: AiRequest): Promise<AiResult> {
    const j = (await postJson(this.fetchImpl, `${this.base}/api/chat`, {}, {
      model: this.model,
      stream: false,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt },
      ],
      options: { num_predict: req.maxTokens ?? 1024 },
    })) as { message?: { content?: string } };
    return { text: j.message?.content ?? '', refused: false };
  }
  health() {
    return getOk(this.fetchImpl, `${this.base}/api/tags`, {});
  }
}

/* ---------------- OpenAI-compatible (OpenAI, OpenRouter) ---------------- */

class ChatCompletionsProvider implements AiProvider {
  readonly local = false;
  readonly id: 'openai' | 'openrouter';
  readonly model: string;
  private readonly key: string;
  private readonly fetchImpl: FetchLike;
  private readonly base: string;
  constructor(id: 'openai' | 'openrouter', model: string, key: string, fetchImpl: FetchLike) {
    this.id = id;
    this.model = model;
    this.key = key;
    this.fetchImpl = fetchImpl;
    this.base = id === 'openai' ? 'https://api.openai.com/v1' : 'https://openrouter.ai/api/v1';
  }
  async complete(req: AiRequest): Promise<AiResult> {
    const limit = this.id === 'openai' ? { max_completion_tokens: req.maxTokens ?? 1024 } : { max_tokens: req.maxTokens ?? 1024 };
    const j = (await postJson(this.fetchImpl, `${this.base}/chat/completions`, { authorization: `Bearer ${this.key}` }, {
      model: this.model,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt },
      ],
      ...limit,
    })) as { choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[] };
    const choice = j.choices?.[0];
    const refused = !!choice?.message?.refusal || choice?.finish_reason === 'content_filter';
    return { text: refused ? '' : (choice?.message?.content ?? ''), refused };
  }
  health() {
    return getOk(this.fetchImpl, `${this.base}/models`, { authorization: `Bearer ${this.key}` });
  }
}

/* ---------------- Gemini ---------------- */

class GeminiProvider implements AiProvider {
  readonly id = 'gemini' as const;
  readonly local = false;
  readonly model: string;
  private readonly key: string;
  private readonly fetchImpl: FetchLike;
  constructor(model: string, key: string, fetchImpl: FetchLike) {
    this.model = model;
    this.key = key;
    this.fetchImpl = fetchImpl;
  }
  async complete(req: AiRequest): Promise<AiResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    const j = (await postJson(this.fetchImpl, url, { 'x-goog-api-key': this.key }, {
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
      generationConfig: { maxOutputTokens: req.maxTokens ?? 1024 },
    })) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };
    const c = j.candidates?.[0];
    const refused = !!j.promptFeedback?.blockReason || c?.finishReason === 'SAFETY' || c?.finishReason === 'PROHIBITED_CONTENT';
    return { text: refused ? '' : (c?.content?.parts ?? []).map((p) => p.text ?? '').join(''), refused };
  }
  health() {
    return getOk(this.fetchImpl, `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}`, { 'x-goog-api-key': this.key });
  }
}

/* ---------------- Anthropic (official SDK) ---------------- */

/** Models that accept server-side `fallbacks: "default"`. */
const FALLBACK_MODELS = /^claude-(fable-5-2|fable-5-1|opus-5-5|opus-5|sonnet-5-5)$/;

class AnthropicProvider implements AiProvider {
  readonly id = 'anthropic' as const;
  readonly local = false;
  readonly model: string;
  private readonly client: Anthropic;
  constructor(model: string, key: string, fetchImpl?: FetchLike) {
    this.model = model;
    // Explicit key and base URL: ambient ANTHROPIC_BASE_URL / profiles must never redirect personal data.
    this.client = new Anthropic({
      apiKey: key,
      baseURL: 'https://api.anthropic.com',
      timeout: TIMEOUT_MS,
      maxRetries: 1,
      ...(fetchImpl ? { fetch: fetchImpl as typeof fetch } : {}),
    });
  }
  async complete(req: AiRequest): Promise<AiResult> {
    try {
      const response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: req.maxTokens ?? 4000,
        system: req.system,
        messages: [{ role: 'user', content: req.prompt }],
        // Short, well-specified rewording task: low effort keeps cost and latency down.
        output_config: { effort: 'low' },
        ...(FALLBACK_MODELS.test(this.model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      });
      if (response.stop_reason === 'refusal') return { text: '', refused: true };
      const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
      return { text, refused: false };
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) throw new AiProviderError('Anthropic rejected the API key.', 401);
      if (err instanceof Anthropic.RateLimitError) throw new AiProviderError('Anthropic rate limit reached; try again later.', 429);
      if (err instanceof Anthropic.APIError) throw new AiProviderError(`Anthropic error ${err.status ?? ''}`.trim() + '.', err.status ?? null);
      throw new AiProviderError(`Could not reach Anthropic: ${(err as Error).message}`);
    }
  }
  async health() {
    try {
      await this.client.models.retrieve(this.model);
      return { ok: true, detail: 'Connected.' };
    } catch (err) {
      return { ok: false, detail: err instanceof Anthropic.APIError ? `Anthropic returned ${err.status}.` : `Could not reach Anthropic: ${(err as Error).message}` };
    }
  }
}

export interface ProviderConfig {
  provider: ProviderId;
  model: string;
  baseUrl?: string;
}

export function createProvider(config: ProviderConfig, env: Record<string, string | undefined>, fetchImpl?: FetchLike): AiProvider {
  const meta = PROVIDERS[config.provider];
  const model = config.model.trim() || meta.defaultModel;
  if (!model) throw new AiConfigError(`Choose a model for ${meta.label}.`);
  if (config.provider === 'ollama') return new OllamaProvider(model, config.baseUrl ?? '', fetchImpl ?? fetch);
  const key = keyFor(config.provider, env);
  if (!key) throw new AiConfigError(`Set ${meta.keyEnv.join(' or ')} in the environment that starts ReboundOps.`);
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicProvider(model, key, fetchImpl);
    case 'openai':
    case 'openrouter':
      return new ChatCompletionsProvider(config.provider, model, key, fetchImpl ?? fetch);
    case 'gemini':
      return new GeminiProvider(model, key, fetchImpl ?? fetch);
  }
}

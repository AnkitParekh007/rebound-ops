import { describe, expect, it } from 'vitest';
import { AiConfigError, AiProviderError, checkRewrite, createProvider, ollamaBaseUrl, suggestRewrite, type FetchLike } from '../src/index.ts';

interface Call { url: string; init: RequestInit | undefined; body: Record<string, unknown> }

function mockFetch(respond: (url: string) => { status?: number; json: unknown }): { fetch: FetchLike; calls: Call[] } {
  const calls: Call[] = [];
  const fetch: FetchLike = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const raw = init?.body;
    calls.push({ url, init, body: typeof raw === 'string' && raw ? JSON.parse(raw) : {} });
    const r = respond(url);
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200, headers: { 'content-type': 'application/json' } });
  };
  return { fetch, calls };
}

const header = (c: Call, name: string) => new Headers(c.init?.headers).get(name);
const env = { ANTHROPIC_API_KEY: 'test-key-a', OPENAI_API_KEY: 'test-key-o', GEMINI_API_KEY: 'test-key-g', OPENROUTER_API_KEY: 'test-key-r' };
const req = { system: 'sys', prompt: 'hello' };

describe('provider adapters (mocked transport)', () => {
  it('Ollama: loopback only, /api/chat, non-streaming', async () => {
    const m = mockFetch(() => ({ json: { message: { content: 'hi' } } }));
    const p = createProvider({ provider: 'ollama', model: 'llama-test', baseUrl: 'http://127.0.0.1:11434' }, {}, m.fetch);
    expect(p.local).toBe(true);
    expect(await p.complete(req)).toEqual({ text: 'hi', refused: false });
    expect(m.calls[0]!.url).toBe('http://127.0.0.1:11434/api/chat');
    expect(m.calls[0]!.body).toMatchObject({ model: 'llama-test', stream: false, messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'hello' }] });
    expect(() => ollamaBaseUrl('http://192.168.1.20:11434')).toThrow(AiConfigError);
    expect(() => createProvider({ provider: 'ollama', model: '' }, {}, m.fetch)).toThrow(/Choose a model/);
  });

  it('Anthropic: official SDK, default model, low effort, fallbacks, refusal handling', async () => {
    const m = mockFetch(() => ({ json: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text: 'Reworded.' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } }));
    const p = createProvider({ provider: 'anthropic', model: '' }, env, m.fetch);
    expect(p.model).toBe('claude-opus-5-5');
    expect(await p.complete(req)).toEqual({ text: 'Reworded.', refused: false });
    const c = m.calls[0]!;
    // Pinned to the official endpoint even if ANTHROPIC_BASE_URL is set in the environment.
    expect(c.url).toMatch(/^https:\/\/api\.anthropic\.com\/v1\/messages(\?beta=true)?$/);
    // SDK 1.x sends the API key as a bearer token.
    expect(header(c, 'authorization')).toBe('Bearer test-key-a');
    expect(header(c, 'anthropic-beta')).toContain('server-side-fallback-2026-07-01');
    expect(c.body).toMatchObject({ model: 'claude-opus-5-5', system: 'sys', output_config: { effort: 'low' }, fallbacks: 'default', messages: [{ role: 'user', content: 'hello' }] });
    expect(c.body).not.toHaveProperty('temperature');
    expect(c.body).not.toHaveProperty('thinking');

    const refusal = mockFetch(() => ({ json: { id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: 'refusal', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } } }));
    expect(await createProvider({ provider: 'anthropic', model: '' }, env, refusal.fetch).complete(req)).toEqual({ text: '', refused: true });

    const denied = mockFetch(() => ({ status: 401, json: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } } }));
    await expect(createProvider({ provider: 'anthropic', model: '' }, env, denied.fetch).complete(req)).rejects.toThrow('Anthropic rejected the API key.');

    const offline: FetchLike = async () => {
      throw new TypeError('fetch failed');
    };
    await expect(createProvider({ provider: 'anthropic', model: '' }, env, offline).complete(req)).rejects.toThrow('Could not reach Anthropic. Check your internet connection.');
  });

  it('OpenAI and OpenRouter: chat completions with bearer auth', async () => {
    for (const [id, url] of [['openai', 'https://api.openai.com/v1/chat/completions'], ['openrouter', 'https://openrouter.ai/api/v1/chat/completions']] as const) {
      const m = mockFetch(() => ({ json: { choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] } }));
      const p = createProvider({ provider: id, model: 'test-model' }, env, m.fetch);
      expect(await p.complete(req)).toEqual({ text: 'ok', refused: false });
      expect(m.calls[0]!.url).toBe(url);
      expect(header(m.calls[0]!, 'authorization')).toMatch(/^Bearer test-key-/);
      expect(m.calls[0]!.body).toMatchObject({ model: 'test-model', messages: [{ role: 'system' }, { role: 'user' }] });
    }
    const refused = mockFetch(() => ({ json: { choices: [{ message: { content: null, refusal: 'no' }, finish_reason: 'stop' }] } }));
    expect((await createProvider({ provider: 'openai', model: 'm' }, env, refused.fetch).complete(req)).refused).toBe(true);
  });

  it('Gemini: generateContent with API-key header and safety blocks', async () => {
    const m = mockFetch(() => ({ json: { candidates: [{ content: { parts: [{ text: 'a' }, { text: 'b' }] }, finishReason: 'STOP' }] } }));
    const p = createProvider({ provider: 'gemini', model: 'gemini-test' }, env, m.fetch);
    expect(await p.complete(req)).toEqual({ text: 'ab', refused: false });
    expect(m.calls[0]!.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
    expect(header(m.calls[0]!, 'x-goog-api-key')).toBe('test-key-g');
    expect(m.calls[0]!.body).toMatchObject({ systemInstruction: { parts: [{ text: 'sys' }] } });
    const blocked = mockFetch(() => ({ json: { promptFeedback: { blockReason: 'SAFETY' } } }));
    expect((await createProvider({ provider: 'gemini', model: 'g' }, env, blocked.fetch).complete(req)).refused).toBe(true);
  });

  it('requires keys from the environment and never echoes them in errors', async () => {
    expect(() => createProvider({ provider: 'openai', model: 'm' }, {}, mockFetch(() => ({ json: {} })).fetch)).toThrow(/Set OPENAI_API_KEY/);
    const failing = mockFetch(() => ({ status: 500, json: { error: { message: 'boom' } } }));
    const err = await createProvider({ provider: 'openrouter', model: 'm' }, env, failing.fetch).complete(req).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect(String((err as Error).message)).not.toContain('test-key');
  });
});

describe('grounded rewrite', () => {
  const original = 'Cut CI pipeline time by 35% by caching PostgreSQL test fixtures';

  it('accepts pure rephrasing', () => {
    expect(checkRewrite(original, 'Reduced CI pipeline time by 35% through caching of PostgreSQL test fixtures')).toEqual([]);
  });

  it('rejects added numbers, dropped numbers and invented names', () => {
    expect(checkRewrite(original, 'Cut CI time by 50% using caching of PostgreSQL fixtures')).toEqual(expect.arrayContaining([expect.stringContaining('"50%"'), expect.stringContaining('Drops a number')]));
    expect(checkRewrite(original, 'Cut CI time by 35% with Redis caching for PostgreSQL fixtures')).toEqual([expect.stringContaining('"Redis"')]);
  });

  it('withholds an ungrounded suggestion end to end and passes the original only as quoted data', async () => {
    const m = mockFetch(() => ({ json: { message: { content: 'Here is the rewritten text: "Cut CI time by 35% at Google by caching PostgreSQL fixtures"' } } }));
    const p = createProvider({ provider: 'ollama', model: 'x' }, {}, m.fetch);
    const r = await suggestRewrite(p, { text: original, purpose: 'highlight' });
    expect(r).toMatchObject({ accepted: false, suggestion: '' });
    expect(r.problems[0]).toContain('Google');
    const prompt = (m.calls[0]!.body['messages'] as { content: string }[])[1]!.content;
    expect(prompt).toContain(`<original>\n${original}\n</original>`);
  });
});

describe('assist task grounding (v0.2.0)', () => {
  it('treats a sentence-ending period as punctuation, not part of a name', async () => {
    const { checkAssist } = await import('../src/index.ts');
    const c = { jobTitle: 'Engineer', employer: 'Fictional Co', jobDescription: 'We use PostgreSQL and Node.js daily.', profileFacts: [], profileSkills: [] };
    expect(checkAssist('summarize_job', 'The team uses Node.js and PostgreSQL.', c, false)).toMatchObject({ accepted: true, problems: [] });
    expect(checkAssist('summarize_job', 'The team uses Node.js and MongoDB.', c, false).problems[0]).toMatch(/MongoDB/);
  });
});

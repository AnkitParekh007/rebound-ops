/**
 * local-model.mjs - the optional local model, as the engine reaches it
 * (Autofill AF-05). A plain-JavaScript port of the ReboundOps API adapter
 * (apps/api/src/operations/local-model.ts, ADR 0005), because the engine has
 * no build step and cannot import the API. tests/local-model-parity.test.mjs
 * holds the two endpoint rules together.
 *
 * - Off unless REBOUNDOPS_LOCAL_MODEL_URL and REBOUNDOPS_LOCAL_MODEL are set.
 * - Loopback only (127.0.0.0/8, ::1, localhost), http or https, no credentials,
 *   query or fragment. Anything else is refused and never contacted.
 * - No API key or Authorization header; redirects are not followed; no retries.
 * - Every call has a timeout and can be cancelled; responses are capped at 1 MiB.
 * - complete() never throws for a model problem: it returns a validated value
 *   or an honest manual fallback with the reason and the prompt.
 *
 * Dependency-free, so `node --test` can load it.
 */

export const LOCAL_MODEL_URL_ENV = "REBOUNDOPS_LOCAL_MODEL_URL";
export const LOCAL_MODEL_NAME_ENV = "REBOUNDOPS_LOCAL_MODEL";
export const LOCAL_MODEL_TIMEOUT_ENV = "REBOUNDOPS_LOCAL_MODEL_TIMEOUT_MS";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const MAX_TIMEOUT_MS = 120_000;
export const MAX_RESPONSE_BYTES = 1024 * 1024;

/** Mirrors FEATURE_FLAG_ENV and the `autofill` flag in @reboundops/contracts (parity-tested). */
export const FEATURE_FLAG_ENV = "REBOUNDOPS_FEATURES";
export const AUTOFILL_FLAG = "autofill";

/**
 * Whether the Autofill feature flag is on. Same parsing as resolveFeatureFlags:
 * comma-separated, trimmed, exact names.
 * @param {Readonly<Record<string, string | undefined>>} env
 */
export function autofillEnabled(env) {
  return String(env[FEATURE_FLAG_ENV] ?? "").split(",").some((name) => name.trim() === AUTOFILL_FLAG);
}

/**
 * @typedef {{ state: "not_configured" }
 *   | { state: "invalid_config", model: string | null, detail: string }
 *   | { state: "configured", base: string, origin: string, model: string, timeoutMs: number }} LocalModelConfig
 * @typedef {"not_configured" | "invalid_config" | "unreachable" | "model_missing" | "timeout" | "cancelled" | "invalid_output"} ManualReason
 * @typedef {{ kind: "manual", reason: ManualReason, detail: string, prompt: string }} ManualFallback
 * @typedef {{ kind: "model", value: unknown, model: string, latencyMs: number }} ModelResult
 */

/** @param {string} hostname */
function isLoopbackHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return host === "localhost" || host === "::1" || /^127(?:\.\d{1,3}){3}$/.test(host);
}

/**
 * @param {Readonly<Record<string, string | undefined>>} env
 * @returns {LocalModelConfig}
 */
export function readLocalModelConfig(env) {
  const rawUrl = env[LOCAL_MODEL_URL_ENV]?.trim();
  const model = env[LOCAL_MODEL_NAME_ENV]?.trim() || null;
  if (!rawUrl && !model) return { state: "not_configured" };
  if (!rawUrl || !model) {
    return { state: "invalid_config", model, detail: `Set both ${LOCAL_MODEL_URL_ENV} and ${LOCAL_MODEL_NAME_ENV}.` };
  }
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { state: "invalid_config", model, detail: `${LOCAL_MODEL_URL_ENV} is not a URL.` };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { state: "invalid_config", model, detail: "Only http and https endpoints are supported." };
  }
  if (url.username || url.password) {
    return { state: "invalid_config", model, detail: "The endpoint URL must not contain credentials." };
  }
  if (!isLoopbackHost(url.hostname)) {
    return { state: "invalid_config", model, detail: "Only a model on this computer (127.0.0.1, ::1 or localhost) is allowed. Remote endpoints are never contacted." };
  }
  if (url.search || url.hash) {
    return { state: "invalid_config", model, detail: "The endpoint URL must not have a query or fragment." };
  }
  const rawTimeout = Number.parseInt(env[LOCAL_MODEL_TIMEOUT_ENV] ?? "", 10);
  const timeoutMs = Number.isSafeInteger(rawTimeout) && rawTimeout > 0 ? Math.min(rawTimeout, MAX_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;
  return { state: "configured", base: url.href.replace(/\/+$/, ""), origin: url.origin, model, timeoutMs };
}

class Fallback extends Error {
  /** @param {ManualReason} reason @param {string} detail */
  constructor(reason, detail) {
    super(detail);
    this.reason = reason;
  }
}

/**
 * Ask the local model for one JSON object. Returns `{kind: "model", value}`
 * only when `validate` accepts the parsed JSON (it returns the value to keep,
 * or null to reject); otherwise a manual fallback that says why.
 *
 * @param {LocalModelConfig} config
 * @param {{ system: string, user: string, validate: (parsed: unknown) => unknown | null, signal?: AbortSignal, maxTokens?: number, fetch?: typeof fetch }} req
 * @returns {Promise<ModelResult | ManualFallback>}
 */
export async function completeJson(config, req) {
  const prompt = `${req.system}\n\n${req.user}`;
  /** @type {(reason: ManualReason, detail: string) => ManualFallback} */
  const manual = (reason, detail) => ({ kind: "manual", reason, detail, prompt });
  if (config.state === "not_configured") return manual("not_configured", "No local model is configured.");
  if (config.state === "invalid_config") return manual("invalid_config", config.detail);
  if (req.signal?.aborted) return manual("cancelled", "Cancelled before the request was sent.");

  const started = Date.now();
  const timeout = AbortSignal.timeout(config.timeoutMs);
  const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
  const aborted = () =>
    req.signal?.aborted ? new Fallback("cancelled", "Cancelled.") : timeout.aborted ? new Fallback("timeout", `No answer within ${config.timeoutMs} ms.`) : null;
  try {
    let response;
    try {
      response = await (req.fetch ?? fetch)(`${config.base}/chat/completions`, {
        method: "POST",
        // No Authorization header, ever: a local model needs no key.
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "system", content: req.system }, { role: "user", content: req.user }],
          temperature: 0,
          stream: false,
          max_tokens: req.maxTokens ?? 1024,
          response_format: { type: "json_object" },
        }),
        redirect: "manual",
        signal,
      });
    } catch {
      throw aborted() ?? new Fallback("unreachable", "The endpoint did not answer.");
    }
    if (response.status >= 300 && response.status < 400) throw new Fallback("unreachable", "The endpoint redirected; redirects are not followed.");
    if (!response.ok) throw new Fallback("unreachable", `The endpoint answered with HTTP ${response.status}.`);
    let text;
    try {
      text = await readCapped(response, MAX_RESPONSE_BYTES);
    } catch (error) {
      throw aborted() ?? (error instanceof Fallback ? error : new Fallback("unreachable", "The response could not be read."));
    }
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Fallback("invalid_output", "The endpoint did not return JSON.");
    }
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Fallback("invalid_output", "The model returned no message content.");
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Fallback("invalid_output", "The model did not return JSON.");
    }
    const value = req.validate(parsed);
    if (value === null || value === undefined) throw new Fallback("invalid_output", "The model output does not match the expected structure.");
    return { kind: "model", value, model: config.model, latencyMs: Date.now() - started };
  } catch (error) {
    if (error instanceof Fallback) return manual(error.reason, error.message);
    return manual("unreachable", "The local model request failed.");
  }
}

/** @param {Response} response @param {number} cap */
async function readCapped(response, cap) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) {
      await reader.cancel();
      throw new Fallback("invalid_output", `The response is larger than ${cap} bytes.`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

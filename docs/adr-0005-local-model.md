# ADR 0005: An optional local model, loopback only, with an honest manual fallback

**Status:** Accepted for R0 (FND-05) on 12 November 2026. First feature use (Autofill AF-05) added on 13 November 2026.

## Context

Several operations features can use a model for a draft: Autofill narrative answers (AF-05), Inbox classification, Coach feedback and Strategy explanations. The plan requires that:
- no paid API is mandatory;
- every feature still works without a model;
- an invalid or missing model falls back honestly;
- nothing makes an automatic remote request.

The existing Anthropic provider ([AI provider](ai-provider.md)) remains the opt-in path for the recovery evidence review, and is unchanged.

## Decision

1. **Adapter** (`apps/api/src/operations/local-model.ts`): any OpenAI-compatible server on this computer (for example llama.cpp, Ollama or LM Studio), via `GET <base>/models` and `POST <base>/chat/completions` with `response_format: json_object` and `temperature: 0`.
2. **Off by default.** It is configured only when both `REBOUNDOPS_LOCAL_MODEL_URL` and `REBOUNDOPS_LOCAL_MODEL` are set. `REBOUNDOPS_LOCAL_MODEL_TIMEOUT_MS` defaults to 30 s and is capped at 120 s. Nothing contacts the model at start-up, and reading its status does not either; only an explicit check or a feature's request does.
3. **Endpoint allowlist: loopback only.**
   - Allowed: `127.0.0.0/8`, `::1` and `localhost`, over http or https.
   - Refused and never contacted: any other host, credentials in the URL, a query or fragment, and other schemes. A refused endpoint shows as `invalid_config`.
   - No API key or `Authorization` header is ever sent. Redirects are not followed. There are no retries.
4. **Honest outcome.** `complete()` never throws for a model problem. It returns either:
   - `{ kind: 'model', value }`, where `value` is JSON that passed the caller's schema and is still only a draft, never a reviewed fact; or
   - `{ kind: 'manual', reason, detail, prompt }`, with a reason of `not_configured`, `invalid_config`, `unreachable`, `model_missing`, `timeout`, `cancelled` or `invalid_output`, plus the prompt so the person can use another tool or work by hand.
5. **Bounds.** Each call has a timeout and can be cancelled by the caller (`AbortSignal`). Responses are capped at 1 MiB.
6. **HTTP**, behind the operations flags:
   - `GET /api/operations/local-model` reports the configuration and never contacts the model.
   - `POST /api/operations/local-model/check` runs the health check (`ready`, `model_missing`, `unreachable`, `invalid_config` or `not_configured`).

## Consequences

- **Autofill AF-05 is the first feature to use it.** The engine has no build step and cannot import the API, so it uses its own JavaScript port (`engine/web/src/lib/apply/local-model.mjs`). `tests/local-model-parity.test.mjs` holds that port to the API adapter: the same endpoint decisions and details for loopback and remote URLs, credentials, queries, schemes and timeouts, and the same environment names and limits.
  - It is behind the `autofill` flag. On the apply page, a box offers to draft free-text answers with the local model instead of the planner CLI (`drafter: "local_model"` on `POST /api/apply/prefill`). `GET /api/apply/local-model` reports whether that is possible and never contacts the model.
  - It drafts only `textarea` questions outside every sensitive category (`narrative-draft.mjs`). The prompt holds the questions, the CV text (the tailored CV when its HTML or Markdown source is readable, otherwise `cv.md`, capped at 24,000 characters) and the person's notes, all marked as data. `config/profile.yml` is never put in the prompt, so compensation never reaches the model.
  - Its output goes through the same `enforceAnswerPolicy` as planner output. Profile facts still settle identity and work authorization, sensitive questions are still held, and nothing else is answered.
  - When there is no draft (not configured, invalid, unreachable, timeout, cancelled or invalid output), the page says why, leaves the answers for the person and offers the prompt to copy. The prompt carries CV text, so it is sent to the page only and never written to the pre-fill log file.
- A model on another machine on the local network is not allowed. Allowing one would need an explicit, per-host opt-in in a later decision.
- Model availability, licence, memory, download size and latency are deployment variables. They are not measured or claimed here.

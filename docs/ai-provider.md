# Opt-in AI provider: payload preview, consent and safeguards

**Status:** Implemented behind a disabled-by-default gate and tested against mock providers. No live Anthropic credentials are supplied or used by the repository/CI. A successful build does not prove live provider responses.

## Default: no AI

The API reports `enabled: false` at `GET /api/ai/status`. Every core workflow (intake, evidence, job comparison, plan, review, backups, Markdown) works without a model or API key.

## Guided setup

Choose **Set up AI assistance** in the recovery app header, or from the integrated workspace's start screen or Settings. In the workspace it opens `#/ai-setup`. Recovery supports Anthropic; the workspace's other AI tools have separate provider settings.

The setup screen reads configuration without contacting Anthropic. It distinguishes **AI not configured**, **Configured — connection not tested**, **AI connected**, and **Connection test failed**. Connection results belong to the current API process and reset when it restarts.

## Configure the local server

Create an Anthropic key and set a provider-side workspace spend limit. Stop any running launcher first. In Bash, from the repository root, enter the key privately rather than placing it in shell history:

```sh
read -rsp 'Anthropic API key: ' ANTHROPIC_API_KEY; echo
export ANTHROPIC_API_KEY
bash scripts/start-demo.sh --ai
```

Alternatively, use `REBOUNDOPS_AI_ENABLED=true bash scripts/start-demo.sh` with the key already exported. With no opt-in, the launcher keeps AI off; `--no-ai` explicitly overrides the flag. Opt-in without a key fails before starting services. The launcher passes the key to the recovery API and strips known provider keys from the workspace process environment. Workspace tools retain their separate file-based configuration.

The integrated bridge provides recovery AI status and connection testing. For full requirement review, choose **Open full recovery** from Start or My next step. The launcher already serves the Angular app on the API port (4174 by default), with the same session and server-side AI configuration. No restart or repeated intake is required. Only the API reads the key; the Angular frontend does not embed it. `.env.example` documents variables but is not loaded automatically. `REBOUNDOPS_ANTHROPIC_MODEL` overrides the default model; choose a model available in your account and compatible with structured output.

## Test the connection, then approve each review

1. Open **Set up AI assistance** and select **Refresh AI status** after a server restart.
2. Choose **Test connection — contact Anthropic**. This explicit action requests metadata for the configured model using the server-side key. It sends no career records and does not generate text. It verifies access, not review quality or future availability.
3. If it fails, check the key, enablement flag, model access and network in the server environment. Errors are sanitized. Tests are limited to one per 30 seconds and do not consume the local analysis-attempt allowance.
4. In Angular, add a job target, confirm evidence, preview the exact payload and separately consent to sending that review. A connection test does not authorize a career-data request. Provider charges may apply to reviews.

API: `GET /api/ai/status` is passive. `POST /api/ai/test-connection` accepts only `{ "consent": true }`, rejects additional fields and retains the Host/Origin restrictions. The same allowlisted operations are exposed through `/api/rebound/ai/*` in the integrated workspace. Keys cannot be submitted or read through these endpoints.

The provider configuration and model name may change with upstream availability. Official reference: https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript and https://platform.claude.com/docs/en/build-with-claude/structured-outputs

## Exact data boundary

```json
{
  "target": {
    "id": "<UUID>",
    "title": "Frontend platform engineer",
    "requirements": [
      { "id": "<UUID>", "text": "Design accessible components" }
    ]
  },
  "evidence": [
    { "id": "<UUID>", "claim": "Led a component library migration" }
  ]
}
```

Only participant-confirmed evidence lines are included; `location`, `urgency`, `priorities`, `reviewNotes`, source labels, unverified/rejected claims and backups are not sent. Note that employer job descriptions and achievement claims may themselves contain sensitive information; inspect the full JSON before consenting.

The API returns a SHA-256 digest of the exact JSON and the session revision. Analyze requires the digest, current revision and `consent: true`. A stale or modified payload is rejected.

## Reliability and limits

- Model outputs are generated with schema-constrained JSON and then validated again using Zod.
- Requirement IDs must match exactly, with one suggestion per input requirement.
- Evidence IDs must correspond to participant-confirmed claims actually included in the payload.
- `possible_support` requires a cited confirmed claim and is *not* proof of qualification.
- Other statuses must not carry evidence IDs.
- Suggestions are returned to the UI but **never applied automatically**.
- API provider retries are disabled; output tokens are bounded, AI payloads are capped at 20,000 UTF-8 bytes, and attempts default to ten (`REBOUNDOPS_AI_MAX_ATTEMPTS` may raise or lower the local ceiling).
- Attempt counters persist across API restarts when `REBOUNDOPS_DATA_DIR` is set (file: `ai-attempt-counters.json`) or when `REBOUNDOPS_AI_COUNTER_FILE` points at an explicit path. Without either, counters are memory-only and reset on process restart.
- The status endpoint reports attempted, successful and failed requests plus input/output tokens reported by successfully validated provider responses. It returns no prompt text or user identifiers. These counts are **not** a currency spend ceiling and may undercount failed charged calls.
- **Before any live paid evaluation:** set a provider-side workspace spend limit in the Anthropic (or other) console. That provider limit is the real money ceiling; local attempt counters only bound request count.
- If disabled, provider calls are refused; errors never echo raw provider responses or secrets.
- Mock tests verify consent, stale hashes, fabricated evidence rejection, prompt-injection-like inputs, error sanitization, token metadata, request cap and no state mutation.
- See [synthetic evaluation and the live-provider approval gate](ai-evaluation.md).

## Limitations and operational risks

- The source data is still untrusted. Prompt injection can arise from job listings and achievement text; the system prompt treats it as data, but no prompt-based defense is infallible.
- A valid schema cannot guarantee true, appropriate or useful career guidance.
- API providers can change availability and pricing. This feature has not been live-tested in CI.
- Local attempt limits constrain request count, not currency spend; always pair live tests with a provider workspace spend limit.
- Do not enable AI for human participants until consent, provider terms and privacy expectations have been reviewed.
- When a user changes session data, the Angular UI discards the previous preview.

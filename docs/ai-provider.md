# Opt-in AI provider: payload preview, consent and safeguards

**Status:** Implemented behind a disabled-by-default gate and tested against mock providers. No live Anthropic credentials are supplied or used by the repository/CI. A successful build does not prove live provider responses.

## Default: no AI

The API reports \`enabled: false\` at \`GET /api/ai/status\`. Every core workflow (intake, evidence, job comparison, plan, review, backups, Markdown) works without a model or API key.

## Setup (on your own development machine only)

1. Create an Anthropic API key using your provider account; it may incur charges.
2. Keep it out of the repository and frontend. \`.env.example\` documents the needed variables but is **not loaded automatically**.
3. Set environment variables in the terminal that launches the local API:

\`\`\`sh
export REBOUNDOPS_AI_ENABLED=true
export ANTHROPIC_API_KEY='your-private-server-side-key'
export REBOUNDOPS_ANTHROPIC_MODEL='claude-sonnet-5-5'
npm run dev:api
\`\`\`

4. Start the Angular frontend separately with \`npm run dev:web\`.
5. Add a job target, preview the exact payload in the UI, then make an explicit consent decision.

The provider configuration and model name may change with upstream availability. Official reference: https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript and https://platform.claude.com/docs/en/build-with-claude/structured-outputs

## Exact data boundary

\`\`\`json
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
\`\`\`

Only participant-confirmed evidence lines are included; \`location\`, \`urgency\`, \`priorities\`, \`reviewNotes\`, source labels, unverified/rejected claims and backups are not sent. Note that employer job descriptions and achievement claims may themselves contain sensitive information; inspect the full JSON before consenting.

The API returns a SHA-256 digest of the exact JSON and the session revision. Analyze requires the digest, current revision and \`consent: true\`. A stale or modified payload is rejected.

## Reliability and limits

- Model outputs are generated with schema-constrained JSON and then validated again using Zod.
- Requirement IDs must match exactly, with one suggestion per input requirement.
- Evidence IDs must correspond to participant-confirmed claims actually included in the payload.
- \`possible_support\` requires a cited confirmed claim and is *not* proof of qualification.
- Other statuses must not carry evidence IDs.
- Suggestions are returned to the UI but **never applied automatically**.
- API provider retries are disabled; output tokens are bounded and requests are capped at 10 per API process.
- If disabled, provider calls are refused; errors never echo raw provider responses or secrets.
- Mock tests verify consent, stale hashes, fabricated evidence rejection and no state mutation.

## Limitations and operational risks

- The source data is still untrusted. Prompt injection can arise from job listings and achievement text; the system prompt treats it as data, but no prompt-based defense is infallible.
- A valid schema cannot guarantee true, appropriate or useful career guidance.
- API providers can change availability and pricing. This feature has not been live-tested in CI.
- The ten-attempt limit constrains requests, not actual currency spend; monitor real usage.
- Do not enable AI for human participants until consent, provider terms and privacy expectations have been reviewed.
- When a user changes session data, the Angular UI discards the previous preview.

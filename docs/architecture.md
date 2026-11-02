# Architecture and implementation plan

## Current v0.1: deterministic manual pilot

The browser loads static files with no build step or third-party dependencies:

- index.html — semantic accessible progressive workflow
- styles.css — responsive layout
- src/app.mjs — client-side state + event handlers
- src/core.mjs — pure route/action/export logic
- src/demo.mjs — fictional sample (never real user data)
- tests/core.test.mjs — tests using Node's built-in runner
- scripts/serve.mjs — localhost-only development static server

Data remains in JavaScript memory and is discarded on refresh. Markdown export only happens on explicit click. No telemetry, providers, authentication, persistence, third-party CDN, uploads or network calls exist in the prototype. Avoid entering secrets or confidential employer information.

## Planned v0.2 after validation

Frontend: Angular + TypeScript and Material/CDK.
Local API: Node.js LTS + Fastify.
Contracts: Zod / JSON Schema for provenance, extracted evidence, route comparison, action plan and review.
AI: One official provider TypeScript SDK behind a typed adapter.
Persistence: Versioned JSON in a user-owned local directory, with backups and opt-in storage.
Verification: Vitest + Playwright + GitHub Actions.

### Suggested modules

- core/evidence — claim, supporting source span, confirmation status
- core/routes — alternatives with supporting evidence, gaps, uncertainty, next test
- core/planning — allowed hours, dependencies, step limits, action order
- core/review — observations, plan version and rationale for changes
- ai/provider — request schema, redaction, cost limits, retries, provider adapter
- app — accessible intake, comparison, edits and export

### Constraints

- Any AI claim must cite supplied evidence and be confirmable by the person.
- Text from a résumé or job description is **data**, not trusted instructions.
- No unstated salary, vacancy or hiring-probability claims.
- Users approve each significant state transition.
- Show the exact information leaving the computer before AI calls.
- Prevent accidental Git commits of private profiles, API keys or pilot notes.
- Keep provider keys in environment variables on the local API, not frontend JavaScript.
- Maintain schema version and migration strategy before adding durable user data.

## Security follow-ups

Threat model: prompt injection, fabricated extracted evidence, secret leakage, untrusted job descriptions, overcollection, XSS, malicious export filenames, and offline recovery. Use deterministic validators and human approval for any AI-generated outputs.

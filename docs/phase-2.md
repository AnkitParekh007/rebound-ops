# Phase 2 — typed application implementation

The Phase 1 manual prototype has been validated by the project owner. This implementation carries the chosen workflow into a new typed application. Validation results are not yet included in the public repository; do not fabricate participant metrics.

## Architecture (v0.2)

\`\`\`text
apps/web/              Angular standalone app with signals and FormsModule
  proxy.conf.json      Proxy /api to localhost:4174 during development
apps/api/              Fastify API, bound to 127.0.0.1
packages/contracts/    Zod schemas + deterministic workflow transitions
dist/                  Generated artifacts; not committed
\`\`\`

The original Phase 1 pilot remains in \`src/\`, \`tests/\`, \`index.html\` and \`styles.css\`.

## Data contracts

- **Evidence:** mandatory source kind/label, claim ID, editable status (unverified, confirmed, rejected).
- **Intake:** work preference, 1–20 available hours per week, urgency, target routes and 0–15 evidence items.
- **Routes:** Return / Shift / Bridge; candidate evidence IDs only, explicit unknowns and next tests. No fit scores.
- **Plan:** up to seven actions within budget; user-selected route, explicit checkbox progress.
- **Session:** v1 schema, unique ID, optimistic revision, timestamps, notes.

**Important:** The UI's Confirm button records participant confirmation, not independent verification. User-entered evidence isn't proof of meeting a role requirement. Routes and plans are deterministic examples; no current job openings are fetched.

## API endpoints

| Verb | URL | Outcome |
|---|---|---|
| GET | \`/api/health\` | No-AI/no-persistence status |
| POST | \`/api/sessions\` | Create validated, memory-only session |
| GET | \`/api/sessions/:id\` | Read current session |
| PUT | \`/api/sessions/:id/intake\` | Replace intake; **resets** route/plan/review |
| PUT | \`/api/sessions/:id/evidence/:evidenceId\` | Confirm/unverify/reject evidence |
| PUT | \`/api/sessions/:id/route\` | Choose route; creates a fresh plan |
| PUT | \`/api/sessions/:id/actions/:actionId\` | Set action completion |
| PUT | \`/api/sessions/:id/review\` | Record outcomes |
| GET | \`/api/sessions/:id/export\` | Download Markdown |

All state-changing operations except create require \`expectedRevision\`. Requests with stale revisions receive HTTP 409 and the latest session. Invalid inputs produce 400. API process restarts discard all sessions.

## Privacy, threat model and gaps

- API is intentionally bound to loopback (\`127.0.0.1\`) and limits JSON body size.
- Calls with browser Origin outside a local allowlist are refused.
- Angular templates interpolate text rather than inserting unsanitized HTML.
- No telemetry, providers, disk persistence, browser local storage or accounts.
- No verified résumé ingestion, job-description extraction or AI analysis.
- A local computer isn't a security boundary against other local processes. Do not paste secrets.
- No authentication or CSRF token, no encryption at rest and no service hardening yet; production internet hosting is not supported.
- Manual source claims are not automatically verified.

## Next vertical slice

1. Collect and document the actual Phase 1 feedback privately.
2. Add user-editable source references and evidence-to-job-requirement mapping (without hallucinated matches).
3. Add focused Angular browser tests and accessibility checks.
4. Introduce opt-in local persistence, explicit deletion and backup support.
5. Only then add the first AI adapter with provider-bound preview, privacy checks and safe structured outputs.

## Dependency policy

Angular 22.2.x (active), TypeScript 6.0.x, Fastify 5.12.x and Zod 4. Dependencies are installed from npm and pinned by the project once a verified lockfile is generated. GitHub CI tests the actual integration.

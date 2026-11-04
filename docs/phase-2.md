# Phase 2 — typed application implementation

The Phase 1 manual prototype was feature-tested by the solo project owner; **no external participants have yet tested the application**. The typed application and its cloud end-to-end checks demonstrate engineered behavior, not user desirability or real-world outcomes. Do not fabricate participant metrics.

## Architecture (v0.2)

```text
apps/web/              Angular standalone app: shell + feature components, SessionStore (signals),
                       typed SessionApiService; see frontend-architecture.md
  proxy.conf.json      Proxy /api to localhost:4174 during development
apps/api/              Fastify API, bound to 127.0.0.1
packages/contracts/    Zod schemas + deterministic workflow transitions
dist/                  Generated artifacts; not committed
```

The original Phase 1 pilot remains in `src/`, `tests/`, `index.html` and `styles.css`.

## Data contracts

- **Evidence:** mandatory source kind/label, claim ID, editable status (unverified, confirmed, rejected), and optional exact document-span citation.
- **Source documents:** at most three user-pasted résumé/project-note excerpts, immutable within a session, each capped at 10,000 characters. Evidence citations store a document ID and exact UTF-16 start/end offsets.
- **Corrections:** reasoned, timestamped edits to a claim/source preserving the evidence ID but resetting it to unverified and revoking linked requirement support. At most 50 corrections per session.
- **Intake:** work preference, 1–20 available hours per week, urgency, target routes and 0–15 evidence items.
- **Routes:** Return / Shift / Bridge; candidate evidence IDs only, explicit unknowns and next tests. No fit scores.
- **Plan:** up to seven actions within budget; user-selected route, explicit checkbox progress.
- **Job targets:** 0–3 manually pasted job descriptions, with 1–12 requirements each and explicit unreviewed/supported/gap states.
- **Session:** v1 schema, unique ID, optimistic revision, timestamps, notes, requirement review.
- **Backup:** user-initiated JSON download, validated import to a fresh memory-only session.
- **Opt-in saving:** persisted local snapshots only after a private folder and session-specific user consent.

**Important:** The UI's Confirm button records participant confirmation, not independent verification. User-entered evidence isn't proof of meeting a role requirement. Routes and plans are deterministic examples; no current job openings are fetched.

## API endpoints

| Verb | URL | Outcome |
|---|---|---|
| GET | `/api/health` | No-AI/no-persistence status |
| POST | `/api/sessions` | Create validated, memory-only session |
| GET | `/api/sessions/:id` | Read current session |
| GET | `/api/persistence/status` | Report local storage availability and recovery warnings |
| GET | `/api/sessions/saved` | List opted-in resumable sessions |
| PUT | `/api/sessions/:id/persistence` | Per-session consent to save or revert to memory-only |
| PUT | `/api/sessions/:id/intake` | Replace intake; **resets** route/plan/review |
| PUT | `/api/sessions/:id/evidence/:evidenceId` | Confirm/unverify/reject evidence |
| POST | `/api/sessions/:id/documents` | Paste one local-only source document |
| DELETE | `/api/sessions/:id/documents/:documentId` | Delete an unreferenced source document |
| PUT | `/api/sessions/:id/evidence/:evidenceId/correction` | Correct a claim, attach exact quotation and record reason |
| PUT | `/api/sessions/:id/route` | Choose route; creates a fresh plan |
| PUT | `/api/sessions/:id/actions/:actionId` | Set action completion |
| POST | `/api/sessions/:id/targets` | Add manually entered job requirements |
| PUT | `/api/sessions/:id/targets/:targetId/requirements/:requirementId` | Review requirement and link confirmed evidence |
| DELETE | `/api/sessions/:id/targets/:targetId` | Remove a job target |
| POST | `/api/sessions/restore` | Validate and restore a JSON backup into a new session |
| DELETE | `/api/sessions/:id` | Delete the in-memory session |
| PUT | `/api/sessions/:id/review` | Record outcomes |
| GET | `/api/sessions/:id/export` | Download Markdown |

All state-changing operations except create require `expectedRevision`. Requests with stale revisions receive HTTP 409 and the latest session. Invalid inputs produce 400. API process restarts discard all sessions.

## Privacy, threat model and gaps

- API is intentionally bound to loopback (`127.0.0.1`) and limits JSON body size.
- Calls with browser Origin outside a local allowlist are refused.
- Angular templates interpolate text rather than inserting unsanitized HTML.
- No telemetry, automatic provider calls, browser local storage or accounts; both local disk saving and AI are off by default.
- No verified résumé ingestion, automatic job-description parsing or AI analysis. Users paste requirements manually.
- Explicit user backups may contain personal information; they are not automatically encrypted.
- A local computer isn't a security boundary against other local processes. Do not paste secrets.
- No authentication or CSRF token, no encryption at rest and no service hardening yet; production internet hosting is not supported.
- Manual source claims are not automatically verified.

## Next vertical slice

1. Collect and document the actual Phase 1 feedback privately.
2. Improve source references with exact résumé/project-note spans and refine manual requirement review.
3. Add Angular browser tests and accessibility checks.
4. Evaluate user acceptance and portability of the newly implemented opt-in saving.
5. Verify the already scaffolded optional AI provider against live fictional data before enabling participant usage.

## Dependency policy

Angular 22.2.x (active), TypeScript 6.0.x, Fastify 5.12.x and Zod 4. Dependencies are installed from npm and pinned by the project once a verified lockfile is generated. GitHub CI tests the actual integration.

## Optional AI assessment (requires explicit consent)

The backend exposes `GET /api/ai/status`, `POST /api/sessions/:id/ai/preview`, and `POST /api/sessions/:id/ai/analyze`. The preview is local and returns the exact payload and a SHA-256 digest. The analyze request requires an explicit consent literal, matching digest and session revision. The provider is disabled by default and never invoked by page load, session changes or preview. Suggestions are schema-validated and cross-checked against all supplied requirement and evidence IDs. They are not auto-applied to session data.

See [AI provider guide](ai-provider.md) for opt-in configuration, limitations and mock-test strategy.

## Browser smoke tests

Playwright performs a full browser journey: initial intake, evidence confirmation, a supplied job requirement, route selection, progress update, Markdown export, JSON backup, deletion and restore. A separate axe-core check rejects serious/critical accessibility issues in the initial and intake states. Run after compiling the Angular site and API:

```sh
npm run build
npx playwright install chromium
npm run test:e2e
```

CI installs Chromium with system dependencies. The browser tests use the built Angular application served locally by the Fastify API on port 4174. No hosted service or private account is involved.

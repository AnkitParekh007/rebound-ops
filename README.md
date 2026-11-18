# ReboundOps

A local-first, privacy-oriented workspace for running a job search: capture postings, see where every detail came from, track applications honestly, and keep follow-ups in one place — all on your own computer.

> **Status:** early development (milestone M1). Not yet released.

## Principles

- **Local-first.** Data lives in a single SQLite file in a private directory on your machine. No account, no cloud service.
- **AI optional.** Every feature works with AI turned off. Model integrations (local or cloud) are opt-in.
- **Grounded.** Extracted job details carry the exact text they came from. Nothing is invented — a missing salary stays blank.
- **You stay in control.** ReboundOps never submits applications. An application is only marked *applied* after you confirm you submitted it yourself.
- **Honest about verification.** Pasted postings are marked *unverified*; nothing is claimed to have been checked against a live site.

## What works today

| Area | Status |
| --- | --- |
| Onboarding (skip / back / next, AI mode, goals) | ✅ |
| Profile & preferences (roles, countries, arrangement, relocation, sponsorship, skills, experience, saved answers) | ✅ |
| Manual job intake with evidence-backed extraction, duplicate detection | ✅ |
| Tracker with status workflow, confirmation gate for *applied*, activity trail, notes | ✅ |
| Overview: metrics and next actions derived from saved records | ✅ |
| JSON export (`GET /api/export`) | ✅ |
| Fit scoring, resume import, tailoring, PDF/DOCX, follow-up reminders, AI providers | Planned |

## Requirements

- Node.js **24 or newer** (uses the built-in `node:sqlite` module and native TypeScript type stripping)
- npm 11

## Getting started

```bash
npm ci
npm run dev:api     # API on http://127.0.0.1:4175, data in ./.local-data
npm run dev:web     # UI on http://127.0.0.1:4174 (proxies /api to the API)
```

Without `REBOUND_DATA_DIR`, the API stores data in `~/.reboundops`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `REBOUND_DATA_DIR` | `~/.reboundops` | Where the database lives (created with `0700`) |
| `REBOUND_API_PORT` | `4175` | API port |
| `REBOUND_API_HOST` | `127.0.0.1` | Must be a loopback address |
| `REBOUND_WEB_PORT` | `4174` | Used to derive allowed browser origins |
| `REBOUND_ALLOWED_ORIGINS` | `http://localhost:4174,http://127.0.0.1:4174` | Exact-match CORS allow-list |
| `REBOUND_LOG_LEVEL` | `warn` | Fastify/pino log level; request bodies are never logged |

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Unit, storage, API and Angular component tests |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |
| `npm run test:smoke` | Starts the real API, writes data, restarts it, verifies persistence |
| `npm run test:e2e` | Playwright browser journey (uses installed Google Chrome; set `PW_CHANNEL` to change) |
| `npm run build` | Typecheck and production web build |
| `npm run audit:release` | Path/secret scan, licence check, SBOM (`reports/sbom.json`), `npm audit` |

## Layout

```
apps/api                 Fastify service bound to loopback (validation, origin/host guards)
apps/web                 Angular UI (standalone components, signals, zoneless)
packages/contracts       Shared zod schemas — the API contract
packages/core            Workflow rules, dashboard derivation, defaults
packages/job-intelligence  Extraction with evidence, URL canonicalisation, dedupe, grounding checks
packages/storage         SQLite persistence, append-only migrations
scripts/                 Smoke and release-audit scripts
tests/                   Fixtures (fictional data only) and end-to-end tests
```

## Security notes

- The API only answers requests addressed to a loopback host name (DNS-rebinding defence), rejects unknown `Origin`s, and requires `application/json` for writes (blocks cross-site form posts).
- Job descriptions are untrusted input: they are stored and displayed as plain text and never interpreted.
- The web app ships a restrictive Content-Security-Policy and loads no remote fonts, scripts or images.

## License

MIT — see [LICENSE](LICENSE). Third-party packages keep their own licences; `npm run audit:release` lists them.

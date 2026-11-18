# ReboundOps

A local-first, privacy-oriented workspace for running a job search. You can capture postings, see where every detail came from, assess fit honestly, tailor documents from facts you have verified, prepare applications, and track follow-ups. Everything runs on your own computer.

> **Status:** pre-release. All MVP milestones are implemented and tested locally; see
> [docs/IMPLEMENTATION_PROGRESS.md](docs/IMPLEMENTATION_PROGRESS.md) for exact status and known gaps.

## Principles

- **Local-first.** One SQLite file in a private directory (`0700`/`0600`). No account, no cloud service.
- **AI optional.** Every feature works with AI off. Local (Ollama) or cloud providers are opt-in, need your consent, and only ever *suggest rewording* of text you select. Suggestions that add facts are withheld.
- **Grounded.** Extracted job details carry the exact text they came from. Drafts use only facts you marked verified, and missing information stays blank or becomes a `[[placeholder]]`.
- **You stay in control.** ReboundOps never submits applications or sends messages. *Applied* requires your explicit confirmation.
- **Honest about verification.** Postings stay *unverified* until you confirm them on the official site.

## Features

| Area | What it does |
| --- | --- |
| Onboarding | Welcome flow with skip/back/next, AI mode, search goals |
| Profile | Preferences, eligibility facts, contact and links, skills, verified experience with highlights, education, certifications, saved answers |
| Resume import | `.docx`, `.txt`, `.md` or pasted text. The original is stored privately; parsed facts are reviewed before being added (never overwriting) |
| Job intake | Paste a description and URL. Title, employer, location, salary (only when stated) and arrangement are shown with their evidence. Duplicate detection |
| Assessment | Explainable 0–5 fit rubric (role, skills, experience, location) and eligibility: confirmed, unconfirmed or ineligible. Missing information is kept separate from real disqualifiers |
| Documents | Tailored resume (selects and orders your verified highlights) and cover letter. Editable, with provenance. ATS-friendly PDF and DOCX; every export is re-read to confirm employers, dates, education and links survived |
| Preparation | Screening answers drafted from saved answers and stated facts only (otherwise "needs your answer"), a checklist, and the official application link |
| Tracking | Status workflow, activity trail, notes, contacts, reminders, follow-up drafts (copy or open in your own mail app) |
| Overview | Pipeline, next actions, reminders, response rate and median days to response, derived from your records |
| Data | Full JSON export; staged, previewed import of exports or the [neutral import format](docs/IMPORT_FORMAT.md) |

## Requirements

- Node.js **24 or newer** (uses the built-in `node:sqlite` module and native TypeScript type stripping)
- npm 11

## Install and run

```bash
npm ci
npm run build
npm start
```

Then open <http://127.0.0.1:4175>. Data is stored in `~/.reboundops` unless you set `REBOUND_DATA_DIR`.

For development, run the API and the Angular dev server separately:

```bash
npm run dev:api     # API on http://127.0.0.1:4175, data in ./.local-data
npm run dev:web     # UI on http://127.0.0.1:4174 (proxies /api to the API)
```

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `REBOUND_DATA_DIR` | `~/.reboundops` | Where the database lives |
| `REBOUND_API_PORT` | `4175` | Port |
| `REBOUND_API_HOST` | `127.0.0.1` | Must be a loopback address |
| `REBOUND_WEB_DIST` | built app if present | Directory of the web build to serve; empty string disables it |
| `REBOUND_ALLOWED_ORIGINS` | dev server and own origin | Exact-match CORS allow-list |
| `REBOUND_LOG_LEVEL` | `warn` | Log level; request bodies and URLs are never logged |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | unset | Only needed if you enable that cloud provider. Keys are read from the environment and never stored or displayed |

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Unit, storage, API, security and Angular component/accessibility tests |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript |
| `npm run test:smoke` | Starts the real server, writes data, restarts, checks persistence and packaged web serving |
| `npm run test:exports` | Reads generated PDF and DOCX back with independent macOS tools (skipped elsewhere) |
| `npm run test:e2e` | Playwright browser journey (installed Chrome by default; `PW_CHANNEL=chromium` in CI) |
| `npm run build` | Typecheck and production web build |
| `npm run audit:release` | Path, secret and licence checks, SBOM (`reports/sbom.json`), `npm audit`, CSP check of the build |

## Layout

```
apps/api                   Fastify server on loopback (guards, validation, same-origin web serving)
apps/web                   Angular UI (standalone components, signals, zoneless)
packages/contracts         Shared zod schemas — the API contract
packages/core              Workflow rules, dashboard and analytics
packages/job-intelligence  Extraction with evidence, dedupe, grounding, fit and eligibility
packages/documents         Resume import, tailoring, cover letters, PDF/DOCX writers, export checks
packages/applications      Screening answers, checklist, follow-up drafts
packages/ai-providers      Optional Ollama / Anthropic / OpenAI / Gemini / OpenRouter adapters, grounded rewrite
packages/importer          Import planning (validation, dedupe, no-overwrite profile merge)
packages/storage           SQLite persistence, append-only migrations
scripts/                   Smoke, export verification and release audit
tests/                     Fictional fixtures and end-to-end tests
```

## Security

- The server binds to loopback and answers only to loopback host names (a DNS-rebinding defence). It rejects unknown `Origin`s, requires JSON for writes (blocking cross-site form posts), and limits body sizes.
- Job descriptions and imported files are untrusted input: they are validated, stored and shown as plain text, and never interpreted. AI prompts pass them as quoted data.
- The web app ships a strict Content-Security-Policy and loads nothing remote.
- See [docs/PROVENANCE.md](docs/PROVENANCE.md) for originality and licensing notes.

## License

MIT — see [LICENSE](LICENSE). Third-party packages keep their own licences; `npm run audit:release` lists them, and the web build includes `3rdpartylicenses.txt`.

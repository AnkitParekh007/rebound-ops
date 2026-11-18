# ReboundOps capabilities matrix (source of truth for site copy)

Compiled on 2026-11-18 from the repository at `fc049c1` (`main`) and the public GitHub releases
`v0.2.0` and `v0.1.0`. Every claim on the marketing site must trace to a row here. If the product
changes, update this file first, then `src/data/product.ts`, then the pages.

Sources: `README.md` (R), `docs/INSTALL.md` (I), `docs/RELEASE_READINESS.md` (RR),
`docs/PROVENANCE.md` (P), `docs/MIGRATION_SPEC.md` / `docs/IMPORT_FORMAT.md` (M), `LICENSE` (L),
`package.json` (PJ), public release notes (GH-0.2.0, GH-0.1.0),
`packages/ai-providers/src/tasks.ts` (T).

## Facts about the project

| Fact | Value | Source |
| --- | --- | --- |
| Current version | 0.2.0, published 2026-11-18 as a GitHub **pre-release** | PJ, GH-0.2.0 |
| Tag → commit | `v0.2.0` → `4e930db`; `v0.1.0` → `d47d3a3` (both 2026-11-18) | git tags, RR |
| Licence | MIT, copyright 2026 Ankit Parekh. Third-party packages keep their own licences | L, R |
| Distribution | `reboundops-0.2.0.tar.gz` (428,601 bytes): source with a prebuilt web app. Plus `SHA256SUMS`, `THIRD_PARTY_NOTICES.txt`, `reboundops-0.2.0.sbom.json`. **No native installer, no desktop wrapper** | GH-0.2.0, I |
| v0.1.0 assets | No downloadable assets attached to the v0.1.0 release | GH-0.1.0 |
| Requirements | Node.js 24+ (built-in `node:sqlite`, native type stripping), npm 11 | R, I |
| Footprint | ~100 MB on disk (measured 96 MB), ~105 MB resident (measured, Apple Silicon) | I |
| Platforms | macOS Apple Silicon: primary, verified. macOS Intel: expected, not separately tested. Linux x64: tested in CI (Ubuntu). Windows 11: **not tested** | I |
| Interface | Browser tab at `http://127.0.0.1:4175` served by the local API | R, I |
| Data location | `~/.reboundops` (one SQLite file; folder 0700, file 0600), configurable via `REBOUND_DATA_DIR` | R, I |
| Network | Needed to install runtime libraries; afterwards only for Discover or a cloud AI provider | I |
| Tests (v0.2.0) | 216 backend/API/integration tests + 33 Angular tests (12 axe checks); CI green incl. browser journey | RR |

## Capabilities in v0.2.0

| Area | What it does (site may say) | Must not say | Source |
| --- | --- | --- | --- |
| Onboarding | Welcome flow with skip/back/next, AI mode choice, search goals | — | R |
| Profile | Preferences, eligibility facts, contact and links, skills, verified experience with highlights, education, certifications, saved answers | — | R |
| Resume import | `.pdf` (selectable text, read locally via pdf.js), `.docx`, `.txt`, `.md`, pasted text; extraction confidence and warnings; scanned/protected/damaged PDFs detected, type the text yourself while the original is kept; facts reviewed before being added, never overwriting | OCR; "any PDF" | R, GH-0.2.0 |
| Discover | One company's public job board at a time on Greenhouse, Lever, Ashby or Workable, after consent; sends only the board name you type; filters, freshness, fit/eligibility, duplicate warnings, save to tracker, re-check if still listed | Workday; "searches the whole web"; Workable is official (it is the public feed behind Workable-hosted careers pages) | R, RR, GH-0.2.0 |
| Polite fetching | https allowlist, no cookies, 15 s timeout, 25 MB cap, 1 request/second/host, 30-minute cache | scraping, bypassing | RR |
| Job intake | Paste a description and URL; title, employer, location, salary (only when stated) and arrangement shown with their evidence; duplicate detection; postings stay *unverified* until you confirm them | "verified automatically" | R |
| Assessment | Explainable 0–5 fit rubric `fit-2026.2` (role, required skills, experience incl. per-skill years, location, seniority, published pay) with confidence and stated uncertainty, required vs preferred, missing qualifications, adjustable weights; eligibility confirmed / unconfirmed / ineligible; missing info separate from real disqualifiers | "predicts hiring"; success rates | R, GH-0.2.0 |
| Documents | Tailored resume (selects and orders verified highlights) and cover letter; editable, with provenance; ATS-friendly PDF and DOCX; every export re-read to confirm employers, dates, education and links | "guaranteed to pass ATS" | R |
| Preparation | Screening answers drafted only from saved answers and stated facts (otherwise "needs your answer"); checklist; official application link | auto-apply, auto-submit | R |
| Tracking | Status workflow; *Applied* only with explicit confirmation; original submission date kept; closed applications reopen with history; activity trail; notes; contacts and reminders with 30-day undo; priorities and snooze; interview notes; follow-up drafts and your own templates (copy, or open in your own mail app); CSV export | sends email/messages | R, GH-0.2.0 |
| Overview | Pipeline, next actions, ranked follow-ups, reminders, response rate and median days to response — derived from your own records | benchmark/industry stats | R |
| Data | Full backup, optionally password-protected (scrypt + AES-256-GCM); restore in the app (typed confirmation, recovery copy) or CLI; crash-safe journalled restore; data-folder lock; JSON and CSV exports; staged, previewed import | cloud sync | R, I, GH-0.2.0 |
| Import from earlier version | Neutral import format (profile, resume, preferences, jobs, application states/history, contacts, reminders); preview and confirm; input never deleted | "migrates your old data automatically"; real legacy data migrated (it has not been) | M, RR |
| AI (optional) | Off by default; everything works with AI off. Local Ollama with a model you already pulled. Seven grounded assist tasks: job summary, missing skills, tailoring wording, screening answer, cover letter, interview prep, follow-up. Output that adds facts not in your records is withheld; nothing saved automatically | "AI-powered" as a requirement; "AI writes your applications" | R, T, GH-0.2.0 |
| Cloud AI (opt-in) | Anthropic, OpenAI, Gemini, OpenRouter adapters; consent per request; keys only from environment variables, never stored or displayed; **tested with mocked requests only** | "tested with" any live cloud provider | R, RR |
| Security | Loopback only, loopback host names only (DNS-rebinding defence), unknown Origins rejected, JSON required for writes, body limits, strict CSP, nothing loaded remotely; request bodies and URLs never logged | "audited", "certified", "unhackable" | R |

## Known limitations (must be visible on the site)

- Pre-release software (0.x).
- Windows untested; Intel macOS not separately tested.
- No OCR; multi-column PDFs may merge lines.
- Workable integration uses an unofficial public feed that could change; Workday unsupported.
- Cloud AI providers tested with mocks only.
- No real data from earlier, non-ReboundOps tools has been migrated.
- Pay comparison needs the same currency and stated period; hourly pay is never converted.
- Application deletion is permanent (confirmed first).

## Claims the site must never make

Testimonials, user counts, GitHub stars, download counts, hiring/placement or success rates,
"auto-applies", "sends messages for you", "AI required", native installers (`.dmg`, `.exe`,
App Store), "MIT" for anything other than first-party code, any domain other than rebound-ops.org.

## Domain

The production domain is `https://rebound-ops.org/` (confirmed by the owner on 2026-11-19; it was
previously unresolved between `rebound-orgs.org` in the site brief and `rebound-ops.org` in
earlier notes). It is the default `SITE_URL`.

## Notes on repository documentation

`README.md` line 5 still says "v0.2.0 release candidate (not yet published)", but the release was
published on 2026-11-18 as a pre-release. The site follows the published release; the README line
should be updated separately.

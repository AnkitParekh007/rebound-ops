# ReboundOps 2.0 — Implementation progress

This file is the resumable checkpoint for development. A fresh session should read it, run the
verification commands below, and continue with **Next step**. It contains no personal data or
machine-specific paths (enforced by `npm run audit:release`).

_Last updated: 2026-11-18_

## Verification commands

```bash
npm ci
npm run lint && npm run typecheck
npm test                 # unit + storage + API + Angular component tests
npm run test:smoke       # real API process, restart, persistence
npm run build            # typecheck + production web build
npm run audit:release    # paths/secrets/licences/SBOM/npm audit
npm run test:e2e         # Playwright + installed Chrome (see Known blockers)
```

## Milestones

| Milestone | Status | Notes |
| --- | --- | --- |
| M0 Foundation | ✅ Done | npm workspaces, TS 6, Vitest, ESLint, Angular 22, Fastify 5, `node:sqlite` |
| M1 First vertical slice | ✅ Done | Onboarding, profile, manual job intake, tracker, overview, export, restart smoke |
| M2 Job intelligence | ✅ Done | 0–5 rubric (`fit-2026.1`), eligibility confirmed/unconfirmed/ineligible, evidence, missing info |
| M3 Resume & documents | ✅ Done | Import (.docx/.txt/.md/paste), verified-facts profile, tailoring, cover letter, PDF/DOCX + content checks |
| M4 Application preparation | ✅ Done | Grounded screening answers (needs-input when ungrounded), checklist, official link, user-only posting verification, checklist summary on submit |
| M5 Tracking & follow-ups | ✅ Done | Contacts, reminders (auto 7-day follow-up on submit), follow-up drafts (copy/mailto only), weekly + response analytics with caveats (schema v3) |
| M6 AI providers (optional) | ✅ Done | Ollama (loopback only), Anthropic (official SDK, pinned base URL), OpenAI, Gemini, OpenRouter; env-only keys; per-provider consent + per-request confirmation; grounded rewrite gate. Live calls unverified (mocked transport) |
| M7 UX completion | ✅ Done | Settings page, focus + live-region on navigation, job edit (provenance → user), delete with confirmation, tracker sort, axe a11y checks on 6 views (with negative control) | Settings page, AI/privacy controls, a11y pass, responsive, empty/loading/error states |
| M8 Import from earlier version | ⏳ Next | Neutral export schema, staged read-only import, preview/dedupe, confirm |
| M9 Security & originality | Partial | Loopback/Host/Origin/JSON guards, CSP, audit script, SBOM. Pending: CI workflow, security tests expansion |
| M10 Comprehensive testing | Partial | 90+ automated tests. Pending: a11y checks, failure-recovery, AI on/off acceptance |
| M11 Packaging & release | Pending | Single-command start (API serves built web), install docs, release-readiness report |

## Completed features (by package)

- `packages/contracts` — zod schemas for every API payload (profile, jobs, applications, assessment, resume import, drafts, export check).
- `packages/core` — status workflow (`applied` requires explicit confirmation), dashboard derivation, defaults.
- `packages/job-intelligence` — evidence-based extraction, URL canonicalisation, dedupe, grounding check, country detection, fit/eligibility assessment.
- `packages/storage` — SQLite, append-only migrations (schema v3: `resume_files` BLOBs, `documents` drafts/packages, `contacts`, `reminders`), corruption detection, 0700/0600 permissions.
- `packages/documents` — ZIP reader/writer with zip-bomb limits, DOCX read/write, text-only PDF writer (Helvetica/WinAnsi), resume parser, deterministic tailoring, cover letter with `[[placeholders]]`, export content verification.
- `packages/applications` — screening-answer drafting (saved answers → stated facts → needs input), application checklist.
- `packages/ai-providers` — optional provider adapters behind `AiProvider`; `suggestRewrite` withholds suggestions that add numbers/names/terms.
- `apps/api` — Fastify on loopback; endpoints listed in `apps/api/src/server.ts`.
- `apps/web` — Angular UI: welcome, profile (with resume import review), job intake, tracker, application detail (assessment + documents), overview.

## Test results (latest run)

- Backend/API (Vitest): 114 passed.
- Angular (Vitest/jsdom): 16 passed (incl. 7 axe accessibility checks).
- Smoke restart: pass. Build: pass. Release audit: pass.
- Independent export check: generated DOCX read by macOS `textutil`, generated PDF read by Apple PDFKit — all facts present (manual run, 2026-11-18).
- E2E (Playwright): **not run in the development sandbox** (see blockers).

## Local commits (newest first)

See `git log --oneline`. Milestone commits: M1 `4aeb082`, M2 `8ac4474`, M3 backend `2d653c8`, M3 UI (this update).

## Known defects / limitations

- PDF resume **import** is not supported (DOCX/TXT/MD/paste only); PDF export is supported.
- PDF export uses standard fonts with WinAnsi encoding; characters outside it (e.g. emoji, CJK) block PDF export with a clear message (DOCX works).
- Resume parsing is heuristic; every imported fact is unverified until the person confirms it.
- Country detection covers ~60 countries.

## Security & licensing

- Runtime dependencies: `fastify`, `zod`, `@anthropic-ai/sdk` (Apache-2.0, used only when the person enables Anthropic), Angular, `rxjs`, `tslib`. No new deps for documents (built on `node:zlib`).
- Dev-only advisories: picomatch ReDoS chain (no upstream fix); not shipped.
- Dev-only MPL-2.0: `lightningcss` (Angular build tool) and `axe-core` (a11y tests), not redistributed.

## External dependencies & blockers

- **E2E browser tests** cannot launch Chrome inside the development sandbox; the owner runs `npm run test:e2e` locally.
- **Real legacy-data migration** requires an export produced in a separate authorised session; the importer is built and tested on synthetic data only.
- **Live AI providers** need owner-supplied keys and consent; implemented against documented APIs with mocked transports.
- **Push / release** require owner approval.

## Next step

Start **M8 — Import from earlier version / re-import**:
1. Define neutral schema `reboundops-import` v1 in contracts + `docs/IMPORT_FORMAT.md` (profile, preferences, resume text, jobs, application states + history, notes). Also accept ReboundOps' own `reboundops-export` bundle.
2. `packages/storage` / API: `POST /api/import/preview` (validate + stage in memory, report counts, duplicates by dedupe key, rejected records with reasons) and `POST /api/import/commit` (requires the preview token + explicit confirmation; one transaction; never overwrites existing profile fields — fills empty only; imported facts unverified).
3. UI: Settings → "Import data" with file picker, preview table, confirm.
4. Synthetic fixtures only; malformed/hostile input tests (huge, wrong types, prototype pollution keys, script content).
5. Then M9–M11.

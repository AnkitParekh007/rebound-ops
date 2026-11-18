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
| M4 Application preparation | ⏳ Next | Screening answers from verified facts, review checklist, official link, submission confirmation |
| M5 Tracking & follow-ups | Pending | Recruiter contacts, reminders, follow-up drafts (no sending), history, analytics |
| M6 AI providers (optional) | Pending | Provider interface; Ollama + opt-in cloud (Anthropic, OpenAI, Gemini, OpenRouter) with mocks; consent + keychain/env secrets |
| M7 UX completion | Pending | Settings page, AI/privacy controls, a11y pass, responsive, empty/loading/error states |
| M8 Import from earlier version | Pending | Neutral export schema, staged read-only import, preview/dedupe, confirm |
| M9 Security & originality | Partial | Loopback/Host/Origin/JSON guards, CSP, audit script, SBOM. Pending: CI workflow, security tests expansion |
| M10 Comprehensive testing | Partial | 90+ automated tests. Pending: a11y checks, failure-recovery, AI on/off acceptance |
| M11 Packaging & release | Pending | Single-command start (API serves built web), install docs, release-readiness report |

## Completed features (by package)

- `packages/contracts` — zod schemas for every API payload (profile, jobs, applications, assessment, resume import, drafts, export check).
- `packages/core` — status workflow (`applied` requires explicit confirmation), dashboard derivation, defaults.
- `packages/job-intelligence` — evidence-based extraction, URL canonicalisation, dedupe, grounding check, country detection, fit/eligibility assessment.
- `packages/storage` — SQLite, append-only migrations (schema v2: `resume_files` BLOBs, `documents` drafts), corruption detection, 0700/0600 permissions.
- `packages/documents` — ZIP reader/writer with zip-bomb limits, DOCX read/write, text-only PDF writer (Helvetica/WinAnsi), resume parser, deterministic tailoring, cover letter with `[[placeholders]]`, export content verification.
- `apps/api` — Fastify on loopback; endpoints listed in `apps/api/src/server.ts`.
- `apps/web` — Angular UI: welcome, profile (with resume import review), job intake, tracker, application detail (assessment + documents), overview.

## Test results (latest run)

- Backend/API (Vitest): 83 passed.
- Angular (Vitest/jsdom): 7 passed.
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

- Runtime dependencies: `fastify`, `zod`, Angular, `rxjs`, `tslib` (all MIT/Apache-2.0/ISC). No new deps for documents (built on `node:zlib`).
- Dev-only advisories: picomatch ReDoS chain (no upstream fix); not shipped.
- Dev-only MPL-2.0: `lightningcss` (Angular build tool), not redistributed.

## External dependencies & blockers

- **E2E browser tests** cannot launch Chrome inside the development sandbox; the owner runs `npm run test:e2e` locally.
- **Real legacy-data migration** requires an export produced in a separate authorised session; the importer is built and tested on synthetic data only.
- **Live AI providers** need owner-supplied keys and consent; implemented against documented APIs with mocked transports.
- **Push / release** require owner approval.

## Next step

Start **M4 — Application preparation**:
1. `packages/applications`: screening-question drafting from saved answers + verified facts (answer only when grounded; otherwise mark "needs your answer"), review checklist (documents exported, eligibility reviewed, answers reviewed, official link known).
2. API: `/api/applications/:id/package` (get/update), checklist status; `applied` transition requires checklist acknowledgement + confirmation.
3. UI: "Prepare" section on the application page; official link prominence; confirmation dialog shows checklist.
4. Tests, then M5.

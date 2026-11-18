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
npm run test:exports     # independent PDF/DOCX read-back (macOS)
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
| M7 UX completion | ✅ Done | Settings page, focus + live-region on navigation, job edit (provenance → user), delete with confirmation, tracker sort, axe checks on 8 views (with negative control), contrast-safe tokens in both themes (audit) |
| M8 Import from earlier version | ✅ Done (synthetic data only) | `reboundops-import` v1 + own export round-trip; strict validation, per-record rejection, staged preview token, confirmed single-transaction commit (rollback tested), no overwrites, unverified facts; `npm run import:check`; [LEGACY_EXPORT_PROCEDURE.md](LEGACY_EXPORT_PROCEDURE.md). Real legacy migration pending a separately authorised export |
| M9 Security & originality | ✅ Done | Loopback/Host/Origin/JSON guards, cross-site request refusal (audit), body limits, error/log hygiene, header injection, traversal, CSP-safe build, data-folder lock, CI workflow, PROVENANCE.md |
| M10 Comprehensive testing | ✅ Done | 139 backend + 18 Angular tests; 13-step journey AI off/on; backup/restore, import rollback, AI timeouts/consent, a11y. Extended Playwright journey green in CI run 44298999802 on `f8b1f2d` |
| M11 Packaging & release | ✅ Done locally | `npm ci && npm run build && npm start` on one port; fresh-clone install and production start validated; lossless backup + `npm run restore`; `docs/RELEASE_READINESS.md` |

## Completed features (by package)

- `packages/contracts` — zod schemas for every API payload (profile, jobs, applications, assessment, resume import, drafts, export check).
- `packages/core` — status workflow (`applied` requires explicit confirmation), dashboard derivation, defaults.
- `packages/job-intelligence` — evidence-based extraction, URL canonicalisation, dedupe, grounding check, country detection, fit/eligibility assessment.
- `packages/storage` — SQLite, append-only migrations (schema v3: `resume_files` BLOBs, `documents` drafts/packages, `contacts`, `reminders`), corruption detection, 0700/0600 permissions, `VACUUM INTO` backups, validated restore, data-folder lock.
- `packages/documents` — ZIP reader/writer with zip-bomb limits, DOCX read/write, text-only PDF writer (Helvetica/WinAnsi), resume parser, deterministic tailoring, cover letter with `[[placeholders]]`, export content verification.
- `packages/applications` — screening-answer drafting (saved answers → stated facts → needs input), application checklist.
- `packages/ai-providers` — optional provider adapters behind `AiProvider`; `suggestRewrite` withholds suggestions that add numbers/names/terms.
- `packages/importer` — import planning (format detection, validation, dedupe, profile patch without overwrites).
- `apps/api` — Fastify on loopback; endpoints listed in `apps/api/src/server.ts`.
- `apps/web` — Angular UI: welcome, profile (with resume import review), job intake, tracker, application detail (assessment + documents), overview.

## Test results (latest run, fresh clone of `ff979af`, 2026-11-18)

- Backend/API/integration (Vitest): 139 passed (incl. security suite, 2 acceptance journeys, backup/restore and import rollback).
- Angular (Vitest/jsdom): 18 passed (incl. 9 axe accessibility checks, one of them a negative control).
- Smoke restart, build, release audit, independent export read-back: pass. Production start from the clone: pass.
- One real local inference through `/api/ai/rewrite` with an installed Ollama model: accepted.
- E2E (Playwright): the earlier spec is green in GitHub Actions (run 44278913105 on `07821f8`). The extended spec (`ff979af`) has **not run** (sandbox has no browser; not pushed).

## Local commits (newest first)

See `git log --oneline`. Post-milestone audit commits: `f63419a` backup/restore + lock, `e291254` AI errors, `0401a20` import check, `58366be` cross-site guard, `4842e63` fixture, `ff979af` contrast + tests, `29d575d` E2E locator, `f8b1f2d` multi-signal duplicate detection (found by the extended E2E), plus docs updates.

## Known defects / limitations

- PDF resume **import** is not supported (DOCX/TXT/MD/paste only); PDF export is supported.
- PDF export uses standard fonts with WinAnsi encoding; characters outside it (e.g. emoji, CJK) block PDF export with a clear message (DOCX works).
- Resume parsing is heuristic; every imported fact is unverified until the person confirms it.
- Country detection covers ~60 countries.
- Backups are unencrypted SQLite files; restore is command-line only (the app must be stopped).
- Reopening a rejected/withdrawn application goes back to Shortlisted only; re-marking Applied replaces the original submission date.
- Contact and reminder deletion has no confirmation or undo.

## Security & licensing

- Runtime dependencies: `fastify`, `zod`, `@anthropic-ai/sdk` (Apache-2.0, used only when the person enables Anthropic), Angular, `rxjs`, `tslib`. No new deps for documents (built on `node:zlib`).
- Dev-only advisories: picomatch ReDoS chain (no upstream fix); not shipped.
- Dev-only MPL-2.0: `lightningcss` (Angular build tool) and `axe-core` (a11y tests), not redistributed.

## External dependencies & blockers

- **E2E browser tests** cannot launch Chrome inside the development sandbox; they run in GitHub Actions (needs an approved push) or via `npm run test:e2e` on the owner's machine.
- **Real legacy-data migration** requires an export produced in a separate authorised session; the importer is built and tested on synthetic data only.
- **Live AI providers** need owner-supplied keys and consent; implemented against documented APIs with mocked transports.
- **Push / release** require owner approval.

## Next step

All MVP milestones (M0–M11) are implemented, and the post-milestone audit is complete (see
`docs/RELEASE_READINESS.md` for the defect backlog and verdict). Remaining work:

1. ✅ Audit commits pushed; CI green on `f8b1f2d` (run 44298999802), including the extended E2E. Verdict: GO for a 0.1.0 pre-release.
2. ✅ Tagged `v0.1.0` and published as a GitHub pre-release. Still to decide: live cloud AI testing and a separate legacy-export session.
3. Optional enhancements (P1/P2) only after 1: live posting fetch from official/permitted endpoints, PDF resume import, encrypted backups, in-app restore, per-skill experience.

If a session resumes with no new instructions: run the verification commands, then pick up item 2.

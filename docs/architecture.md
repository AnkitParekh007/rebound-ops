# Architecture

## Current Phase 2 typed MVP slice

```text
Angular standalone app (apps/web, port 4200)
   │   shell → feature components → SessionStore (signals) → SessionApiService
   │   typed reactive forms validated by the shared contracts
   │
   └── /api → localhost Fastify (apps/api, port 4174)
                ├── validated Zod request contracts
                ├── explicit workflow transitions + optimistic revisions
                ├── sessions in memory; opt-in disk saving per session
                │     └── versioned snapshots + forward-only migrations
                ├── optional AI review adapter (off by default; preview → consent;
                │     versioned prompt; never auto-applied)
                └── Markdown export

Shared: packages/contracts (Zod schemas, pure workflow logic, schema migrations)
Evaluation: evals/ai-review (fictional golden set; not shipped)
Release: preview archive with manifest hashes, CycloneDX SBOM and CI attestations
Legacy: root static prototype (preserved)
```

In development, Angular proxies `/api` requests to the Fastify service. The API binds only to 127.0.0.1. When the production Angular build is present, the API also serves the compiled site.

## Functional scope

- Enter 1–15 user-reported achievements with explicitly **unverified** sources.
- Confirm/reject claims manually; confirmation is not third-party validation.
- Compare Return / Shift / Bridge hypotheses, including missing proof and next tests.
- Paste job requirements and manually link participant-confirmed evidence; revoke support when evidence is rejected.
- Select a route and generate a time-budgeted, deterministic plan.
- Complete actions and record outcomes.
- Export Markdown with evidence status, job requirements and review details.
- User-initiated JSON backup/restore (older backups are upgraded on restore) and deletion from API memory and, for opted-in sessions, from disk.
- Optional AI review of one job target: exact payload preview, explicit per-request consent, suggestions shown but never applied.

No **automatic** AI calls, automated job-description extraction, hiring scores or automatic applications are implemented. Durable local persistence exists with a separately configured folder and explicit per-session opt-in. The optional AI adapter is disabled without explicit configuration and per-request user consent. The former static pilot remains available at the root.

## Status of earlier design steps

| Earlier step | Status |
|---|---|
| Source spans with provenance-first contracts | **Done** for pasted résumé/project-note excerpts ([evidence provenance](evidence-provenance.md)). Spans for **job-description** sources are still open. |
| Evidence-to-requirement review with explicit user validation | **Done** ([job requirements](job-requirements.md)) |
| Resumable, versioned local JSON with consent and safe migrations | **Done** ([local persistence](local-persistence.md), [schema migrations](schema-migrations.md)) |
| Live-test the optional AI adapter with fictional data | **Open**: golden-set harness ready ([AI evaluation](ai-evaluation.md)); live run waits for owner approval (roadmap B5) |
| Tests for errors, interruption, injection-like content and accessibility | **Done** in automated form (unit, API, golden-set, Playwright and axe); manual screen-reader testing is still open |

Current priorities, gaps and decision gates live in the [roadmap](roadmap.md). Component-level design is in [frontend architecture](frontend-architecture.md) and [Phase 2 details](phase-2.md).

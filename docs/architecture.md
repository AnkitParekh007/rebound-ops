# Architecture

## Current Phase 2 typed MVP slice

```text
Angular standalone app (apps/web, port 4200)
   │
   └── /api → localhost Fastify (apps/api, port 4174)
                ├── validated Zod request contracts
                ├── explicit workflow transitions
                ├── in-memory sessions + optimistic revisions
                └── Markdown export

Shared: packages/contracts (Zod schemas + pure workflow logic)
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
- User-initiated JSON backup/restore and deletion from API memory.

No **automatic** AI calls, automated job-description extraction, hiring scores, automatic applications or disk persistence are implemented. The optional AI adapter is disabled without explicit configuration and per-request user consent. The former static pilot remains available at the root.

## Next design steps

1. Add job-description sources and source spans using the same provenance-first contracts.
2. Build evidence-to-requirement review with explicit user validation.
3. Add resumable, versioned local JSON with consent and safe migrations.
4. Live-test the optional provider adapter with fictional data and evaluate output relevance; it already has mock tests and strict validation.
5. Extend tests to cover errors, interruption, injection-like document content and browser accessibility.

See [Phase 2 details](phase-2.md) and [roadmap](roadmap.md).

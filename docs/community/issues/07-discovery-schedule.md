**Difficulty:** hard · **Labels:** `enhancement`, `discover`

### Background

Discover checks one company board when the user asks. The release readiness report plans "an optional per-provider discovery schedule" for the next release. It must keep the existing guarantees: no network use without consent, HTTPS allow-listed hosts only, one request per second per host, `Retry-After` respected, and a 30-minute cache (`packages/job-sources/src/http.ts`).

### Files

- `packages/job-sources/src/` (the politeness rules must not change)
- `apps/api/src/discovery.ts` (scheduling only while the app runs; no background service when it is stopped)
- `packages/contracts/src/` (schema for the schedule settings)
- `packages/storage/src/migrations.ts` (a **new** append-only migration, if settings are stored)
- `apps/web/src/app/pages/discover.page.ts` and `settings.page.ts`
- tests in `packages/job-sources/test`, `apps/api/test` and `tests/integration`

### Acceptance criteria

- [ ] Off by default. Turning it on for a board is a separate, explicit consent, and the UI says exactly what will be requested and how often.
- [ ] The minimum interval is 24 hours per board. Scheduled checks run only while ReboundOps is running, never as an OS service.
- [ ] Scheduled requests use the same HTTP client, so the allow-list, rate limit, cache and `Retry-After` handling still apply. A test proves it.
- [ ] New postings are surfaced for review, never added to the tracker automatically.
- [ ] Revoking consent stops scheduled requests immediately (tested).
- [ ] Existing data upgrades cleanly, with a migration test.

### Verify

```bash
npm test
npm run test:smoke
npm run lint && npm run typecheck
```

The CI `e2e` job must stay green.

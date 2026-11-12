# ADR 0004 — Operations store: `node:sqlite`, one owner, an append-only ledger

**Status:** Accepted for R0 (FND-01, FND-02) on 12 November 2026. Revisit if `node:sqlite` changes incompatibly or the supported Node range drops below 22.13.

## Context

Every operations feature (Autofill answers, Auto Apply attempts, Inbox messages, contacts, interviews, strategy metrics) needs durable records that survive a restart, do not double-apply a retried request, and do not let two writers overwrite each other. The existing recovery sessions are JSON files ([local persistence](local-persistence.md)), which are written whole and cannot express per-record revisions or an event history.

The plan asked for a packaging spike: `node:sqlite` if the supported runtime matrix allows it, otherwise a maintained binding chosen through an ADR.

Evidence, checked on 12 November 2026:

- The root `engines` range is `^22.22.3 || ^24.15.0 || >=26`. `node:sqlite` is available without a flag from Node 22.13, so every supported version has it. CI runs `npm test` on Node 24 (`test-and-build`) and Node 22 (`Node 22 compatibility`).
- It needs no native module. The macOS and Windows package smoke jobs and the preview archive therefore need nothing new, unlike `better-sqlite3`, which ships prebuilt binaries per platform and Node ABI.
- It is still marked experimental and prints an `ExperimentalWarning` on first use.

## Decision

1. **Storage:** one SQLite file at `<REBOUNDOPS_DATA_DIR>/operations/operations.sqlite`, opened through `node:sqlite`. Everything that touches `node:sqlite` stays in `apps/api/src/operations/store.ts`, so a different binding is a local change.
2. **One owner:** the connection takes SQLite's `EXCLUSIVE` lock at open and keeps it (`locking_mode = EXCLUSIVE`, WAL journal). A second process gets `OperationsStoreLockedError`. The OS releases the lock if the owner crashes.
3. **Ledger:** `operation_events` is append-only. Each event has a caller-chosen UUID (idempotency), an expected revision (optimistic concurrency, a 409 at the HTTP layer), separate event and ingestion times, a source, and a JSON payload (JSON values only) capped at 64 KiB. `operation_entities` holds each record's current revision. Contracts: `OperationEventInputSchema` in `@reboundops/contracts`.
4. **Batches** (`appendEvents`) are all-or-nothing, for imports.
5. **Migrations** are forward-only, numbered with `PRAGMA user_version`, and applied in one transaction. An existing store is first copied with `VACUUM INTO` to `operations.sqlite.pre-v<N>-<timestamp>.bak`. A store with a newer schema than the code knows is refused, never downgraded. A backup is one self-contained file with no WAL. To restore: stop ReboundOps; move `operations.sqlite` together with any `operations.sqlite-wal` and `operations.sqlite-shm` into another folder, keeping the three as a set; then copy the chosen backup to `operations.sqlite`. Never leave an old `-wal` or `-shm` file beside a restored backup: SQLite would apply it to the wrong database, which can lose data or corrupt it.
6. **HTTP** (`apps/api/src/operations/routes.ts`): `GET /api/operations/status`; `POST /api/operations/events` with `{ events: [...] }` (1–100, atomic; `201` when anything was appended, `200` for a pure retry); `GET /api/operations/entities/:entityType/:entityId/events`. Errors: `400 INVALID_REQUEST` with the failing path, `404 OPERATIONS_DISABLED` while every flag is off, `409 STALE_REVISION` (with expected and current revision), `409 EVENT_ID_REUSED`, `413 EVENT_PAYLOAD_TOO_LARGE`, `503` when the store is not configured, locked or newer. These generic routes are the base for each feature's own validated routes.
7. **Legacy tracker import** (FND-03, `apps/api/src/operations/legacy-tracker.ts`): `POST /api/operations/imports/legacy-tracker` with `{ markdown, sourceLabel, dryRun }` (text up to 2 MiB). The caller sends the text of the engine's `data/applications.md`; the API never opens or changes the file, and the report records its SHA-256.
   - Columns are mapped by header name with the engine's alias table, falling back to the engine's fixed order. `apps/api/tests/legacy-tracker-parity.test.mjs` holds this reader to `engine/tracker-parse.mjs` (same aliases, fallback and rows), because the preview package does not ship `engine/`.
   - Row `#` maps to the application `legacy-<#>`. Event ids derive from the row's content and the record's revision, so importing the same file again writes nothing. A changed row adds an `application.legacy_updated` event; the earlier event stays. An imported row's event time is its Date cell; an update's is the import time.
   - Quarantined, with line and reason, and never written: rows with too few cells, an invalid date, no company or role, a `#` used twice, or a `#` that was imported before with a different company or role. Each import that writes anything also writes a `legacy_import.recorded` audit event, holding up to 500 quarantined rows and their total.
8. **Files** are owner-only (`0600`, directory `0700`) where the OS supports it. There is no encryption at rest, consistent with roadmap gap S3.

## Consequences

**Benefits:** durable, crash-safe, idempotent writes with no new native dependency and no change to the preview package.

**Costs and limits:**
- The API depends on an experimental Node module.
- The store is not safe on network or shared filesystems.
- Nothing is persisted unless `REBOUNDOPS_DATA_DIR` is set; the existing memory-only recovery mode is unchanged.
- No feature writes to the store yet. The API opens it lazily, on the first `/api/operations/*` request, and only when `REBOUNDOPS_DATA_DIR` is set and at least one operations flag is on; a default install never loads `node:sqlite` or creates the file. A second API on the same data directory gets `503 OPERATIONS_STORE_LOCKED`.
- The store tests run on Linux CI only (Node 22 and 24); the macOS and Windows jobs do not run them.

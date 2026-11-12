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
3. **Ledger:** `operation_events` is append-only. Each event has a caller-chosen UUID (idempotency), an expected revision (optimistic concurrency, a 409 at the HTTP layer), separate event and ingestion times, a source, and a JSON payload capped at 64 KiB. `operation_entities` holds each record's current revision. Contracts: `OperationEventInputSchema` in `@reboundops/contracts`.
4. **Batches** (`appendEvents`) are all-or-nothing, for imports.
5. **Migrations** are forward-only, numbered with `PRAGMA user_version`, and applied in one transaction. An existing store is first copied with `VACUUM INTO` to `operations.sqlite.pre-v<N>-<timestamp>.bak`. A store with a newer schema than the code knows is refused, never downgraded. To restore: stop ReboundOps, then replace `operations.sqlite` with the chosen backup.
6. **Files** are owner-only (`0600`, directory `0700`) where the OS supports it. There is no encryption at rest, consistent with roadmap gap S3.

## Consequences

**Benefits:** durable, crash-safe, idempotent writes with no new native dependency and no change to the preview package.

**Costs and limits:**
- The API depends on an experimental Node module.
- The store is not safe on network or shared filesystems.
- Nothing is persisted unless `REBOUNDOPS_DATA_DIR` is set; the existing memory-only recovery mode is unchanged.
- The store is not yet wired into the API process or any feature.
- The store tests run on Linux CI only (Node 22 and 24); the macOS and Windows jobs do not run them.

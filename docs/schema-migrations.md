# Session schema versioning and migrations

**Status:** framework implemented (roadmap gap D1 / item B1). The current schema is **v1** and the migration chain is empty: no v2 exists yet.

## Why

Participants keep sessions in two places: opt-in saved files (`REBOUNDOPS_DATA_DIR`) and downloaded JSON backups. Without migrations, the first release that changes the `Session` shape would make both unreadable. The rule is simple: **an upgrade must never lose a participant's work.**

## How it works

```text
disk file / JSON backup
   │  (envelope checked: formatVersion 1 for disk; { session } for restore)
   ▼
migrateSession(raw)                     packages/contracts/src/migrations.ts
   ├─ read schemaVersion (integer ≥ 1)
   ├─ newer than this build?  → refuse (NEWER_VERSION); file untouched
   ├─ older than supported?   → refuse (UNSUPPORTED_VERSION); file untouched
   ├─ apply vN→vN+1 steps in order on a deep copy (input never mutated)
   └─ validateRestoredSession()  ← full provenance, link and budget checks
   ▼
current Session
```

| Boundary | Behaviour |
|---|---|
| **Saved file load** (API start) | Upgraded in memory only. Reading never writes. Files that can't be migrated are skipped with a warning and left byte-for-byte unchanged. `GET /api/persistence/status` reports `migratedSessions`. |
| **First write after an upgrade** | Before overwriting, the original file's exact bytes are copied to `<id>.schema-v<N>.backup` (private mode `0600`, exclusive create, never overwritten). The loader ignores these files. |
| **Explicit delete / turning saving off** | Removes the session file *and* its pre-upgrade backups, keeping the promise that deletion removes saved data. |
| **JSON backup restore** | Upgraded in memory into a new memory-only session; the user's file is never modified. A backup from a newer build returns `400 BACKUP_FROM_NEWER_VERSION` with an upgrade message. |
| **Health** | `GET /api/health` reports `schemaVersion` and `minSupportedSchemaVersion`. |

Errors carry stable codes (`NOT_AN_OBJECT`, `MISSING_VERSION`, `NEWER_VERSION`, `UNSUPPORTED_VERSION`, `MIGRATION_FAILED`, `INVALID_SNAPSHOT`) and never echo snapshot content.

## Adding a schema change (playbook)

Every PR that changes the persisted `Session` shape must:

1. **Freeze the old version first.** Confirm that `packages/contracts/tests/fixtures/session-v<N>.json` exists and is fully populated (documents, citation spans, corrections, job targets, plan, notes). **Never edit a committed fixture.**
2. **Bump** `CURRENT_SESSION_SCHEMA_VERSION` in `schema.ts` and change the schema.
3. **Append** `{ from: N, to: N+1, description, migrate }` to `SESSION_MIGRATIONS`. A migration:
   - works on plain JSON and **never imports the current Zod schemas** (they will change again);
   - is pure and deterministic (no clock, randomness or I/O);
   - **never drops user-authored text**; a retired field's content moves into a surviving field;
   - sets `schemaVersion: N+1`.
4. **Add** a new frozen fixture `session-v<N+1>.json` generated with the new code.
5. **Run** `npm test`. The contract tests fail if the chain has a gap, if any supported version lacks a fixture, or if any fixture does not load under the current schema.
6. **Release note:** say that saved sessions upgrade automatically, that originals are kept as `.backup` files, and that older builds cannot open upgraded files.

Raise `MIN_SUPPORTED_SESSION_SCHEMA_VERSION` (dropping old versions) only through an explicit owner decision recorded in the changelog.

## Limitations

- Upgrades are forward-only. Downgrading the app cannot read files written by a newer schema; the pre-upgrade `.backup` file is the way back.
- The disk envelope (`formatVersion`) is separate from the session schema and is still v1; changing it needs its own migration.
- Migrations run in a single localhost process with no cross-process locking (same assumption as [local persistence](local-persistence.md)).
- Pre-upgrade backups are plain JSON and **not encrypted**, like the saved files themselves.

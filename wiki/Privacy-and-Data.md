# Privacy, storage and data portability

[← Wiki home](Home) · [Security](https://github.com/AnkitParekh007/rebound-ops/security/policy)

ReboundOps is **local-first**, not a hosted career data service. The Angular recovery UI talks to a Fastify API bound to **127.0.0.1**, not a public endpoint.

## What is saved?

- Recovery sessions start **memory-only** by default.
- With a configured private `REBOUNDOPS_DATA_DIR` and explicit per-session opt-in, recovery snapshots can be written to local disk.
- Workspace CV files, pipeline records, reports and provider settings are handled by separate local workspace tools.
- JSON backups and downloaded reports are **plain files, not encrypted by ReboundOps**.
- The combined career backup may include recovery/session and selected workspace data; restore shows a preview and explicit file-replacement choices.
- The two interfaces do **not** automatically synchronize every record.

## What may leave your computer?

Installing dependencies and browser binaries requires network access; scans of public sources access external sites. Optional external AI sends reviewed data only following its configured consent flow. Do not describe the entire product as offline-only.

## Protect your information

1. Store backups outside public repositories and synced/shared folders unless you understand the exposure.
2. Use operating-system disk encryption and access controls.
3. Redact sensitive employer details before filing public issues or discussions.
4. Never expose the localhost API to the internet; it does **not** provide user authentication.
5. Download a backup before upgrading. Deleting a session does not delete earlier exported files.

**Authoritative docs:** [Privacy model](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/privacy.md) · [Local persistence](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/local-persistence.md) · [Security policy](https://github.com/AnkitParekh007/rebound-ops/blob/main/SECURITY.md).

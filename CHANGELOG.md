# Changelog

## Unreleased — Phase 2 typed MVP

### Added
- Angular guided career-recovery application and Fastify localhost API.
- Zod intake, evidence, route, requirement and plan contracts.
- Provenance labels and explicit participant confirmation.
- Exact source passages anchored to user-pasted document IDs and character ranges, with manual corrections and revocation of obsolete requirement links.
- Manual requirement-to-evidence review with automatic invalidation if evidence is downgraded.
- Time-budgeted seven-day plan, check-ins, Markdown export.
- Memory-only session API with optimistic updates, explicit private JSON backups, restore and delete.
- Optional durable local sessions requiring a private folder and explicit per-session consent, with atomic file writes and recovery warnings.
- Optional Anthropic AI review behind a disabled-by-default gate; exact JSON preview, explicit consent and schema-checked, non-applied suggestions.
- Unit, API integration, Playwright journey and axe accessibility checks.
- Privacy, security, contributing and release-gate documentation.

### Preserved
- Original zero-dependency browser pilot remains at repository root.

### Known limitations
- No automatic storage or login; no verified job openings or remuneration data.
- Provider integration has mock tests but no recorded live paid API verification.
- Participant validation findings have not been published.

# Changelog

## Unreleased — Phase 2 typed MVP

### Added
- AI quality evaluation: 20-case fictional golden set with fairness pairs, harness and runner (`npm run eval:ai`, owner-approved `eval:ai:live`) scoring over-claims, fabricated evidence, injection, support recall and fairness parity against proposed G2 thresholds; versioned, fingerprint-pinned prompt reported with every analysis.
- CI supply-chain hardening: SHA-pinned GitHub Actions with least-privilege permissions, Dependabot for npm and Actions, CodeQL (`security-extended`) for TypeScript and workflows, and a Node 22 compatibility job.
- Angular frontend decomposed into a shell, eight feature components, a signal-based `SessionStore` and a typed `SessionApiService`, with no user-visible behaviour change ([guide](docs/frontend-architecture.md)).
- Session schema migration framework: versioned forward-only migration chain, upgrade of saved files and JSON backups on load, byte-exact pre-upgrade `.backup` files, refusal of newer-version snapshots, and a frozen v1 fixture that every future version must load ([guide](docs/schema-migrations.md)).
- Angular guided career-recovery application and Fastify localhost API.
- Zod intake, evidence, route, requirement and plan contracts.
- Provenance labels and explicit participant confirmation.
- Exact source passages anchored to user-pasted document IDs and character ranges, with manual corrections and revocation of obsolete requirement links.
- Manual requirement-to-evidence review with automatic invalidation if evidence is downgraded.
- Time-budgeted seven-day plan, check-ins, Markdown export.
- Memory-only session API with optimistic updates, explicit private JSON backups, restore and delete.
- Optional durable local sessions requiring a private folder and explicit per-session consent, with atomic file writes and recovery warnings.
- Optional Anthropic AI review behind a disabled-by-default gate; exact JSON preview, explicit consent and schema-checked, non-applied suggestions.
- Adversarial mock-provider tests and sanitized usage counters without recording prompts or sensitive output.
- Unit, API integration, Playwright journey and axe accessibility checks.
- Privacy, security, contributing and release-gate documentation.
- Facilitated pilot guide, blank evaluation scorecard, proposed public-preview script and responsive/keyboard browser checks.
- Voluntary, browser-memory-only private pilot feedback panel with consent-controlled Markdown download and no automatic telemetry.
- Cross-browser CI (Chromium/Firefox/WebKit), defense-in-depth localhost requests, fail-closed local snapshot updates and release hygiene auditing.
- Unpublished preview archive builder, per-file integrity manifest and SHA-256 sidecar, clean extracted runtime smoke test and Windows/macOS build verification; owner publication approval remains a separate gate.

### Preserved
- Original zero-dependency browser pilot remains at repository root.

### Known limitations
- No automatic storage or login; no verified job openings or remuneration data.
- Provider integration has mock tests but no recorded live paid API verification.
- Participant validation findings have not been published.

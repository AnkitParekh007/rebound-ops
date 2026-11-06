# Changelog

## Unreleased — Phase 2 typed MVP

### Added
- Plain-language option names: Return / Shift / Bridge are now shown as "Similar work to before", "A new kind of work" and "A stepping-stone role" in the options step, the Markdown export, the guided questions and the pilot feedback question, with plainer card wording. Stored route IDs and labels are unchanged, so existing sessions and backups load as before.
- One-command local start: `npm run dev` builds the contracts and runs the API and the Angular UI together (via `concurrently`, a development-only dependency), with prefixed logs and one Ctrl+C to stop both.
- Guided first visit, now the default first screen: a short welcome, then one empathetic question at a time that branches on the user's situation (recently lost a job, changing careers, returning after a break, a better job in the same field, something else), ending with a "Here's what I heard" summary where any answer can be changed before anything is saved. Scripted in advance with no AI; answers stay in memory until confirmed. The full form is one click away ([guide](docs/onboarding.md)). Draft wording for pilot testing.
- Step-by-step wizard UI: one step at a time with a numbered step list, plain-language step names, done/optional/locked states with reasons, Back/Continue buttons, URL-hash navigation (browser Back works), focus moved to each step heading, and a collapsible step list on phones. Unsaved drafts are kept when moving between steps.
- Dependabot ignore rules for TypeScript major/minor updates (Angular compiler compatibility) and `@types/node` major updates (oldest supported Node runtime), so update PRs that cannot pass are no longer opened.
- Documentation brought in line with the code (B0): `architecture.md` status table and updated diagram, `phase-2.md` endpoints/persistence/AI/testing corrected, release checklist and README gates updated; future work now lives only in the roadmap.
- Supply-chain evidence for the preview candidate: deterministic CycloneDX 1.5 SBOM of the production dependency graph (inside the archive and as a sidecar), plus signed SLSA build-provenance and SBOM attestations on `main` CI builds, verifiable with `gh attestation verify`. Root and workspace manifests now declare the MIT licence.
- Frontend unit tests (Angular unit-test builder with Vitest/jsdom, run by `npm test`) for the session store, error mapping, contract validators and forms; all forms converted to typed reactive forms validated by the shared Zod contracts, with accessible inline errors and bundle budgets.
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

### Fixed
- The intake form no longer starts filled with fictional data, which could be submitted by accident or overwrite real answers later; the example loads only on request, and the form reloads from the active session.
- Status messages are announced reliably by screen readers, and animations are removed when the user asks for reduced motion.

### Preserved
- Original zero-dependency browser pilot remains at repository root.

### Known limitations
- No automatic storage or login; no verified job openings or remuneration data.
- Provider integration has mock tests but no recorded live paid API verification.
- Participant validation findings have not been published.

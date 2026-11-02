# ADR 0001 — Local-first, provenance-first MVP

**Status:** Accepted for the Phase 2 pilot (revisit after evaluation)

## Context

Career recovery involves personal history, employment gaps, private notes and sometimes confidential employer information. The first success criterion is a *completed concrete action*, not automatic applications or a hosted social network.

## Decision

1. Build a locally runnable Angular browser UI with a Fastify API restricted to loopback.
2. Start with in-memory sessions and user-triggered JSON backup rather than hosted accounts.
3. Use shared typed Zod contracts and user confirmation for evidence, requirements, decisions and plans.
4. Treat job descriptions as manually supplied untrusted data.
5. Keep optional AI provider calls disabled by default. Require a local API key, exact outgoing JSON preview, digest and explicit per-request consent.
6. Never auto-apply model suggestions or invent fit scores.

## Consequences

**Benefits:** fast iteration, fewer privacy dependencies, inspectable output, easy source traceability, manageable token costs.

**Costs:** no automatic cross-device sync, lost data without a backup, no employer/job ingestion at scale, and manual review effort.

**Follow-up decisions:** whether participants need opt-in durable local files, what data may go to a provider, and whether hosted collaboration is justified by evidence from the pilot.

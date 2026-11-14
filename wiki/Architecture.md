# Architecture and engineering

[← Wiki home](Home) · [Contributing](Contributing)

## System overview

```text
                     ReboundOps (local developer preview)
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
       Integrated workspace             Angular recovery UI
       (Node.js + browser)              (apps/web)
                 │                           │
      Engine/config/files           Typed forms + SessionStore
                 │                           │
                 └──── handoff / local API ──┤
                                             │
                                  Fastify localhost API
                                       (apps/api)
                                             │
                         shared Zod contracts / workflows
                                (packages/contracts)
                                             │
                          memory-only by default; opt-in
                          versioned local session snapshots
```

This is a **conceptual view**, not a claim that every workspace record is automatically synchronized into the recovery app. The integrated launcher starts multiple local services. The full Angular recovery UI exposes capabilities that the narrower integrated bridge may not.

## Boundaries

- **UI:** Angular standalone application, reactive forms and Signals-based state.
- **API:** Fastify, local origin/Host checks, validated requests and explicit transitions.
- **Contracts:** Shared Zod schemas, domain validation and migration logic.
- **Persistence:** Memory-only by default; opt-in local snapshots, backups and version upgrades.
- **AI:** Optional review adapter requiring preview and consent.
- **Quality:** Unit, API, Playwright and accessibility checks; manual release acceptance still matters.

## Threat model

The API has **no user authentication** and must remain bound to localhost; origin checks are not a substitute for authentication. Inputs including job descriptions and model text are untrusted. External write operations and career claims require human review. Avoid claiming independent security certification or production compliance.

## Developer reference

- [Architecture source](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/architecture.md)
- [Frontend design](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/frontend-architecture.md)
- [Monorepo boundaries](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/monorepo-surface.md)
- [Data provenance](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/evidence-provenance.md)
- [Schema migrations](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/schema-migrations.md)
- [Architecture decisions](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/adr-0001-local-first.md)

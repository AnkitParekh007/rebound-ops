# Monorepo surface plan (workspace + engine)

## Why this note exists

The recovery MVP (`apps/`, `packages/`) is relatively small. `workspace/` and `engine/` are large job-search components (hundreds of tests and many CLI scripts). That size raises maintenance cost and increases the chance that marketing or docs overstate a single coherent “product.”

## Near-term policy (no mass deletion)

1. Treat **recovery app** as the primary workflow to evaluate in pilots.
2. Treat **workspace/engine** as optional local job-search tooling launched via `npm start`.
3. Do not sync recovery sessions into `engine/` without an explicit consent UI (roadmap deferred item).
4. Keep provenance/license checks green; do not invent participant outcome claims.

## Candidate reductions (owner decision required)

| Candidate | Benefit | Risk |
| --- | --- | --- |
| Stop shipping unused engine plugin directories in preview archives | Smaller artifacts | Breaks operators who rely on those plugins |
| Quarantine `engine/web` / dashboard extras behind docs | Clearer MVP boundary | Contributor confusion if paths move |
| Freeze engine feature work until G1 | Protects validation focus | Delays job-search polish |
| Extract workspace into a separate repo later | Cleaner product boundary | Split release/process cost |

## Decision trigger

Revisit after G3 (pilot value). If participants never use workspace tools, prefer documentation demotion over a risky delete. If they do, invest in the recovery↔workspace handoff rather than more engine surface.

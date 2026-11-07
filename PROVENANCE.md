# ReboundOps: authorship and component ledger

ReboundOps is an evidence-led career-recovery product maintained in this monorepo. The recovery application (`apps/`, `packages/`), job-search workspace (`workspace/`), engine (`engine/`) and marketing site (`marketing-website/`) are distributed together under MIT. Maintainer credit identifies responsibility for this repository.

| Component | Role | ReboundOps work |
| --- | --- | --- |
| `apps/`, `packages/`, root prototype | Recovery implementation | Intake, evidence provenance and corrections, requirement review, explicit direction choices, bounded weekly plans, local data controls and optional consent-led AI review |
| `workspace/` | Job-search workspace UI | Recovery-first onboarding, journey navigation, search workbench, recovery bridge and integration checks |
| `engine/` | Job-search data folder and CLI | Scanning, evaluation and document-generation tooling integrated with the workspace |
| `marketing-website/` | Public marketing site | Recovery-focused copy, shared themes, pages, screenshot generation and GitHub Pages publishing |

We do not claim participant outcomes, testimonials or adoption metrics that have not been documented under the [pilot runbook](docs/external-pilot-runbook.md). Engineering checks and fictional demonstrations are not user validation.

## Source records

Machine-readable component metadata lives in [`provenance.json`](provenance.json). Run `node scripts/check-provenance.mjs` to verify the ledger, required notice files and the workspace package allowlist.

## Distribution requirements

Preserve [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), `engine/LICENSE`, `workspace/LICENSE` and `workspace/THIRD_PARTY_NOTICES.md`. Standalone workspace packages must ship the workspace notice files directly. Dependency license inventory and npm advisory review are documented in [dependency security review](docs/dependency-security-review.md).

## Product identity

ReboundOps commitments are in [docs/principles.md](docs/principles.md). The distinct experience centres on a person’s constraints, reviewed evidence, explicit direction hypotheses and a manageable next action. Advanced job-search tools remain available as local integrations. Feature descriptions are maintained deliberately; commit messages do not automatically become product claims.

## Public website vs local product

[rebound-ops.org](https://rebound-ops.org) hosts the static marketing site only. The recovery API and workspace run on localhost and are not a hosted multi-user service.

# ReboundOps: authorship and open-source foundations

ReboundOps is an evidence-led career-recovery product that integrates modified, MIT-licensed job-search tools. It is not an independently implemented copy of every underlying tool, and the upstream authors do not endorse or maintain ReboundOps.

| Component | Origin and authorship | ReboundOps work |
| --- | --- | --- |
| `apps/`, `packages/`, root prototype | ReboundOps recovery implementation | Intake, evidence provenance and corrections, requirement review, explicit direction choices, bounded weekly plans, local data controls and optional consent-led AI review |
| `workspace/` | Derived from [rebound-ops](https://github.com/AnkitParekh007/rebound-ops), Ankit Parekh  and contributors, MIT | Recovery-first onboarding, journey navigation, next-step presentation, recovery bridge, search workbench, contextual tool guidance and integration checks |
| `engine/` | Derived from [rebound-ops](https://github.com/rebound-ops-hq/rebound-ops), Ankit Parekh and contributors, MIT | Monorepo integration and maintenance of the adapted engine; the original scanning, evaluation and document-generation foundations remain upstream-derived |
| `marketing-website/` | ReboundOps marketing implementation | Recovery-focused copy and curved-path hero, shared themes, pages, screenshot generation and commit-triggered publishing; menu labels/order were requested with cvstart.org as a reference |

Maintainer credit identifies responsibility for this repository; it does not replace the original authors’ copyrights. We do not claim upstream founder outcomes, testimonials, signatures, community size or manifesto origin as ReboundOps results. Engineering checks and fictional demonstrations are not participant validation.

## Source records

The components entered this repository in [import commit 62d2079](https://github.com/AnkitParekh007/rebound-ops/commit/62d207957a5000e58ba2dc0a3fd18ca339e98c09). The precise upstream import revisions were not recorded in that commit; we do not invent them. `provenance.json` records that uncertainty and separately identifies the snapshots used for the later source comparison.

The unused upstream-derived Astro landing site formerly at `workspace/site/` has been removed from the active tree. Its historical version remains available in Git history at the import commit. `marketing-website/` is the sole maintained public marketing site, deployed through GitHub Pages.

## Distribution requirements

Preserve [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), `engine/LICENSE`, `workspace/LICENSE` and `workspace/THIRD_PARTY_NOTICES.md`. The workspace’s public legal file also carries both original notices. Standalone workspace packages must contain the applicable UI notice directly; a reference to a missing parent file is insufficient.

Run `node scripts/check-provenance.mjs` to check origin claims, required notices, the package allowlist and source records. Every release format still needs its own artifact review. Do not delete attribution to make the product appear independently authored.

## Product identity

ReboundOps’ own commitments are in [docs/principles.md](docs/principles.md). Our distinct experience centers on a person’s constraints, reviewed evidence, explicit direction hypotheses and a manageable next action. Advanced job-search tools remain available as credited integrations. Feature descriptions are maintained deliberately; commit messages do not automatically become product claims.

## Presentation update — 8 November 2026

At the owner's request, promotional upstream mentions, the app credits view, the website credits page and the credits footer links have been removed. The earlier remediation record describes the historical presentation. Component origins, original copyrights and complete applicable MIT notices remain in the repository and distributed workspace files. This presentation change does not replace the inherited implementation or change its authorship.

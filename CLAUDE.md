# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## Git workflow (owner preference)

### How `main` is protected

`main` has an active GitHub ruleset ("Protect main — PRs and required checks") with no bypass actors. Direct pushes to `main` are rejected, so **every change reaches `main` through a pull request**. The ruleset requires:

- squash merges only, linear history and signed commits;
- every review thread resolved, and the branch up to date with `main`;
- these checks passing: `test-and-build`, `Node 22 compatibility`, `Platform package smoke (macos-latest)`, `Platform package smoke (windows-latest)`, `Capture current app and build marketing site`, `Analyze (javascript-typescript)` and `Analyze (actions)`, plus CodeQL code-scanning and code-quality gates.

Never force-push `main` or rewrite its history.

### Operations features (Track C in the roadmap)

Work on the seven operations features (owner decision, 12 Nov 2026; see [ADR 0003](docs/adr-0003-operations-features.md)):

- There are no long-lived feature bases. Each coherent work package branches from `origin/main`, named for its feature: `feature/00-foundation-<topic>` for shared work, then `feature/01-auto-apply-<topic>`, `feature/02-autofill-<topic>`, `feature/03-eligibility-<topic>`, `feature/04-recruiter-inbox-<topic>`, `feature/05-referrals-<topic>`, `feature/06-interview-coach-<topic>` or `feature/07-strategy-advisor-<topic>`. This is how every work package since #25 was delivered. `feature/00-foundation` (deleted 12 Nov 2026) and `feature/03-eligibility-quality` (deleted 14 Nov 2026) are retired; the older `feature/01-auto-apply`, `feature/02-autofill` and `feature/04-…`–`feature/07-…` branches predate this, so do not base new work on them.
- Bring a branch up to date by merging its base into it, not by rebasing; never force-push a branch someone else may have pulled without asking the owner.
- Each coherent work package is its own pull request, with its feature flags off by default. A work package can be stacked on another (its PR targets that branch instead of `main`). Delete a branch only once its PR is merged and no open PR targets it.
- A squash merge into `main` rewrites the merged branch's commits, so the next PR in a stack then conflicts with `main`. Fix it by merging `main` into that next branch, and keep the branch side only after confirming `main`'s tree equals the squashed branch.
- Keep a merged head branch while another open PR is stacked on it, so GitHub does not retarget that PR. Once its base is squash-merged into `main`, change that PR's base to `main` before merging it, then confirm `origin/main` contains the change. The simpler order is to merge a stack top-down into its feature bases with merge commits, then squash the bottom PR into `main` once.

### Everything else

1. Run `git fetch origin`, then branch from `origin/main`, using the session's designated `claude/*` branch.
2. Run the relevant local checks below, push the branch and open a pull request that is ready for review (CodeRabbit skips drafts).
3. Run `git fetch origin`. If `origin/main` has moved, merge it into the branch and rerun the checks. If that conflicts, stop and ask the owner instead of resolving anything that could discard work.
4. After the PR is squash-merged, run `git fetch origin` and confirm that `origin/main` contains the change.

Run the relevant local checks before every push:

- `npm test` (contracts, API, legacy pilot, AI-eval harness and web unit tests) for any code or contract change
- `npm run build:web` for frontend changes
- `npm run test:e2e` for UI/workflow changes (Chromium is preinstalled in cloud sessions)
- `npm run audit:release` before pushing anything that adds files

## Project rules

- Read [docs/roadmap.md](docs/roadmap.md) for current status, gaps (IDs such as D1, F1, A1) and decision gates G1–G4.
- Only `docs/roadmap.md` lists future work; other docs describe what exists today. When you finish roadmap work, update the docs it makes stale in the same commit.
- Never fabricate user-research, pilot or outcome metrics. Only engineering facts verifiable in the repo may be marked done.
- Any change to the persisted `Session` shape must follow [docs/schema-migrations.md](docs/schema-migrations.md) (version bump, migration, new frozen fixture). Never edit a committed fixture.
- Frontend: components never call `HttpClient`; go through `SessionStore` intents. Use typed reactive forms validated with `contractValidator` (no `ngModel`). Keep session-scoped UI state in feature components and private pilot answers out of the store (see [docs/frontend-architecture.md](docs/frontend-architecture.md)).
- Preview archive: keep `sbom.cdx.json` in the package and any new shipped file inside the allowlist in `scripts/package-preview.mjs`.
- CI: pin every new GitHub Action to a full commit SHA with a `# vX.Y.Z` comment, and keep workflow `permissions` least-privilege.
- Never commit real participant data, résumés, API keys or session files.
- AI prompt: any edit to `apps/api/src/prompt.ts` text needs a version bump, a new pinned fingerprint and a golden-set run; never commit `evals/ai-review/results/` or put real data in the golden set.
- AI stays disabled by default; never weaken the payload preview, consent or non-auto-apply guarantees.

## graphify

This project can have a local knowledge graph at graphify-out/ (git-ignored, built with `/graphify .`) with god nodes, community structure, and cross-file relationships. It needs the `graphify` CLI on `PATH` (`uv tool install graphifyy`, then `graphify install` to register the `/graphify` skill); the hooks in `.claude/settings.json` do nothing when it is missing.

Rules:
- When graphify-out/graph.json does not exist or `graphify` is not on `PATH`, search and read source files normally.
- When graphify-out/graph.json exists and `graphify` is on `PATH`, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only where the graph, a search, or an earlier read already located something; reading the surrounding range (for example a located function's body) or the rest of that file is fine. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, if graphify-out/graph.json exists and `graphify` is on `PATH`, run `graphify update .` to keep the graph current (AST-only, no API cost). Otherwise skip it.
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

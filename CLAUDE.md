# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## Git workflow (owner preference)

The repository owner wants every commit made in a Claude session to land on `main`.

1. Before pushing, run `git fetch origin main`.
2. Push to `main` only as a **fast-forward** (`git push origin HEAD:main`). **Never force-push** `main` or rewrite its history.
3. If `origin/main` has moved, rebase the session's commits onto it and rerun the checks. If the rebase conflicts, stop and ask the owner instead of resolving anything that could discard work.
4. Also push the same commits to the session's designated `claude/*` branch as a backup.
5. After pushing, confirm that `origin/main` contains the new commit.

Pushing straight to `main` skips pull-request review, so run the relevant local checks before every push:

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

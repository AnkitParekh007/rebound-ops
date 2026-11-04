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

- `npm test` (contracts, API and legacy pilot) for any code or contract change
- `npm run build:web` for frontend changes
- `npm run test:e2e` for UI/workflow changes (Chromium is preinstalled in cloud sessions)
- `npm run audit:release` before pushing anything that adds files

## Project rules

- Read [docs/roadmap.md](docs/roadmap.md) for current status, gaps (IDs such as D1, F1, A1) and decision gates G1–G4.
- Never fabricate user-research, pilot or outcome metrics. Only engineering facts verifiable in the repo may be marked done.
- Never commit real participant data, résumés, API keys or session files.
- AI stays disabled by default; never weaken the payload preview, consent or non-auto-apply guarantees.

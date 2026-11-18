**Difficulty:** medium · **Labels:** `ci`, `platform`, `help wanted`

### Background

CI runs only on `ubuntu-24.04`. Windows is untested and Intel macOS is not separately tested (`docs/INSTALL.md`). A cross-platform job that does not block merges would catch platform bugs early.

### Files

- `.github/workflows/ci.yml`: **add** a new job. Do not change the `verify` or `e2e` jobs, which are the required checks.

### Acceptance criteria

- [ ] A new job (for example `cross-platform`) uses a matrix of `windows-2025` and `macos-15` with Node 24, and runs `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:smoke`.
- [ ] Runner images are pinned (no `-latest`), like the existing `ubuntu-24.04` pin.
- [ ] Workflow permissions stay `contents: read`, and no new third-party actions are added.
- [ ] Platform-specific test failures are fixed, or skipped with a reason that links an issue.
- [ ] The job is **not** made a required check yet. That is a follow-up, once it has been green for a few weeks.
- [ ] `docs/INSTALL.md` says which platforms CI covers.

### Verify

- CI on the PR shows the new job and both existing jobs green.
- Note the total CI minutes before and after in the PR.

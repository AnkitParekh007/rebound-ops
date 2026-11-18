**Difficulty:** easy (needs a Windows 11 machine) · **Labels:** `platform`, `testing`, `help wanted`

### Background

`docs/INSTALL.md` lists Windows 11 as **not tested**: "Node-only, so it may work; file-permission hardening (0600/0700) is best effort on Windows." Nobody has run ReboundOps on Windows yet.

### What to do

On Windows 11 with Node.js 24 or newer, from a fresh clone:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run test:smoke
npm run build
npm start
```

Then walk through onboarding, job intake, assessment, document export (PDF and DOCX), and backup and restore in the browser. Use **fictional data only**, for example `tests/fixtures/resumes/jordan-fictional.txt`.

### Files (only if you fix something)

- `docs/INSTALL.md` (platform support table)
- `packages/storage/src/` (data folder, lock and permissions)
- `scripts/` (anything that assumes POSIX tools)

### Acceptance criteria

- [ ] A comment on this issue gives the Windows build, `node --version`, the result of each command, and what worked in the browser.
- [ ] Each failure gets its own issue, or a fix PR with a test.
- [ ] `docs/INSTALL.md` is updated to reflect what was verified, and only that.

### Verify

The report is the deliverable. Fix PRs must pass CI (`verify` and `e2e`).

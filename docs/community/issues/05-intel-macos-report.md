**Difficulty:** easy (needs an Intel Mac) · **Labels:** `platform`, `testing`, `good first issue`, `help wanted`

### Background

`docs/INSTALL.md` says: "macOS on Intel — Expected to work (no native code is required); not separately tested."

### What to do

On an Intel Mac with Node.js 24 or newer, from a fresh clone:

```bash
npm ci
npm test
npm run test:smoke
npm run build
npm run test:exports
npm run package:release
npm run verify:release
```

`verify:release` installs the release archive fresh and checks the upgrade from the real v0.1.0, so it needs the git tags. A full clone has them. `package:release` needs a clean working tree.

### Files

- `docs/INSTALL.md` (platform support table)

### Acceptance criteria

- [ ] A comment gives the macOS version, the CPU, `node --version`, and the result of each command.
- [ ] A PR updates the platform table in `docs/INSTALL.md` to reflect what was verified.

### Verify

The report is the deliverable. Documentation PRs must pass CI.

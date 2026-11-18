**Difficulty:** easy · **Labels:** `dependencies`, `security`, `good first issue`

### Background

`scripts/audit-accepted.json` records one reviewed and accepted dev-tooling advisory: picomatch [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) (ReDoS). It is reached only through build and test tooling, and it is not in the shipped app. At review time (2026-11-18), "The advisory range covers every published version, so no upgrade fixes it yet."

### What to do

Once a fixed picomatch version is published and the tools that depend on it allow it, update to it and remove the accepted entry. Until then, re-check from time to time and update the `reviewed` date.

### Files

- `package-lock.json` (update through the dependent tools, or with an `overrides` entry if needed)
- `scripts/audit-accepted.json` (remove the entry)

### Acceptance criteria

- [ ] `npm audit` no longer reports GHSA-fc5q-39xc-vjpf.
- [ ] The accepted entry is removed, so the strict audit would catch a regression.
- [ ] No dependency changes beyond what the fix needs.

### Verify

```bash
npm ci
npm run build
REBOUND_AUDIT_STRICT=1 npm run audit:release
npm test
```

# Dependency security, license inventory and locked installs

**Milestone:** [Issue #17](https://github.com/AnkitParekh007/rebound-ops/issues/17). Engineering hygiene only; not a certificate of legal compliance or production security.

## Reproducible workspace installation

- A root `package-lock.json` (npm lockfile format 3) now records the resolved Angular, Fastify, TypeScript, contracts and browser-test dependency graph with package integrity hashes.
- The lock was generated on a GitHub-hosted Node 24 runner with `npm install --package-lock-only --ignore-scripts`. It was committed to the feature branch. The temporary write-enabled generator workflow was **removed**.
- `npm ci --no-audit --no-fund` is required in CI. A mismatch between package.json and package-lock.json now fails installation instead of re-resolving dependencies.
- Contributors should run `npm ci` on supported Node/npm; when intentionally updating dependencies, run `npm install` and review **both** manifest and lockfile diffs.
- Exact dependency graph is pinned, but native platform optional packages still differ by operating system; network trust and runtime environmental behavior are not guaranteed by the lock alone.

## Advisory review and remediation

The initial locked graph had **one high** and **two moderate** production npm advisories, all attributed to **@fastify/static** `^8.0.0`.

The high-severity path normalization/route-guard issue is [GHSA-83w8-p2f5-377r](https://github.com/advisories/GHSA-83w8-p2f5-377r), patched in 10.1.1. Other path-handling advisories affected older static-plugin releases; updated upstream versions incorporate fixes.

**Remediation:** Changed the direct dependency to `@fastify/static ^10.1.8` and regenerated the workspace lock. The upstream plugin declares Fastify 5 compatibility for v8 and newer. CI queries the **current** npm advisory registry using `npm audit --omit=dev --json` and `npm audit --json`. The review script refuses missing/invalid advisory results and **fails the release gate on high or critical production advisories**. Moderate/low and dev-only findings are reported and still need human triage.

**Post-upgrade audit result (3 November 2026):** zero critical and zero high findings, but **three moderate npm advisory entries remain**, reported under `@fastify/static`, `glob` and `minimatch` (the dependency chain, not three independent user-facing features). The lock currently pins `@fastify/static 10.1.8` → `glob 13.0.6` → `minimatch 10.2.6`. The newer [minimatch advisory GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) concerns computational amplification with attacker-controlled glob patterns and is fixed only in minimatch 11.0.1+. The currently installed glob 13 declares `minimatch ^10.2.2`, so blindly overriding it across a major version could break consumers. ReboundOps does not intentionally accept user-supplied glob patterns, and the API is localhost-only; nonetheless these are **unresolved moderate findings**, not a clean-audit claim. Track upstream compatible updates before any public deployment, and do not suppress the audit results.

This is a point-in-time review. Advisory data may change after a green build. Actual runtime exploitability depends on deployment and route configuration; ReboundOps remains localhost-only.

## License inventory

The initial pre-remediation lockfile recorded **453 pinned locations**. After remediation, the current lock records **442 pinned package locations**, including platform-specific optional packages, with 0 missing declared license expressions. Most were labeled MIT, ISC, BSD-2/3-Clause or Apache-2.0. The automated script identifies licenses that deserve manual attention rather than silently calling them compatible.

- **MPL-2.0:** **14 pinned locations**, covering `axe-core`, `@axe-core/playwright`, and the `lightningcss` package/platform variants. All 14 are marked development/build/test dependencies in the lockfile; MPL has file-level source/notice obligations for redistribution or modifications of covered code. No evidence here that ReboundOps modifies those sources. Verify the exact distribution contents before shipping them.
- **CC-BY-4.0:** `caniuse-lite` declares this license and is a development/build-time dependency. Confirm any applicable attribution when redistributing its source or data; metadata itself is not a legal opinion.
- **MIT, ISC, BSD, Apache-2.0, BlueOak-1.0.0, Unlicense and 0BSD:** broadly permissive/other notices still require retaining applicable license texts/attribution when distributing covered components. A package metadata label alone is not sufficient legal due diligence.
- npm lockfile `license` values are **package-declared metadata**, not audited legal evidence. Copyleft, mixed-expression or missing declarations should be reviewed against original license files.

Run `npm run review:deps -- <production-audit.json> <full-audit.json>` after generating npm's two audit JSON reports. CI performs these steps automatically and prints counts and flags; do not put any user career data or keys into these reports.

## Deferred checks

Independent vulnerability and licensing review, macOS/Windows clean installations, source-level notices, dependency update policy, and actual participant validation remain separate release gates. Paid AI tests and public beta are not authorized by this milestone.

## Continuous supply-chain controls (roadmap B3)

- **Pinned CI actions:** every `uses:` in `.github/workflows/` references a full commit SHA with the version in a trailing comment. A moved or compromised tag cannot change what runs. Workflows default to `permissions: contents: read`; only the CodeQL job adds `security-events: write`.
- **Dependabot** (`.github/dependabot.yml`): weekly PRs for the npm workspace lockfile (Angular packages grouped; dev minor/patch grouped; production patches grouped) and for GitHub Actions (SHA and comment bumped together). Every Dependabot PR runs the full CI and **still needs owner review**, because a lockfile change is a supply-chain change. Merging one does not replace the advisory triage above.
- **CodeQL** (`.github/workflows/codeql.yml`): `security-extended` queries for JavaScript/TypeScript and for the workflow files, on pushes to `main`, on PRs and weekly. Findings appear under *Security → Code scanning*.
- **Node 22 job:** the supported 22.x line is tested in CI alongside Node 24.
- **Not configurable from the repository:** secret scanning and push protection must be switched on by the owner (*Settings → Code security*). Until then, `npm run audit:release` remains the only committed-secrets check, and it matches file names, not secret contents.
- **Frontend unit-test tooling (B6):** `vitest` and `jsdom` (MIT) are **dev-only** dependencies of `@reboundops/web`, required by Angular's unit-test builder. The lockfile change was purely additive (49 new packages, no existing version changed or removed), and the dependency review showed no new advisories and no new licences needing review. They are not part of the preview archive.


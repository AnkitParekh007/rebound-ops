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

This is a point-in-time review. Advisory data may change after a green build. Actual runtime exploitability depends on deployment and route configuration; ReboundOps remains localhost-only.

## License inventory

The initial lockfile recorded **453 pinned package locations** (including platform-specific optional packages), with 0 missing declared license expressions. Most were labeled MIT, ISC, BSD-2/3-Clause or Apache-2.0. The automated script identifies licenses that deserve manual attention rather than silently calling them compatible.

- **MPL-2.0:** `axe-core`, `@axe-core/playwright`, and the `lightningcss` package/platform variants. These appear in development/build/test dependencies; MPL has file-level source/notice obligations for redistribution or modifications of covered code. No evidence here that ReboundOps modifies those sources. Verify the exact distribution contents before shipping them.
- **CC-BY-4.0:** one pinned package declares this license. Its identity and whether its data is redistributed must be reviewed for attribution requirements.
- **MIT, ISC, BSD, Apache-2.0, BlueOak-1.0.0, Unlicense and 0BSD:** broadly permissive/other notices still require retaining applicable license texts/attribution when distributing covered components. A package metadata label alone is not sufficient legal due diligence.
- npm lockfile `license` values are **package-declared metadata**, not audited legal evidence. Copyleft, mixed-expression or missing declarations should be reviewed against original license files.

Run `npm run review:deps -- <production-audit.json> <full-audit.json>` after generating npm's two audit JSON reports. CI performs these steps automatically and prints counts and flags; do not put any user career data or keys into these reports.

## Deferred checks

Independent vulnerability and licensing review, macOS/Windows clean installations, source-level notices, dependency update policy, and actual participant validation remain separate release gates. Paid AI tests and public beta are not authorized by this milestone.

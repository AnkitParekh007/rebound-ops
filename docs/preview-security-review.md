# Local developer-preview security and license triage

**Scope:** Unpublished ReboundOps v0.2.0-rc1 candidate. This is an engineering risk assessment, not penetration testing, a legal opinion, a production-security certification or permission to launch.

## Current threat boundaries

| Surface | Controls | Residual risk |
| --- | --- | --- |
| Local API | Bind 127.0.0.1; reject nonlocal Host and unapproved Origin or cross-site browser requests | No authentication; malicious local programs and extensions can access exposed local data |
| Saved sessions | Memory-only default, explicit disk consent, validated snapshots, private permissions, fail-closed unexpected disk changes | No encryption, cross-process locking or protection from local administrators |
| Evidence and routes | User-owned verification state, exact quotes, correction audit, supported/gap classifications | Career claims are not independently verified and plans are not employment predictions |
| AI | Disabled by default, payload preview, per-request consent, validation and limits | No live paid-provider test or legal/consent acceptance; model suggestions can be wrong |
| Distribution | Strict package allowlist, checksums and manifest, excludes keys, source uploads and node_modules | No cryptographic publisher signature; production npm install still depends on registry |
| Pilot feedback | In-browser memory and voluntary local download only | Participants may choose to share unredacted content |

The current API is suitable only for a single computer. Do not deploy with a reverse proxy or expose the loopback service through a tunnel.

## Dependency advisories

At the last verified review on 3 November 2026, npm reported **zero critical, zero high, and three moderate** production advisory entries, originating from the @fastify/static 10.1.8 → glob 13.0.6 → minimatch 10.2.6 dependency chain.

- Glob advisory GHSA-3g3m-2fjr-6pw4 affects cancellation behavior during traversal and has a fix in glob 14.0.2.
- Minimatch advisory GHSA-g3hv-75wg-m249 concerns resource amplification from an attacker-controlled glob expression and has a fix in minimatch 11.0.1.
- Current static-plugin dependencies do not accept these newer semver-major versions without further compatibility investigation. We have not forced unsupported overrides.
- The API serves a fixed compiled Angular directory with static-plugin wildcard routing explicitly enabled. The plugin's glob enumeration is used by its wildcard:false mode, which we do **not** enable; ReboundOps accepts no user-supplied glob patterns. This reduces the obvious input path but does **not** prove non-exploitability.
- Issue #19 tracks compatible upstream changes and repeat review. Fresh npm advisories can appear after any successful build; audit again on the eventual release commit.

CI fails on new high/critical production findings and prints all observed moderate and low findings. Remaining moderate findings must be explicitly reviewed by the owner before publication, not ignored.

## Third-party license and notices

The existing lockfile inventory recorded 14 build/test package locations reporting MPL-2.0 and one CC-BY-4.0 caniuse-lite build dependency. This candidate archive excludes node_modules, but compiled assets and future distribution may carry third-party rights and notice requirements. Where Angular emits third-party notices, they are included as compiled assets; the repository MIT license alone does not resolve all license obligations. Examine upstream license files, generated bundles and applicable distribution obligations before publishing.

## Disposition and pending approvals

- Automated API and E2E regression tests: must pass on the actual candidate commit
- Archive content and extracted-start smoke checks: must pass
- Manual macOS/Windows, keyboard and screen-reader usability: pending
- Independent source-level security and legal review: pending
- External human validation and outcome evidence: deferred by owner
- Live paid Anthropic evaluation: not approved
- Public GitHub Release and hosted deployment: **not authorized**

A candidate may be reviewed locally with fictional data. Public distribution requires an explicit go/no-go decision after these limitations are considered.

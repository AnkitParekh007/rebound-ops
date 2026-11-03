# ReboundOps v0.2.0-rc1 — local developer-preview quick start

**UNPUBLISHED CANDIDATE.** This is an experimental, local-first developer preview, not a hosted service, employment service, independently validated user product or public beta. Use fictional data for evaluation.

## Requirements and scope

- Node.js 24.x with npm, and Git and tar if building a package from source
- A computer with an unused local port 4174
- No API key, external user account, hosted database or payment
- Internet registry access for one dependency installation

The archive contains the compiled Angular site, compiled Fastify API, compiled shared contracts, npm workspace manifests, package-lock.json and basic documentation. Dependencies are **not bundled** and must be installed from npm. The candidate does not contain personal sessions or credentials.

## Starting from an extracted candidate archive

An archive is named reboundops-v0.2.0-rc1-COMMIT.tar.gz. Replace COMMIT with the actual short source commit printed by the packaging command.

~~~sh
tar -xzf reboundops-v0.2.0-rc1-COMMIT.tar.gz
cd reboundops-v0.2.0-rc1-COMMIT
node scripts/verify-preview.mjs
npm ci --omit=dev --ignore-scripts --no-audit --no-fund
npm run start -w @reboundops/api
~~~

Open **http://127.0.0.1:4174**. The compiled UI and API use the same loopback port; the Angular dev port 4200 is not needed. Never expose or tunnel 4174 to the internet.

The verifier checks SHA-256 values in preview-manifest.json. The matching .tar.gz.sha256 sidecar checks the archive bytes. These verify integrity, **not publisher identity**. Review the source commit shown by the manifest.

## Building and testing the candidate from Git

~~~sh
git clone https://github.com/AnkitParekh007/rebound-ops.git
cd rebound-ops
npm ci
npm test
npm run build:web
npm run package:preview
npm run smoke:preview
~~~

The archive and SHA-256 sidecar appear under dist/preview and are **not automatically published** to GitHub Releases, npm or any host. package:preview refuses missing builds and copies only approved source documents and compiled assets. smoke:preview unpacks the archive into a temporary folder, verifies file hashes, installs production dependencies, starts the local API and checks the compiled site, disabled AI and memory-only session defaults.

## Fictional demonstration

1. Select Use fictional example, then create a recovery session.
2. Confirm a fictional achievement and optionally attach an exact quotation from fictional source text.
3. Paste a fictional job requirement and manually mark supported, unreviewed or gap.
4. Compare Return, Shift and Bridge and select one route with a seven-day time-limited plan.
5. Mark a simulated task complete, add a fictional check-in and export Markdown and JSON.
6. Delete and restore the session to rehearse recovery. A checked box is not independent proof of an actual career action.

## Privacy, persistence and AI

By default, session data exists only in local API memory and disappears on restart. Durable storage needs both a separate local data-folder configuration and explicit per-session consent. Saved JSON and downloaded backups are unencrypted. Private research feedback remains only in the open browser page until separately exported. External AI is **disabled by default** and live paid-provider compatibility has not been approved.

## Troubleshooting

| Problem | Check |
| --- | --- |
| npm install fails | Node 24, package-lock.json and all three workspace manifests must be present; confirm network/registry access |
| UI is offline | Run the API in the extracted archive root and open port 4174, not 4200 |
| Port already occupied | Stop another local process; do not change binding to a public interface |
| Session lost after restart | Memory-only storage is intentional; create a private JSON backup |
| Restore skipped or corrupt file | Follow docs/local-persistence.md; do not put real JSON records into GitHub tickets |
| Advice looks inaccurate | Review evidence and hypotheses manually; no job outcomes are guaranteed |

Report problems with fictional reproduction steps, OS/Node/browser versions and expected versus observed behavior, not confidential data.

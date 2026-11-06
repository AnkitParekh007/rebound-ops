# ReboundOps v0.2.0-rc1 — local developer-preview quick start

**UNPUBLISHED CANDIDATE.** This is an experimental, local-first developer preview, not a hosted service, employment service, independently validated user product or public beta. Use fictional data for evaluation.

## Requirements and scope

- Node.js 24.x with npm, and Git and tar if building a package from source
- A computer with an unused local port 4174
- No API key, external user account, hosted database or payment
- Internet registry access for one dependency installation

The archive contains the compiled Angular site, compiled Fastify API, compiled shared contracts, npm workspace manifests, package-lock.json and basic documentation. Dependencies are **not bundled** and must be installed from npm. The candidate does not contain personal sessions or credentials.

## Download a GitHub Actions review artifact

After every job passes in a `main` branch CI run, its local release candidate and checksum are available as a **GitHub Actions artifact** for **14 days**. This is an experimental review download, **not** a published GitHub Release, hosted service, or approval for beta.

1. Open [ReboundOps CI workflow runs](https://github.com/AnkitParekh007/rebound-ops/actions/workflows/ci.yml).
2. Select a **successful push run on `main`** (not a pull request or feature branch). Verify that Linux, Windows and macOS jobs all passed.
3. Under **Artifacts**, click `reboundops-v0.2.0-rc1-<full-commit-SHA>`. GitHub downloads a ZIP containing the `.tar.gz` candidate archive, its `.tar.gz.sha256` checksum sidecar and a `.cdx.json` CycloneDX SBOM.
4. Extract the ZIP. In that directory, verify the SHA-256 sidecar with `sha256sum -c *.tar.gz.sha256` on Linux, or `shasum -a 256 -c *.tar.gz.sha256` on macOS. On Windows use `Get-FileHash -Algorithm SHA256` and compare the result against the sidecar.
5. **Verify who built it (recommended).** With the [GitHub CLI](https://cli.github.com/) installed and signed in, check the signed attestations recorded by CI for this exact archive:
   ```sh
   gh attestation verify reboundops-v0.2.0-rc1-*.tar.gz --repo AnkitParekh007/rebound-ops
   gh attestation verify reboundops-v0.2.0-rc1-*.tar.gz --repo AnkitParekh007/rebound-ops --predicate-type https://cyclonedx.org/bom
   ```
   The first proves the archive was built by this repository's `CI` workflow from the stated commit on `main` (SLSA build provenance, signed through Sigstore). The second proves the SBOM was attested for the same archive. If either fails, **do not run the archive**.
6. Extract the verified `.tar.gz` archive and follow the steps below. Check that `preview-manifest.json` identifies the source commit shown in GitHub Actions; run `node scripts/verify-preview.mjs` from the extracted folder.

GitHub manages artifact access and expiration according to repository settings. Do not treat these artifacts as private storage or publisher-signed software. If an artifact expires, a new authorized successful `main` CI build is required.

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

The verifier checks SHA-256 values in preview-manifest.json. The matching .tar.gz.sha256 sidecar checks the archive bytes. These verify integrity, **not publisher identity**; publisher identity comes from `gh attestation verify` (step 5 above). Review the source commit shown by the manifest.

**SBOM:** `sbom.cdx.json` inside the archive (identical to the `.cdx.json` sidecar) is a CycloneDX 1.5 inventory of the **production** npm dependency graph, generated from the bundled `package-lock.json` by `scripts/sbom.mjs`. It covers the API runtime packages and the Angular packages compiled into `dist/web`, with versions, licences, purls and integrity hashes; dev tooling is excluded. Feed it to your own scanner (e.g. Dependency-Track, Grype or Trivy) to check new advisories.

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

The archive and SHA-256 sidecar appear under dist/preview. Successful `main` runs also attach them as a 14-day GitHub Actions review artifact. No GitHub Release, npm publication or hosted app is created. package:preview refuses missing builds and copies only approved source documents and compiled assets. smoke:preview unpacks the archive into a temporary folder, verifies file hashes, installs production dependencies, starts the local API and checks the compiled site, disabled AI and memory-only session defaults.

## Fictional demonstration

1. Either answer the guided questions with fictional answers, or select **I'd rather fill in one form**, then **Use fictional example**, then create a recovery session.
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

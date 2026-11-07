# Automatic updates and screenshots

`.github/workflows/marketing-website.yml` builds on pushes to `main`, pull requests and manual dispatches. A PR merge is a push to `main`, so it deploys once without a second merge trigger.

## Every run

1. Install the pinned root and workspace dependencies and matching Chromium.
2. Run application tests, the recovery frontend build and screenshot-artifact tests.
3. Start the actual recovery API and workspace server at an ephemeral loopback port, using a newly created temporary data directory filled with fictional profile, job and application records. Provider credentials are removed from its child environment. No scans, AI calls or real career-data reads are requested; external browser requests and external server `fetch` requests are blocked.
4. Walk through a real synthetic recovery session and capture start, directions, plan, evidence, search workbench, scan and tracker views at 1440 × 1000 after their expected content renders. A JavaScript error, missing view or mobile overflow on the workbench page fails the run. Check both themes at 390px.
5. Write a manifest with the exact source SHA, UTC capture time, image dimensions and SHA-256 digests.
6. Rebuild all marketing pages, requiring the complete image set to match this run's commit. The gallery links to the source commit and shows the capture date.
7. Check all pages and save the complete deployable site as a 14-day review artifact.
8. On `main` only, upload and deploy the checked artifact with GitHub Pages. PRs never deploy production. A failed build/capture leaves the last successful website live. Newer pushes supersede older runs.

There are no bot commits, screenshot commit loops, paid AI calls, persistent deployment tokens or scheduled polling. Built images exist in the CI artifact and deployed website; they need not inflate the Git history.

A code commit rebuilds the site and refreshes screenshots. It does not automatically invent marketing claims or rewrite feature descriptions. Update `src/pages.mjs` and `src/home.html` when product behavior or positioning changes.

## One-time GitHub Pages setup (completed)

The owner selected GitHub Pages for unattended hosting. The connected GitHub integration cannot administer Pages settings (HTTP 403), so the owner sets these in the browser:

1. Repository **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. Once the first Marketing website run succeeds, configure **Custom domain → rebound-ops.org** in that same settings page.
3. In Cloudflare DNS, replace the old Sites apex A records (`162.159.143.30`, `172.66.3.26`) with GitHub Pages' four apex A records, all **DNS only**, TTL **Auto**:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

Remove only conflicting apex web A/AAAA/CNAME records. Keep mail, unrelated DNS and the old verification TXT records. Do not change nameservers. No `www` hostname is included in this cutover.

4. Wait for GitHub's DNS check and certificate provisioning, then enable **Enforce HTTPS** when available.
5. Run **Actions → Marketing website → Run workflow → main** once after configuring the custom domain. `actions/configure-pages` detects the correct site base path; a root custom domain and the temporary `/rebound-ops/` project URL are both supported.

Keep the existing Sites deployment and Cloudflare routing until the first Pages deployment succeeds. No new API secret is required: the deployment job uses GitHub's scoped `GITHUB_TOKEN` and OIDC with only `pages: write` and `id-token: write`. Fork PRs have no production deployment step.

GitHub Pages does not apply the Cloudflare-style `_headers` file. This remains a static marketing site with no account or write API; provider-managed HTTP headers differ from Sites. `.openai/hosting.json` retains the previous Sites project ID for manual fallback, but Sites no longer supplies the automated deployment.

## Local reproduction

```sh
npm ci
npm ci --prefix workspace --ignore-scripts
npx playwright install chromium
npm run build:contracts
npm run build:api
node marketing-website/scripts/capture-screenshots.mjs
MARKETING_SCREENSHOTS_DIR=marketing-website/.generated/screenshots \
MARKETING_REQUIRE_FRESH_SCREENSHOTS=true \
node marketing-website/build.mjs
node marketing-website/check.mjs
node --test marketing-website/tests/*.test.mjs
```

`MARKETING_BASE_PATH=/rebound-ops` builds the temporary GitHub project URL. Set the same variable for the checker. The custom domain uses an empty base path.

Plain `node marketing-website/build.mjs` uses bundled repository screenshots as an explicitly labeled local fallback. CI requires new captures and fails rather than silently reusing those files. If capture selectors need an update after an app redesign, fix the capture script and rerun the workflow; do not disable the freshness gate.

## Operate and roll back

Open **Actions → Marketing website** to inspect or rerun a failed build. Download its review artifact to inspect the static output and `screenshots-manifest.json`. Screenshot URLs contain their content hash; scripts and CSS use content-versioned URLs so a new deployment does not rely on a hard refresh to load changed assets. No source change is needed for a transient runner failure. Revert a bad source commit on `main` to trigger a full capture/build/deploy of the revert. Keep the previous site live while investigating a failed run.

## First verified deployment

The first unattended workflow, [run 42404393674](https://github.com/AnkitParekh007/rebound-ops/actions/runs/42404393674), captured, checked and deployed commit `0bb5ceb02fe219106c3a51468a594dff46ab5ad7`. All nine public pages and three screenshot assets were checked at the temporary project URL, and the public screenshot manifest matched that commit. The subsequent run 42404706862 deployed commit 17c9cf13eec7952a771dc1564b16190c6b70ce13. Its generated HTML and three content-hashed screenshot images were verified on https://rebound-ops.org over HTTPS after the owner saved the custom domain and DNS records. The cutover is complete.

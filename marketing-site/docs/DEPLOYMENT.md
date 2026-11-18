# Deploying the marketing site

Nothing here has been run. The site is not deployed, no DNS has changed, and no deploy workflow is
active. Every step below needs the owner's go-ahead.

## Open question: the domain

Two names appear in project notes: `rebound-orgs.org` (site brief) and `rebound-ops.org` (earlier
documentation). Neither has been confirmed, and the site hard-codes neither. Once the owner decides,
set `SITE_URL` to `https://<chosen domain>` (or `https://www.<chosen domain>`) for production builds.
Also confirm the domain is registered to the owner before pointing DNS at a host.

## Hosting: GitHub Pages vs Cloudflare Pages

| | GitHub Pages | Cloudflare Pages |
| --- | --- | --- |
| Cost | Free for public repositories | Free plan (build-minute and bandwidth limits generous for a small static site) |
| Accounts | None beyond GitHub | A Cloudflare account and its GitHub app with repository access |
| Build | GitHub Actions (`actions/upload-pages-artifact` + `actions/deploy-pages`), same place as CI | Cloudflare's build image, or upload from Actions with Wrangler and an API token secret |
| Preview deployments | Not built in (one live site per repository) | Automatic per branch and pull request |
| Custom headers (CSP, HSTS…) | Not supported | `_headers` file |
| Custom domain + HTTPS | Yes, with automatic Let's Encrypt certificates | Yes, automatic certificates; simplest when DNS is on Cloudflare |
| Rollback | Re-run the deploy workflow for an earlier commit | One click to any earlier deployment |
| Maintenance | Lowest: no new secrets, no third-party app | Low, plus an extra account, app permissions and possibly a token |

**Recommendation: GitHub Pages.** The source, CI and releases already live on GitHub, so it needs no
new account, secret or third-party access, and the site is a plain static build. Choose Cloudflare
Pages instead if per-pull-request previews or custom security headers become important.

## Builds

| Build | Command (from `marketing-site/`) | Indexing |
| --- | --- | --- |
| Local preview | `npm run build && npm run preview` | `noindex`, robots disallow all |
| Shareable preview | `SITE_URL=https://<preview host> npm run build` | `noindex`, robots disallow all |
| Production | `SITE_ENV=production SITE_URL=https://<domain> npm run build` | indexable, robots points at the sitemap |
| GitHub project page (no custom domain) | `SITE_ENV=production SITE_URL=https://<owner>.github.io BASE_PATH=/rebound-ops npm run build` | indexable under the sub-path |

Always run `npm test` after the build with the same environment variables; the tests check that
canonicals, the sitemap and robots match `SITE_URL` and `SITE_ENV`.

## Deploying to GitHub Pages (when approved)

1. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Add a workflow such as the one below as `.github/workflows/marketing-site-deploy.yml`. It runs only
   when started by hand, so nothing deploys on push.

   ```yaml
   name: Deploy marketing site
   on:
     workflow_dispatch:
   permissions:
     contents: read
     pages: write
     id-token: write
   concurrency: { group: pages, cancel-in-progress: false }
   jobs:
     build:
       runs-on: ubuntu-24.04
       defaults: { run: { working-directory: marketing-site } }
       env:
         ASTRO_TELEMETRY_DISABLED: '1'
         SITE_ENV: production
         SITE_URL: https://<confirmed domain>
       steps:
         - uses: actions/checkout@v7.0.1
         - uses: actions/setup-node@v7.1.0
           with: { node-version: 24, cache: npm, cache-dependency-path: marketing-site/package-lock.json }
         - run: npm ci
         - run: npm run build && npm test
         - uses: actions/upload-pages-artifact@v4
           with: { path: marketing-site/dist }
     deploy:
       needs: build
       runs-on: ubuntu-24.04
       environment: { name: github-pages, url: '${{ steps.deployment.outputs.page_url }}' }
       steps:
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

   Check the current major versions of `upload-pages-artifact` and `deploy-pages` before adding it.
3. Run it from the **Actions** tab and check the deployed URL.

## Custom domain and HTTPS (after the domain is confirmed)

1. Settings → Pages → Custom domain: enter the domain. Verify the domain for the account
   (Settings → Pages → *Verified domains*) to prevent takeovers.
2. DNS at the registrar:
   - apex: `A` records to GitHub Pages' published IPs (and `AAAA` for IPv6), as listed in GitHub's
     documentation at the time;
   - `www`: `CNAME` to `<owner>.github.io`.
3. Wait for the certificate, then tick **Enforce HTTPS**.
4. Rebuild with `SITE_URL` set to the final origin, and submit `<origin>/sitemap-index.xml` to search
   consoles if wanted.

## Rollback

- GitHub Pages: re-run the deploy workflow on the last good commit (Actions → the earlier run →
  *Re-run jobs*), or revert the faulty commit and deploy again.
- Cloudflare Pages: Deployments → choose an earlier deployment → *Rollback*.
- DNS mistakes: restore the previous records; keep TTLs low (300 s) during the first switch.

## Security headers

GitHub Pages cannot set response headers. The site loads nothing from third parties, uses no
cookies and no forms, so the exposure is small. If headers are required later (CSP, HSTS,
`Permissions-Policy`), Cloudflare Pages with a `_headers` file is the straightforward route; the
inline theme and JSON-LD scripts would then need hashes in the CSP.

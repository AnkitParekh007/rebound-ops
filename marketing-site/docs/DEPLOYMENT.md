# Deploying the marketing site

The owner approved deploying to GitHub Pages on 2026-11-20. GitHub Pages is enabled with source
*GitHub Actions* and the custom domain `rebound-ops.org`, and the deploy workflow below is in place.
Deployments are started by hand. The DNS records and domain verification are done by the owner
in Cloudflare and the GitHub account settings.

## Domain

The production site is **https://rebound-ops.org/** (apex, confirmed by the owner on 2026-11-19).
It is the default `SITE_URL`, so canonicals, the sitemap, Open Graph URLs and `robots.txt` all use
it. Redirect `www.rebound-ops.org` to the apex at the host (see below). DNS has not been changed.

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
| Production | `SITE_ENV=production npm run build` (SITE_URL defaults to `https://rebound-ops.org`) | indexable, robots points at the sitemap |
| GitHub project page (no custom domain) | `SITE_ENV=production SITE_URL=https://<owner>.github.io BASE_PATH=/rebound-ops npm run build` | indexable under the sub-path |

Always run `npm test` after the build with the same environment variables; the tests check that
canonicals, the sitemap and robots match `SITE_URL` and `SITE_ENV`.

## Deploying to GitHub Pages

1. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. The workflow is [`.github/workflows/marketing-site-deploy.yml`](../../.github/workflows/marketing-site-deploy.yml).
   It runs only when started by hand and only from `main`, so nothing deploys on push. It does a
   production build (`SITE_ENV=production`), runs `npm test` against it, and publishes
   `marketing-site/dist` with `actions/upload-pages-artifact` and `actions/deploy-pages`.
3. To publish: **Actions → Deploy marketing site → Run workflow** (branch `main`), then check
   https://rebound-ops.org/.

## Custom domain and HTTPS for rebound-ops.org

1. Settings → Pages → Custom domain: enter `rebound-ops.org`. Verify the domain for the account
   (Settings → Pages → *Verified domains*) to prevent takeovers.
2. DNS (the zone is on Cloudflare):
   - apex `rebound-ops.org`: `A` records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
     `185.199.111.153` and `AAAA` records `2606:50c0:8000::153`, `2606:50c0:8001::153`,
     `2606:50c0:8002::153`, `2606:50c0:8003::153` (GitHub Pages' addresses, checked 2026-11-20;
     confirm against GitHub's documentation if they ever change);
   - `www`: `CNAME` to `ankitparekh007.github.io` (GitHub Pages then redirects `www` to the apex);
   - set the records to **DNS only** (grey cloud) until GitHub has issued the certificate: the
     Cloudflare proxy hides the records from GitHub's checks. If the proxy is turned back on
     afterwards, use SSL/TLS mode **Full (strict)** to avoid redirect loops.
3. Wait for the certificate, then tick **Enforce HTTPS**.
4. Production builds already use `https://rebound-ops.org`; submit
   `https://rebound-ops.org/sitemap-index.xml` to search consoles if wanted.

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

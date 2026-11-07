# Production deployment

**Public website:** https://rebound-ops.org

**Host:** GitHub Pages, deployed by [Marketing website](https://github.com/AnkitParekh007/rebound-ops/actions/workflows/marketing-website.yml).

The owner enabled GitHub Actions as the Pages source, saved the custom domain and updated Cloudflare DNS. The domain was verified over HTTPS with current HTML and all three screenshot image hashes. The deployment job uses GitHub's built-in token and OIDC; no personal deployment key or ChatGPT session is needed.

## Automatic releases

Every push to main, including merged PRs, runs tests, captures current product views using isolated fictional data, rebuilds all marketing pages and publishes the checked artifact. Pull requests build review artifacts without publishing production. Failed captures or builds leave the last successful site live.

Screenshot source commit, capture date, dimensions, hashes and image URLs are available at https://rebound-ops.org/screenshots-manifest.json. The gallery links to its source commit. Images use content-hashed filenames and CSS/scripts have versioned URLs.

The first deployment passed in [run 42404393674](https://github.com/AnkitParekh007/rebound-ops/actions/runs/42404393674). The subsequent push deployed automatically in [run 42404706862](https://github.com/AnkitParekh007/rebound-ops/actions/runs/42404706862); its image hashes and root-path links were verified on the custom domain.

See [AUTOMATION.md](AUTOMATION.md) for reproduction, DNS configuration, troubleshooting and rollback. Routine updates require no DNS changes.

## Source and verification

Edit src/ and run the dependency-free marketing build and checker, plus the screenshot-artifact tests. Plain local builds use labeled bundled-image fallbacks. Production CI requires fresh, complete, commit-matched captures.

App screenshot capture was exercised locally with Chromium and in GitHub Actions. Marketing-page links, interactions and themes have automated checks; human visual/accessibility evaluation is separate.

GitHub Pages does not implement the Cloudflare-style _headers file. This remains a static site without accounts or write APIs. The www hostname is not configured.

## Previous host (manual fallback)

The original Sites project, appgprj_6aef6aa1722481919a9dbee14185bc77, remains at https://rebound-ops.akki77parekh.chatgpt.site and in .openai/hosting.json. It does not receive automated GitHub deployments and is no longer the production DNS target. Do not publish routine updates there or change its ID. Restoring that host requires an explicit hosting decision and DNS cutover.

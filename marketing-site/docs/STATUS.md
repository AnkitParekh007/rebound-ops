# Marketing site v1 — status (2026-11-18)

Branch `feature/marketing-site-v1`, cut from `main` at `fc049c1`. Not pushed, not deployed.

## Results that were actually run

| Check | Command | Result |
| --- | --- | --- |
| Type check | `astro check` (in `npm run build`) | 0 errors, 0 warnings, 0 hints (34 files) |
| Build | `npm run build` | 10 pages + robots.txt + sitemap |
| Static test suite | `npm test` | 36 tests: 34 pass, 0 fail, 2 skipped by design (`CHECK_EXTERNAL=1` network link check; `REQUIRE_SCREENSHOTS=1` release gate) |
| Production mode | `SITE_ENV=production` build + test (SITE_URL `https://rebound-ops.org`) | see the latest run below |
| Sub-path mode | `SITE_ENV=production SITE_URL=https://owner.github.io BASE_PATH=/rebound-ops` build + test | 34 pass, 0 fail |
| Accessibility (jsdom) | axe-core 4.14.1, WCAG 2.0/2.1/2.2 A+AA and best-practice, every page | 0 violations on all 10 pages (contrast excluded: jsdom has no rendering) |
| Contrast | token pairs, both themes + fixed colours | all text ≥ 4.5:1, focus ring ≥ 3:1 |
| Links | internal links + fragments; external allow-list | pass (external URLs not fetched) |
| Sitemap / robots | sitemap index + urlset, every page once, no 404; robots per mode | pass |
| Dependencies | `npm audit` / `npm audit --omit=dev` | 0 vulnerabilities |
| App isolation | root `npm run lint`, `npm run audit:release` | lint: no issues; audit:release PASS |
| Screenshot seeding dry run | `CAPTURE_SEED_ONLY=1 npm run screenshots:app` against `v0.2.0` (`4e930db`) | app built and served; 2 fictional applications seeded (fit 4.5 confirmed, 2 unconfirmed); 8 routes served |

Page weight (uncompressed / gzip HTML; JavaScript): home 92 KB / 18.5 KB with ~6.5 KB JS;
other pages 13–66 KB HTML with 1.1–3.7 KB JS. CSS 81 KB total (≈19 KB gzip) split by page.
Latin font files: 78 KB + 57 KB (preloaded) + 40 KB mono.

## Not run here (blocked) — exact reasons

No browser can start inside this session's macOS sandbox:

- Chromium / headless shell (Playwright 1.65.1): `FATAL … mach_port_rendezvous_mac.cc:159 …
  bootstrap_check_in … Permission denied (1100)`.
- WebKit 2388: launch timed out after 180 s.
- Firefox 1572: launches, but `browser.newPage: Target crashed` (also with content sandbox disabled).

Consequently these did **not** run locally and have no results yet: `npm run test:e2e` (Playwright +
axe with real rendering and contrast, overflow 320–1920 px, CLS, theme, reduced motion, no-JS,
keyboard, demos), `npm run lighthouse`, `npm run screenshots:site`, and the real
`npm run screenshots:app` capture. No visual inspection of rendered pages was possible; a code-level
review pass fixed a header overflow (980–1140 px), an overlapping hero control and unfocusable
scroll regions. All of these run in `.github/workflows/marketing-site.yml` on GitHub's Ubuntu
runners once the branch is pushed (needs owner approval).

## Continuation checkpoint

1. With approval, push: `git -c lfs.locksverify=false push origin feature/marketing-site-v1`.
   The workflow runs build, static tests, Playwright, site screenshots and Lighthouse; download the
   `marketing-site-reports` artifact and record the numbers here.
2. Run the workflow by hand with *capture_app_screenshots*; review the `app-screenshots-v0.2.0`
   artifact (images and alt text), copy it into `marketing-site/public/screenshots/` and
   `src/data/screenshots.json`, then `npm run build && npm test` and commit.
3. Fix anything the browser run reports, review the site screenshots in both themes and with reduced
   motion, and repeat.
4. Domain decided: `https://rebound-ops.org/` (2026-11-19, now the default `SITE_URL`). Still to do
   with approval: choose the host (recommendation: GitHub Pages, see `DEPLOYMENT.md`), deploy, DNS.

# ReboundOps marketing website

A static multi-page site for ReboundOps, independent of the local recovery API and job-search apps. No runtime packages, external fonts, analytics or signup form.

## Structure

- `src/home.html`: homepage content.
- `src/pages.mjs`: original content for How it works, Features, Screenshots, Sources, Compare, Methodology, Help and FAQ.
- `src/styles.css`: shared responsive design and light/dark tokens.
- `src/theme.js`: pre-paint theme initialization, saved preference, system and cross-tab changes.
- `src/site.js`: navigation, previews, screenshot gallery, source filters, clipboard controls and progressive scroll reveals.
- `public/`: static graphics, repository demo screenshots, robots and response-header configuration.
- `build.mjs`: dependency-free static generator with shared header/footer, current-page navigation, SEO tags, sitemap and 404 page.
- `dist/`: committed deployable build output. Do not edit generated files directly.

## Build and check

```sh
node marketing-website/build.mjs
node marketing-website/check.mjs
```

From the repository root, serve locally with `python3 -m http.server 8080 --directory marketing-website/dist`. Rebuild after source changes. No npm install is needed for the marketing site itself.

## Design and content

Transparent sections and panels share a white or dark canvas. Orange branding and cyan signals define the technical visual style. The original curved-path hero illustration and copy are retained, with theme-aware illustration colors, subtle path motion and a floating caption; supported browsers progressively reveal content. Motion is disabled with the system reduced-motion preference. The theme toggle follows the system initially and stores only `reboundops-theme` in localStorage when selected.

The header uses the eight requested menu labels from cvstart.org. Page layouts and copy are specific to ReboundOps. CI walks the current recovery flow and captures seven views with synthetic demo data on every build. The gallery records its source commit and capture date. Plain local builds use the bundled repository images as an explicitly labeled fallback. Captures retain the application’s own theme; they are not recolored by the marketing site.

Recovery actions and route examples follow `packages/contracts/src/workflow.ts`. The Sources selection is validated against actual provider files at build time, is explicitly non-exhaustive and makes no partnership or coverage claim. Comparison content distinguishes the recovery app, workspace and a DIY spreadsheet without unsupported competitor benchmarks. Existing upstream attribution is retained in `THIRD_PARTY_NOTICES.md`.

## Publish

The public site is https://rebound-ops.org. `.openai/hosting.json` retains its Sites identity and static directory. Publish the complete `dist/` output and preserve the project ID. GitHub pushes to `main` automatically capture screenshots, build and deploy through `.github/workflows/marketing-website.yml` with the completed Pages/domain setup described in [AUTOMATION.md](AUTOMATION.md). PRs build review artifacts without publishing. `_headers` is applied only by hosts supporting that convention; configure equivalent headers when moving to another host.

This website does not host career records or the application API. Local app setup is explained on `/help/`.

See [AUTOMATION.md](AUTOMATION.md) for the pipeline, screenshot freshness rules, one-time host cutover and local reproduction.

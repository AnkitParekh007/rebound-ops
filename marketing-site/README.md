# ReboundOps marketing site

The public website for ReboundOps: a static, multi-page Astro site. It lives beside the app but is
fully independent — its own `package.json`, lockfile, scripts, tests and CI workflow
(`.github/workflows/marketing-site.yml`). The app's lint ignores this folder and its release
archive excludes it.

All product copy must trace to [`docs/CAPABILITIES.md`](docs/CAPABILITIES.md). Update that file
first when the product changes.

## Commands

Run from `marketing-site/` with Node 22.12+ (CI uses Node 24).

| Command | What it does |
| --- | --- |
| `npm ci` | Install the site's own dependencies |
| `npm run dev` | Dev server on <http://localhost:4321> |
| `npm run build` | `astro check` (types) and a static build into `dist/` |
| `npm test` | Static checks on `dist/`: pages, headings, titles/descriptions, canonical/OG, JSON-LD, banned claims, links and fragments, sitemap and robots, axe-core (jsdom), token contrast, OG images, screenshots |
| `npm run verify` | Build, then test |
| `npm run test:e2e` | Playwright + axe in Chromium (desktop and mobile): console errors, contrast in both themes, overflow 320–1920 px, CLS, theme toggle, reduced motion, no-JS, keyboard, demos |
| `npm run screenshots:app` | Capture the real app (see [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md)) |
| `npm run screenshots:site` | Full-page screenshots of this site into `reports/site-screenshots/` |
| `npm run lighthouse` | Lighthouse for every page, mobile and desktop, into `reports/lighthouse/` |
| `npm run og` | Regenerate the Open Graph images in `public/og/` |

Build settings (environment variables):

| Variable | Default | Purpose |
| --- | --- | --- |
| `SITE_URL` | `http://localhost:4321` | Absolute origin for canonicals, sitemap, OG and robots. **Set it for every deployed build.** |
| `BASE_PATH` | `/` | Sub-path when served from a folder, e.g. `/rebound-ops` on GitHub project pages |
| `SITE_ENV` | `preview` | `production` allows indexing; anything else emits `noindex` and a disallow-all `robots.txt` |

## Architecture

- **Astro 7, static output**, `trailingSlash: 'always'`, directory-style pages. No UI framework:
  interactivity is either pure CSS (native radio inputs + `:has()`) or small vanilla TypeScript
  modules that Astro bundles. Total JavaScript on the home page is a few kilobytes.
- **Pages** (`src/pages`): home, features, how-it-works, preview, download, privacy, docs, faq,
  changelog, a custom 404, plus `robots.txt` and the sitemap from `@astrojs/sitemap`.
- **Data** (`src/data`): `product.ts` (facts, features, releases, FAQ), `demo.ts` (fictional demo
  data), `screenshots.json` (written only by the capture script).
- **Fonts**: Bricolage Grotesque (display), Instrument Sans (text), JetBrains Mono (data) — all
  OFL-1.1 variable fonts from Fontsource, bundled and served from the site itself.
- **No tracking**: no analytics, cookies or third-party requests. The theme choice is the only thing
  stored in the browser.

## Design system

Tokens live in [`src/styles/tokens.css`](src/styles/tokens.css); components use only tokens.

- **Colour**: warm paper neutrals (light) and deep char surfaces (dark), an ember accent, a lime
  signal and a tide teal reserved for evidence and verified facts. Status colours (ok, warn, bad)
  have soft backgrounds. The hero/story "stage" palette is dark in both themes. Every text pair is
  ≥ 4.5:1 in both themes (`tests/unit/contrast.test.mjs`).
- **Type**: fluid modular scale `--step--2` … `--step-5` with `clamp()`, display at 90% width.
- **Space**: `--space-3xs` … `--space-3xl`, fluid at the large end; `--gutter`, `--measure`.
- **Radii**: `--r-xs` 6 px … `--r-xl` 36 px, `--r-pill`.
- **Elevation**: `--shadow-1/2/3`, warm-tinted in light, deeper in dark.
- **Motion**: easings `--ease-out`, `--ease-in-out`, `--ease-bounce`; durations `--dur-instant`
  (90 ms), `--dur-quick` (160), `--dur-base` (260), `--dur-slow` (480), `--dur-story` (900);
  `--stagger` (70 ms). Under `prefers-reduced-motion: reduce` every duration becomes 1 ms and the
  stagger 0, so all states resolve instantly.
- **Themes**: system by default; the toggle cycles system → light → dark and is stored per browser.

## Motion and interaction inventory

| Where | What moves | Trigger | Reduced motion / no JS |
| --- | --- | --- | --- |
| Hero stage | Four scenes: job cards deal in; fit gauge and criteria bars fill, evidence and eligibility rise; resume and letter fan out, lines draw, export badges pop; tracker card hops to Applied after a confirm tick | Autoplay every 4.2 s while visible; stepper buttons | No autoplay; scenes switch instantly via buttons. No JS: first scene and all captions visible |
| Hero arc stepper | Ball bounces along the rebound arc to the active step | Scene change | Instant position |
| Hero pause button | Play/pause | Click; also pauses on hover, focus, tab hidden, off-screen | Hidden (nothing autoplays) |
| Scroll story (home) | Sticky card swaps layers (evidence → score meter → files/answers → applied/reminder); inactive chapters dim | IntersectionObserver at viewport centre | Instant swaps, no dimming; card is decorative, text carries content |
| `[data-reveal]` blocks | Fade and rise with stagger | IntersectionObserver, once | Fully visible |
| How-it-works timeline | Number pops, connector draws, text and illustration rise, illustration parts stagger, bars fill | IntersectionObserver per step | Fully visible |
| Playground tabs | Sliding ink indicator, panel rise | Click / arrow keys / Home / End | Instant |
| Fit demo | Gauge and bars grow; panel fades in | Choosing a job (radio) | Instant; works without JS |
| Document demo | Sheet slides in; provenance notes fade in | Segmented control; switch | Instant; works without JS |
| Tracker demo | Rail pip scales; confirm box appears; trail entries slide in | Buttons | Instant; explanatory text without JS |
| Network explorer | Data pipes flow; the internet beam lights up for network actions | Choosing an action | Static pipes; works without JS |
| AI demo | Panes swap with a rise | Radio | Instant; works without JS |
| Buttons, chips, cards | Lift on hover, press scale, arrow nudge | Hover / active | Instant |
| Theme toggle | Icon rotate/scale swap, press rotation | Click | Instant |
| FAQ | Plus rotates to minus, answer rises | `<details>` toggle | Instant |
| Mobile menu | Drops in; burger morphs to ×; Escape closes and returns focus | Button | Instant; no JS shows links inline |
| 404 | Arc draws, ball settles | Load | Static |

No scroll listeners are used anywhere; media are lazy-loaded with explicit dimensions.

## Accessibility

Skip link, landmarks, one `h1` per page with ordered headings, visible focus rings (≥ 3:1),
44 px touch targets, keyboard support for every control (native inputs or the ARIA tabs pattern),
`aria-pressed`/`aria-selected`/`aria-expanded` state, a polite live region for tracker changes,
`forced-colors` support, and content that never depends on animation or JavaScript.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Nothing is deployed automatically, and the production
domain is still to be confirmed by the owner.

## Licences

Site code is part of the ReboundOps repository (MIT). The three fonts are OFL-1.1; their licence
texts are published with the site in `public/licenses/` and linked from the footer. Artwork, the logo
mark and OG images were made for this site.

Build-time tools are not redistributed: `dist/` contains only this site's HTML, CSS and JavaScript,
the fonts and its own images. Among the build tools, `sharp` bundles libvips (LGPL-3.0-or-later),
and `lightningcss` and `axe-core` are MPL-2.0. `npm audit` reported 0 vulnerabilities on 2026-11-18.

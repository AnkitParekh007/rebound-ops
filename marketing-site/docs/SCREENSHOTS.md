# Product screenshots

The preview page shows screenshots of the real app only. They come from one script,
`scripts/capture-app-screenshots.mjs`, and nowhere else. Until it has run, the page shows an honest
"not captured yet" panel instead of images, and the tests enforce that.

## What the script does

1. Extracts the release tag (`CAPTURE_TAG`, default `v0.2.0`) with `git archive` into
   `.capture-tmp/app` (git-ignored), runs `npm ci` and `npm run build` there. Your working tree is not
   touched. `CAPTURE_APP_DIR` can point at an existing built checkout of the tag instead.
2. Starts the production server (`apps/api/src/main.ts`, which serves the built web app) on a random
   loopback port with a new temporary data folder.
3. Captures the onboarding screen while the app is fresh, then seeds it **only through the public
   HTTP API** with the fictional fixtures in `tests/fixtures` (the `jordan-fictional` resume and the
   job postings whose title and employer can be extracted). It generates documents, moves the
   best-fitting application to Applied with explicit confirmation, adds a fictional contact and
   shortlists another.
4. Captures desktop (1440×900) and mobile (390×844 at 2×) shots of onboarding, overview, Discover
   (consent screen — no network request is made), fit assessment, documents, tracker, AI assist and
   the data/backup settings.
5. Converts them to AVIF and WebP in `public/screenshots/` and writes `src/data/screenshots.json`
   with the tag, commit, browser and time. Files are only replaced after every capture succeeded.
6. Deletes the temporary data folder.

AI assist is captured with AI off (the default) unless you set `CAPTURE_OLLAMA_MODEL` to a model you
already have in a local Ollama. The script never downloads a model.

## Running it

```bash
cd marketing-site
npx playwright install chromium      # once
npm run screenshots:app
npm run build && npm test            # verifies every view, file, size and alt text
```

Or run the **Marketing site** workflow by hand with *capture_app_screenshots* ticked; it uploads the
images and manifest as an artifact (nothing is committed by CI).

Then look at every image and its alt text before committing. Alt text is written in the script from
what each view is designed to show; correct it there if a capture shows something different.

`CAPTURE_SEED_ONLY=1` runs the install, server and seeding without a browser and writes nothing.

## Status

Not captured yet. In the development sandbox, no Playwright browser can start (Chromium and WebKit
are blocked by the macOS sandbox, Firefox's content process crashes). The seed-only dry run was run
successfully against the real `v0.2.0` (`4e930db`) server: it installed and built the app, seeded two
fictional applications (fit 4.5 confirmed and 2 unconfirmed) and served all eight routes.

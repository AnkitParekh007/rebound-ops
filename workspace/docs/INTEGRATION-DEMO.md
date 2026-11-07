# ReboundOps — integrated recovery + job-search demo

> **Local demo only; not publicly hosted; AI off; no personal data used.**
> One repository, three parts: the ReboundOps recovery API (`apps/`,
> `packages/`), the ReboundOps Workspace job-search UI (`workspace/`) and the
> ReboundOps engine data folder and CLI scripts (`engine/`).

## What it is

```
Browser ── http://127.0.0.1:4317 ───────────────────────────────────────────────┐
  #/start     Screen A  goal + minimal intake                                    │
  #/recovery  Screen B  Return/Shift/Bridge + 7-day plan                          │
  #/dashboard, #/scan, #/evaluate, #/tracker, …  job-search views                │
                                                                                 │
ReboundOps Workspace (Express, workspace/)                                       │
  /api/*            job-search routes ── read/write engine/ (REBOUND_OPS_ROOT)   │
  /api/rebound/*    allowlisted bridge ──fetch──► ReboundOps API                 │
                                                  http://127.0.0.1:4174 (Fastify, apps/api)
                                                  memory-only sessions, AI off
```

* **Recovery comes first.** A first-time visitor with no URL hash lands on
  `#/start`. Returning visitors and bookmarks keep their route;
  `Skip to job-search workspace` is always visible.
* **Real ReboundOps logic.** Sessions, the three routes, the seven-day plan,
  action completion, revision conflicts and the Markdown export all come from
  `apps/api` + `packages/contracts`. The workspace never generates a plan.
* **The job-search views keep their layouts.** The recovery integration added
  branding tokens, the logo, a `Recovery` nav item and a one-line context strip.

## Layout, ports and processes

| Part | Folder | URL / role |
|---|---|---|
| ReboundOps API | `apps/api`, `packages/contracts` | `http://127.0.0.1:4174` — reached only through the bridge |
| ReboundOps Workspace + bridge | `workspace/` | `http://127.0.0.1:4317` — open `/#/start` |
| ReboundOps engine | `engine/` | data folder (`cv.md`, `config/`, `data/`, `reports/`) and the CLI scripts the workspace runs; `REBOUND_OPS_ROOT` |

The workspace finds the engine automatically as the sibling `engine/` folder;
set `REBOUND_OPS_ROOT` to point it elsewhere. Personal files the engine creates
(`cv.md`, `config/profile.yml`, `data/…`) are git-ignored by `engine/.gitignore`.

## Run it

Requirements: Node 24.15+ or 26, npm, git, bash, curl.

```bash
git clone https://github.com/AnkitParekh007/rebound-ops.git
cd rebound-ops
scripts/start-demo.sh
```

Then open **http://127.0.0.1:4317/#/start**. The script runs `npm ci` where
`node_modules` is missing (root and `workspace/`), builds the contracts and API,
starts both servers on loopback and stops both on Ctrl+C. AI keys are unset for
both processes and `REBOUNDOPS_AI_ENABLED=false`.

Manual equivalent (two terminals, from the repository root):

```bash
npm ci && npm run build:contracts && npm run build:api && npm run start -w @reboundops/api
cd workspace && npm ci --ignore-scripts && node server/index.mjs
```

The engine's own CLI scripts need `cd engine && npm install --no-package-lock`
before use (the demo journey does not need them).

## Data flow and privacy

1. Screen A posts `{ intake }` to `POST /api/rebound/sessions`. The bridge rebuilds
   the intake from known fields only; every achievement is sent as
   `source.kind: 'manual'`, `status: 'unverified'` regardless of what the client
   sent. ReboundOps validates it again with its strict Zod schema.
2. The session lives **in the ReboundOps API's memory** (lost on API restart).
3. The browser keeps a small handoff summary in `sessionStorage`
   (`reboundops:handoff`: session id, goal, chosen direction, next action title,
   plus the Screen A draft so `Edit goal` can prefill). It is cleared when the
   tab closes. `localStorage['reboundops:visited']` only records that `#/start`
   was seen.
4. **Nothing is written to the engine folder** — no CV, profile,
   tracker, pipeline or activity-log entry. `/api/rebound/*` is not mapped in
   the activity log.
5. Export is a deliberate click that downloads ReboundOps' own Markdown.

## Bridge security

`server/lib/routes/reboundops.mjs`:

* Fixed destination `http://127.0.0.1:<REBOUNDOPS_API_PORT|4174>`; clients
  cannot choose host, path or method. Six allowlisted actions; any other
  `/api/rebound/*` path returns `404 NOT_IN_ALLOWLIST`.
* Session IDs must be UUIDs; action IDs must match `(return|shift|bridge)-[1-7]`;
  mutation bodies are rebuilt from validated fields; 64 KB body cap; JSON only.
* No browser header (Cookie, Authorization, Origin, Referer) is forwarded. The
  API sees `Host: 127.0.0.1:4174`, which the ReboundOps guard already
  accepts — **neither app's Host/Origin guard was changed**.
* The existing ReboundOps `requestGuard` (DNS-rebinding + cross-site refusal)
  runs first; mutations use the existing `writeRateLimit()`.
* 5 s timeout; an unreachable API returns `503 RECOVERY_SERVICE_OFFLINE` and the
  UI says **“Recovery service is offline”** with the restart command. There is
  no fallback plan.
* Request bodies and exports are never logged.

## Branding

* **Logo:** the supplied ReboundOps logo (originals kept in
  `docs/reboundops-next/brand/*-original.png`). `public/brand/` holds assets
  derived from it by `docs/reboundops-next/brand/generate-assets.mjs`
  (headless-Chromium canvas: crop, colour-to-alpha against the logo background,
  resize):
  * `reboundops-mark.png` — transparent R mark, sidebar logo (overrides the
    round accent crop so the whole mark shows)
  * `favicon-32.png`, `favicon-64.png`, `apple-touch-icon.png` (mark on the logo's dark brown)
  * `reboundops-logo-on-light.png` / `reboundops-logo-on-dark.png` — full lock-up
    on `#/start`, swapped by theme
  The previous favicon PNGs stay on disk; only `index.html` links changed.
* **Palette** from the logo: orange `#E8541F` (accents), deep brown `#220B08`
  and cream `#FAF6F0` (logo artwork). Page surfaces are deliberately plain:
  white with neutral greys in light mode, a near-neutral charcoal (`#121010`)
  in dark mode — no tinted page, sidebar, hero or banner backgrounds. The orange
  is reserved for actions, links, focus rings and highlights.
  `public/css/reboundops.css` sets both workspace token families (`--cv3-*` and
  the app.css neutrals) plus the chat-launcher tokens; it also clears the
  dashboard hero's decorative fill and blur planes and the tinted "no AI key"
  banner. No layout or component structure changed.
* **Contrast** (all WCAG AA, computed): body text 18:1 light / 16.7:1 dark;
  muted text ≥5.4:1; input borders ≥3.1:1; white on the light accent `#C2410C`
  5.2:1; brown ink on the dark accent `#F26A2E` 6.1:1.
* **Colour audit:** a headless check of `#/dashboard`, `#/scan`, `#/tracker`,
  `#/pipeline`, `#/evaluate`, `#/config` and `#/cv` in both themes found no
  remaining blue/purple-hue backgrounds, text or borders. Semantic colours
  (success green, warning amber, error red, score bands) are deliberately kept.
* Product name `Rebound`**`Ops`** in the sidebar (matching the logo's two-tone
  wordmark), `<title>` and per-route titles.

## Tests

| Command | Scope |
|---|---|
| `node --test tests/reboundops-bridge.test.mjs` | Bridge contract against a stub upstream + temp `REBOUND_OPS_ROOT`: allowlist, validation, header stripping, forced `unverified`, cross-site refusal, 413, offline 503, no engine writes |
| `node scripts/reboundops-smoke.mjs` | Live API journey through the bridge against the running services |
| `node scripts/reboundops-smoke.mjs --browser` | + Chromium journey (Playwright from the repository root `node_modules`), writes `docs/reboundops-next/screenshots/` |
| `npm test` | Full workspace suite |

## What is integrated

**Working and tested:** goal-first entry route; real ReboundOps session
creation; Return/Shift/Bridge routes; route selection and switching with
revision checks; the seven-day plan; action completion persisted in the API;
Markdown export; offline handling; navigation into the job-search views; the
context strip from live state; the logo palette in light/dark; the start script;
automated tests.

**Linked only:** the job-search views are reached by navigation; they do not
read ReboundOps recovery data, and the strip only displays. Planned follow-ups
are tracked in [docs/roadmap.md](../../docs/roadmap.md).

## Licences

`workspace/` and `engine/` are derived from MIT-licensed third-party projects;
their original notices are reproduced verbatim in
[THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).

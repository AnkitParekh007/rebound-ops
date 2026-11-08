# ReboundOps — integrated recovery + job-search demo

> **Local-first workspace; not publicly hosted; recovery AI requires explicit opt-in.**
> One repository, three parts: the ReboundOps recovery API (`apps/`,
> `packages/`), the ReboundOps Workspace job-search UI (`workspace/`) and the
> ReboundOps engine data folder and CLI scripts (`engine/`).

## What it is

```
Browser ── http://127.0.0.1:4317 ───────────────────────────────────────────────┐
  #/start          goal-first onboarding (4 short steps)                       │
  #/recovery       My next step: snapshot + one decision or one next action    │
  #/directions     Direction Canvas (Return / Shift / Bridge hypotheses)       │
  #/opportunities  consent handoff → #/scan?q=… (read-only filter)             │
  #/evidence       Evidence Ledger (your own review status)                    │
  #/dashboard, #/scan, #/evaluate, #/tracker, …  job-search views                │
                                                                                 │
ReboundOps Workspace (Express, workspace/)                                       │
  /api/*            job-search routes ── read/write engine/ (REBOUND_OPS_ROOT)   │
  /api/rebound/*    allowlisted bridge ──fetch──► ReboundOps API                 │
                                                  http://127.0.0.1:4174 (Fastify, apps/api)
                                                  memory-only sessions, AI off by default
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
starts both servers on loopback and stops both on Ctrl+C. Recovery AI is off by default. Use `--ai` with an exported `ANTHROPIC_API_KEY` to opt in, or `--no-ai` to keep it off. Known provider keys are stripped from the workspace process environment.

Manual equivalent (two terminals, from the repository root):

```bash
npm ci && npm run build:contracts && npm run build:api && npm run start -w @reboundops/api
cd workspace && npm ci --ignore-scripts && node server/index.mjs
```

The engine's own CLI scripts need `cd engine && npm install --no-package-lock`
before use (the demo journey does not need them).

## Data flow and privacy

1. The start flow keeps its draft in page memory only, then posts `{ intake }` to `POST /api/rebound/sessions`. The bridge rebuilds
   the intake from known fields only; every achievement is sent as
   `source.kind: 'manual'`, `status: 'unverified'` regardless of what the client
   sent. ReboundOps validates it again with its strict Zod schema.
2. The session lives **in the ReboundOps API's memory** (lost on API restart).
3. The browser keeps **only a reference** in `sessionStorage`
   (`reboundops:handoff` = `sessionId`, `goal` key, `suggestedRoute`) — no role,
   priorities, location, targets or achievement text; the session itself is
   fetched from the API into page memory on each load. "Edit my answers"
   pre-fills from the live session. `localStorage` holds two non-personal flags
   (`reboundops:visited`, `reboundops:prefers-tools`). An automated browser test
   checks storage during drafting and after the plan is created.
   (Earlier builds stored the full intake draft in sessionStorage; that is no longer the case.)
4. The opportunities handoff passes only the visible search text, in the URL
   fragment (`#/scan?q=…`), which never leaves the browser. The scan view applies
   it as a filter to postings it already has; no job board is contacted until
   the person presses Scan.
5. **Nothing is written to the engine folder** — no CV, profile,
   tracker, pipeline or activity-log entry. `/api/rebound/*` is not mapped in
   the activity log.
6. Export is a deliberate click that downloads ReboundOps' own Markdown.

## Bridge security

`server/lib/routes/reboundops.mjs`:

* Fixed destination `http://127.0.0.1:<REBOUNDOPS_API_PORT|4174>`; clients
  cannot choose host, path or method. Ten allowlisted actions (health, create,
  read, choose route, mark action, export, replace intake, record evidence
  review, recovery AI status, explicit model-metadata connection test); any other
  `/api/rebound/*` path returns `404 NOT_IN_ALLOWLIST`.
* Session and evidence IDs must be UUIDs; action IDs must match `(return|shift|bridge)-[1-7]`;
  evidence status must be `unverified`, `confirmed` or `rejected`;
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

**Working and tested:** progressive goal-first onboarding; real session
creation and "Edit my answers"; Recovery Home with snapshot and one next
step; Direction Canvas with switch confirmation; the seven-day plan from the
API with mark-done, reload/resume and export; consent handoff into Vacancy
search with a read-only filter; Evidence Ledger (self-review); journey
navigation with tools collapsed, mobile bottom bar; offline and ended-session
states; journey design system in light/dark; automated API + browser tests.

**Linked only:** the job-search views receive at most the visible search text;
they do not read ReboundOps recovery data, and the next-step panel only
displays. The job-search screens keep their existing components (not
redesigned on this pass). Planned follow-ups
are tracked in [docs/roadmap.md](../../docs/roadmap.md).

## Licences

`workspace/` and `engine/` are MIT-licensed ReboundOps components. See
[THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) for dependency redistribution notes.

## Recovery AI setup

Open **Set up AI assistance** from Start or Settings (`#/ai-setup`). Export a key privately in the launcher terminal, then run `bash scripts/start-demo.sh --ai`. The setup page shows configuration status and offers an explicit model-metadata connection test. No career data is sent by that test. Status and test requests use fixed `/api/rebound/ai/*` bridge endpoints; no credentials are accepted from the browser. Full requirement review remains in the Angular app: stop the launcher and run `REBOUNDOPS_AI_ENABLED=true npm run dev` with the key exported. See [Recovery AI setup](../../docs/ai-provider.md).

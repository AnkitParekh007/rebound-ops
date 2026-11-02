# ReboundOps

**Your experience is the starting point. Action is the outcome.**

An open-source career recovery assistant for experienced software professionals who are navigating layoffs or career changes.

## Phase 2 — Angular + local API preview

The validated **Phase 1 manual pilot** remains available at the repository root. Phase 2 adds a typed Angular frontend and a Fastify API, with shared Zod contracts and explicit state transitions. AI remains **disabled by default**; a separate optional Anthropic adapter requires local configuration and explicit per-request consent. There are no résumé uploads, hosted accounts, salary predictions, scraped job offers or automated applications.

### Requirements

- Node.js **22.22.3+** (22.x), **24.15.0+** (24.x), or a supported future 26.x
- npm (bundled with Node)
- All services run on your own computer.

### Install

```sh
git clone https://github.com/AnkitParekh007/rebound-ops.git
cd rebound-ops
npm install
npm run build:contracts
```

Open two terminals:

```sh
# Terminal 1: typed API at http://127.0.0.1:4174
npm run dev:api

# Terminal 2: Angular UI at http://127.0.0.1:4200
npm run dev:web
```

Visit **http://127.0.0.1:4200**.

For a production-local build, run `npm run build` followed by `npm run start -w @reboundops/api`. The Fastify process serves the compiled Angular site and API at **http://127.0.0.1:4174**.

### What you can do

1. Enter experience, practical constraints and 1–15 achievement claims with self-reported provenance.
2. Paste up to three private résumé/project-note excerpts and correct individual claims with exact, uniquely matched source quotations (or leave them manually sourced).
3. Confirm, reject or leave each claim unverified. Corrections reset confirmation and revoke dependent job-requirement links.
4. Compare **Return**, **Shift** and **Bridge** as hypotheses, with their unknowns stated explicitly.
5. Paste up to three real job targets and review their requirements against participant-confirmed achievements.
6. Choose a direction and get a seven-day plan bounded by your available hours.
7. Mark actions complete, record feedback and export a Markdown summary with evidence quotations and correction history.
8. Download or restore a private JSON session backup, or delete the memory-only API session.

Sessions are **memory-only by default**. With a configured private REBOUNDOPS_DATA_DIR, you can explicitly opt individual sessions into durable disk saving. Saved sessions survive API restarts; disabling saving removes the stored file. Private JSON backup/restore remains available. The browser does not send telemetry or data to an AI provider automatically. External AI calls are possible only when specifically enabled and approved via a payload preview. **Do not enter credentials, private employer information, sensitive résumés or anything you need to recover later.** The initial API has no login or encryption and is intended only for personal localhost testing.

### Optional durable local sessions

With the API stopped, configure a private directory outside the repository:

~~~sh
REBOUNDOPS_DATA_DIR="$HOME/.reboundops/sessions" npm run dev:api
~~~

Then select **Enable local disk saving for this session** in the UI. Only explicitly selected sessions survive restarts. Resume them from the intake page. Deleting a saved session removes its disk file; downloaded backups remain separate. Files are **not encrypted**.

See [local saving and recovery](docs/local-persistence.md).

### Tests

```sh
npm test
npm run build:web
npm run test:e2e  # install Chromium first: npx playwright install chromium
```

GitHub Actions runs both tests and the Angular production build.

## Optional AI evidence review (disabled by default)

Phase 2 includes an **opt-in**, server-side Anthropic adapter. It is disabled unless both `REBOUNDOPS_AI_ENABLED=true` and `ANTHROPIC_API_KEY` are set in the **local API process environment**. The sample `.env.example` does not automatically load or enable AI.

For each user-supplied job target, **Preview optional AI review payload** shows the exact JSON that would be transmitted: job title, requirement text, and *only participant-confirmed achievement claims*. The preview is a local operation and sends nothing externally. A separate **I consent: send this exact payload** click is required for each request. There are no automatic model calls, sessions are not changed by suggestions, and local API calls are limited to ten AI attempts per process. Provider billing, if enabled, is separate from ChatGPT/Claude consumer subscriptions.

See [the AI integration and safety guide](docs/ai-provider.md) before enabling this feature. The provider integration includes adversarial mock tests, an in-process attempt limit, and token usage reporting, but has not been verified against a live paid API account.

## Validated Phase 1 prototype

The original static version is preserved:

```sh
python3 -m http.server 4173
# open http://localhost:4173
```

It requires no dependencies or API key. It keeps information in a browser tab and supports fictional examples, route selection, a time-limited plan and export.

## Architecture and roadmap

- [Phase 2 implementation notes](docs/phase-2.md)
- [Evidence provenance and correction guide](docs/evidence-provenance.md)
- [Job requirement comparison guide](docs/job-requirements.md)
- [AI provider setup, privacy and safety](docs/ai-provider.md)
- [Synthetic AI evaluation and live-test approval gate](docs/ai-evaluation.md)
- [Fictional recovery journeys](examples/fictional-journeys.md)
- [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Release checklist](docs/release-checklist.md)
- [Decision record: local-first architecture](docs/adr-0001-local-first.md)
- [Private data and backup guidance](docs/privacy.md)
- [Opt-in local saving and recovery](docs/local-persistence.md)
- [Architecture](docs/architecture.md)
- [Original roadmap](docs/roadmap.md)
- [Pilot procedure](docs/manual-pilot.md)
- [Evaluation rubric](docs/evaluation-rubric.md)

**Next gates:** strengthen source-span verification, cross-browser usability, optional local durable storage and live provider compatibility testing with consenting fictional inputs.

## Principles

Evidence over invented fit scores. User choices over automated decisions. Actions completed over vanity metrics. Transparent handling of uncertainty, privacy and cost.

## License

MIT, see [LICENSE](LICENSE).

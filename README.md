# ReboundOps

**Your experience is the starting point. Action is the outcome.**

An open-source career recovery assistant for experienced software professionals who are navigating layoffs or career changes.

## Phase 2 — Angular + local API preview

The validated **Phase 1 manual pilot** remains available at the repository root. Phase 2 adds a typed Angular frontend and a Fastify API, with shared Zod contracts and explicit state transitions. It **does not use an AI provider** yet. There are no résumé uploads, hosted accounts, salary predictions, scraped job offers or automated applications.

### Requirements

- Node.js **22.22.3+** (22.x), **24.15.0+** (24.x), or a supported future 26.x
- npm (bundled with Node)
- All services run on your own computer.

### Install

\`\`\`sh
git clone https://github.com/AnkitParekh007/rebound-ops.git
cd rebound-ops
npm install
npm run build:contracts
\`\`\`

Open two terminals:

\`\`\`sh
# Terminal 1: typed API at http://127.0.0.1:4174
npm run dev:api

# Terminal 2: Angular UI at http://127.0.0.1:4200
npm run dev:web
\`\`\`

Visit **http://127.0.0.1:4200**.

For a production-local build, run \`npm run build\` followed by \`npm run start -w @reboundops/api\`. The Fastify process serves the compiled Angular site and API at **http://127.0.0.1:4174**.

### What you can do

1. Enter experience, practical constraints and 1–15 achievement claims with self-reported provenance.
2. Confirm, reject or leave each claim unverified.
3. Compare **Return**, **Shift** and **Bridge** as hypotheses, with their unknowns stated explicitly.
4. Choose a direction and get a seven-day plan bounded by your available hours.
5. Mark actions complete and record feedback.
6. Export a Markdown summary retaining evidence status and sources.

Sessions live **only in API memory** and disappear when the process restarts. The browser does not send data to an external AI provider or telemetry service. **Do not enter credentials, private employer information, sensitive résumés or anything you need to recover later.** The initial API has no login or encryption and is intended only for personal localhost testing.

### Tests

\`\`\`sh
npm test
npm run build:web
\`\`\`

GitHub Actions runs both tests and the Angular production build.

## Validated Phase 1 prototype

The original static version is preserved:

\`\`\`sh
python3 -m http.server 4173
# open http://localhost:4173
\`\`\`

It requires no dependencies or API key. It keeps information in a browser tab and supports fictional examples, route selection, a time-limited plan and export.

## Architecture and roadmap

- [Phase 2 implementation notes](docs/phase-2.md)
- [Architecture](docs/architecture.md)
- [Original roadmap](docs/roadmap.md)
- [Pilot procedure](docs/manual-pilot.md)
- [Evaluation rubric](docs/evaluation-rubric.md)

**Next gates:** usability and browser-level verification, explicit proof-source linking to supplied job descriptions, local persistence with consent, provider-bound data previews, then a strictly scoped AI adapter.

## Principles

Evidence over invented fit scores. User choices over automated decisions. Actions completed over vanity metrics. Transparent handling of uncertainty, privacy and cost.

## License

MIT, see [LICENSE](LICENSE).

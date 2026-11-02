# ReboundOps

**Turn professional experience, practical constraints and career options into a credible next step.**

ReboundOps is an open-source career-recovery project for experienced software professionals affected by layoffs.

> **Current status:** Phase 1 manual-pilot prototype, not a deployed AI service or a job-matching engine. The first version deliberately uses a deterministic workflow, fictional sample data and user-supplied inputs. It does not claim to infer hiring probabilities, compensation or job availability.

## Start the pilot prototype

The static UI requires no build tools or API keys. From the repository:

```sh
python3 -m http.server 4173
# open http://localhost:4173
```

You can also use `npm run dev` with Node.js 20+.

```sh
npm test
```

The interactive prototype supports editable intake and evidence, three career hypotheses (Return / Shift / Bridge), route choice, a time-budgeted seven-day action plan, progress check-ins and Markdown export. It keeps data in the current tab only; refreshing clears it. **No personal data is submitted to a server by the prototype.**

## What we validate first

1. Can an experienced professional describe relevant experience and constraints without friction?
2. Can they compare three *hypotheses*, with evidence and uncertainty made explicit?
3. Can they choose and complete a meaningful action within seven days?

See [pilot guide](docs/manual-pilot.md), [roadmap](docs/roadmap.md), [architecture](docs/architecture.md) and [evaluation rubric](docs/evaluation-rubric.md).

## Roadmap

- **Weeks 1–2:** five discovery conversations, three facilitated manual journeys, a synthetic demonstration and measurable decision gates.
- **Weeks 3–4:** Angular + TypeScript experience, Fastify local API, evidence and output schemas, correction and export.
- **Weeks 5–6:** 5–10-person pilot, evaluation, error recovery, packaging, CI and privacy improvements.
- **Weeks 7–8:** demo, documentation, consent-based case studies and public beta.

The dates are an indicative sequence, not a promise of delivery.

## Principles

- Evidence should be attributable to user input or documents; never invent achievements.
- Distinguish observations, uncertainties and suggested next tests.
- Keep users in control of decisions, corrections and publication.
- Minimize sensitive data handling and disclose which data leaves the machine before adding AI.
- Measure completed actions, not vanity scores.

Contributions welcome after the workflow has been validated. See the docs for current scope.

## License

MIT — see [LICENSE](LICENSE).

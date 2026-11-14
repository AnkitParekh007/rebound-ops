# Contributing to ReboundOps

Thank you for helping build an evidence-led, user-controlled career recovery tool.

## Before starting

Read the [community guidelines](CODE_OF_CONDUCT.md), [Wiki](https://github.com/AnkitParekh007/rebound-ops/wiki), [Discussions](https://github.com/AnkitParekh007/rebound-ops/discussions), and [product brief](docs/product-brief.md), [architecture](docs/architecture.md), [privacy notes](docs/privacy.md) and [evaluation rubric](docs/evaluation-rubric.md). For substantial ideas, begin in [Discussions](https://github.com/AnkitParekh007/rebound-ops/discussions). Open an issue for reproducible bugs or accepted, scoped work. Maintainers can use the [manual discussion-to-issue workflow](docs/community-triage.md).

## Development

Requires a compatible Node.js 22/24 runtime and npm.

```sh
npm ci
npm run build:contracts
npm run dev:api
# in another terminal
npm run dev:web
```

For checks:

```sh
npm test
npm run build:web
npx playwright install chromium firefox webkit
npm run test:e2e
npm run audit:release
npm run package:preview
npm run smoke:preview
```

Use npm ci for repeatable installs; update package manifests and the lockfile together when intentionally upgrading dependencies. The local candidate packaging command does not publish a release. Keep changes focused and add tests for new domain behavior. API handlers should delegate domain rules to `packages/contracts`; Angular should not bypass validation. Run through a fictional end-to-end journey before raising a PR.

## Product and privacy rules

- **Never commit real résumés, participant records, session backups, API keys or hiring correspondence.**
- Synthetic fixtures must be unmistakably fictional.
- Do not fabricate employment achievements, job matches, salary ranges or hiring probabilities.
- Preserve original sources; distinguish user confirmation from independent verification.
- External provider calls must stay opt-in with an exact-data preview.
- Model outputs are advisory, must be validated against known IDs, and must not auto-submit applications or modify evidence.
- Do not add automatic job scraping, contact harvesting or outreach without separate user research, policy and safety review.

## PR checklist

- [ ] Clear user problem and relevant GitHub issue
- [ ] Tests updated and local build passes
- [ ] No unintended external calls or network dependencies
- [ ] Accessibility and keyboard use checked
- [ ] Data retention/export behavior documented
- [ ] Prompt-injection and hallucination risks discussed for AI changes
- [ ] Screenshots/fixtures use only fictional data
- [ ] Documentation and changelog notes updated

See [security policy](SECURITY.md) for vulnerabilities.

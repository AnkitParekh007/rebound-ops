# Contributing to ReboundOps

Thank you for helping build an evidence-led, user-controlled career recovery tool.

## Before starting

Read [product brief](docs/product-brief.md), [architecture](docs/architecture.md), [privacy notes](docs/privacy.md) and [evaluation rubric](docs/evaluation-rubric.md). Open an issue to discuss major behavior changes.

## Development

Requires a compatible Node.js 22/24 runtime and npm.

```sh
npm install
npm run build:contracts
npm run dev:api
# in another terminal
npm run dev:web
```

For checks:

```sh
npm test
npm run build:web
npx playwright install chromium
npm run test:e2e
```

Keep changes focused and add tests for new domain behavior. API handlers should delegate domain rules to `packages/contracts`; Angular should not bypass validation. Run through a fictional end-to-end journey before raising a PR.

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

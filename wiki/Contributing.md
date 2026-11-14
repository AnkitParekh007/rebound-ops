# Contributing to ReboundOps

[← Wiki home](Home) · [Architecture](Architecture)

ReboundOps is an MIT-licensed, founder-maintained open-source project. Contributors, documentation writers, testers, designers and first-time open-source participants are welcome.

## Find work

1. Read the [repository contribution guide](https://github.com/AnkitParekh007/rebound-ops/blob/main/CONTRIBUTING.md) and [product brief](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/product-brief.md).
2. Browse [Issues](https://github.com/AnkitParekh007/rebound-ops/issues) for bugs and scoped improvements, or discuss larger proposals in [Discussions](https://github.com/AnkitParekh007/rebound-ops/discussions).
3. Agree on the problem and acceptance criteria before changing core behavior.
4. Use synthetic fixtures, targeted tests and clear docs.
5. Open a focused pull request explaining scope, testing, data exposure and release risks.

## Local development

```bash
npm ci
npm run build:contracts
npm run dev:api
# in another terminal
npm run dev:web
```

Useful checks include `npm test`, `npm run build:web`, `npm run test:e2e`, and `npm run audit:release`. Review the authoritative [CONTRIBUTING.md](https://github.com/AnkitParekh007/rebound-ops/blob/main/CONTRIBUTING.md) for the current full validation matrix.

## Commit signatures and CI

The main branch enforces **verified signed commits**, required status checks, CodeQL and squash merges. Configure your local Git with an SSH or GPG signing key registered on GitHub; check **Verified** before requesting merge. A connector-created commit attributed to you is **not automatically signed**. Never disable these checks solely to merge a docs change.

## Security and product integrity

Do not commit real CVs, participant data, application correspondence or API keys. Do not fabricate hiring scores, outcomes, achievements or job listings. Follow the [security policy](https://github.com/AnkitParekh007/rebound-ops/blob/main/SECURITY.md) and [contributor checklist](https://github.com/AnkitParekh007/rebound-ops/blob/main/CONTRIBUTING.md).

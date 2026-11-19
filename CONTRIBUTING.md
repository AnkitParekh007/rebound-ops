# Contributing to ReboundOps

Thank you for helping. ReboundOps is a small, local-first project, and focused contributions are easiest to review: a fix, a test, a platform report or a documentation improvement.

Not sure where to start, or want to talk an idea through first? Ask in [Discussions](https://github.com/AnkitParekh007/rebound-ops/discussions). By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). To report a security problem, follow [SECURITY.md](SECURITY.md) and do not open a public issue.

## Ground rules

- **Fictional data only.** Never paste a real resume, real contact details, recruiter emails, API keys or database files into an issue, a pull request, a test fixture or a screenshot. The fixtures in `tests/fixtures/` show the style to use.
- **Nothing invented.** ReboundOps must never fabricate employers, dates, skills, metrics, eligibility or posting details. Changes to drafting, extraction or AI features need tests that prove grounding still holds.
- **The user stays in control.** Do not add anything that submits applications, sends messages, or marks an application *Applied* without the user's explicit action.
- **Network use stays opt-in.** New network calls need consent, must use only documented public endpoints, and must respect rate limits and terms. Do not bypass logins, CAPTCHAs or anti-bot measures.
- **Original work.** Contribute only code, text and assets you wrote or that carry a compatible licence, and say where third-party material came from. See [docs/PROVENANCE.md](docs/PROVENANCE.md).
- **Dependencies.** Add one only when it is necessary. Pin the exact version, commit the lockfile change, and check the licence: `npm run audit:release` fails on unexpected licences.

## Setup

You need **Node.js 24 or newer** and **npm 11**. CI tests on Node 24; the repository's `.nvmrc` names Node 26, which is used for development.

```bash
git clone https://github.com/AnkitParekh007/rebound-ops.git
cd rebound-ops
npm ci
```

These commands were run from a fresh clone of `main` at `fc049c1` on macOS (Apple Silicon, Node 26.13.0, npm 11.20.0) on 2026-11-18. Each one passed:

```bash
npm ci
npm run lint
npm run typecheck
npm test            # 216 backend/API/integration tests and 33 Angular tests at that commit
npm run test:smoke
npm run build
```

## Run the app

Production-style, with one process (API plus the built web app):

```bash
npm run build
npm start           # http://127.0.0.1:4175, data in ~/.reboundops
```

For development, use two terminals:

```bash
npm run dev:api     # API on http://127.0.0.1:4175, data in ./.local-data (git-ignored)
```

```bash
npm run dev:web     # Angular dev server on http://127.0.0.1:4174, proxies /api to the API
```

To keep your own job-search data apart from development data, use `REBOUND_DATA_DIR` or the `dev:api` script, which writes to `./.local-data`.

## Before you open a pull request

Run the same checks as the first steps of CI:

```bash
npm run lint
npm run typecheck
npm test
npm run test:smoke
```

If you changed the UI, also run the browser journey. It needs Playwright's Chromium:

```bash
npx playwright install chromium
PW_CHANNEL=chromium npm run test:e2e
```

If you changed packaging, release scripts or dependencies, also run:

```bash
npm run build
npm run audit:release
```

CI (`.github/workflows/ci.yml`) runs two jobs on every pull request: **`verify`** (lint, typecheck, tests, smoke, build, packaged serving, export checks, the strict release audit, and building and verifying the release archive) and **`e2e`** (the Playwright journey against the dev server and the production build). Both must pass.

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Unit, storage, API, security and Angular component/accessibility tests |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript |
| `npm run test:smoke` | Starts the real server, writes data, restarts, checks persistence and packaged web serving |
| `npm run test:exports` | Reads generated PDF and DOCX back with independent macOS tools (skipped elsewhere) |
| `npm run test:e2e` | Playwright browser journey (installed Chrome by default; `PW_CHANNEL=chromium` in CI) |
| `npm run build` | Typecheck and production web build |
| `npm run restore -- <file> [--yes]` | Checks a backup, or with `--yes` restores it while ReboundOps is stopped |
| `npm run import:check -- <file>` | Validates an import file and shows what it would add; writes nothing |
| `npm run test:packaged` | Serves the production build from the real server; checks headers and the single-instance lock |
| `npm run audit:release` | Path, secret and licence checks, SBOM (`reports/sbom.json`), `npm audit`, CSP check of the build |
| `npm run package:release` | Builds the reproducible release archive, notices, SBOM and checksums in `release/` (publishes nothing) |
| `npm run verify:release` | Fresh install of the archive and an upgrade from the real v0.1.0 |

## Where things live

Business logic is in framework-free packages under `packages/`. The Fastify API is in `apps/api` and the Angular UI is in `apps/web`. The API contract is the zod schemas in `packages/contracts`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

- Package and API tests live in each package's `test/` folder (`*.test.ts`), Angular tests sit next to the components (`*.spec.ts`), and cross-package tests are in `tests/integration` and `tests/e2e`.
- Database changes are **append-only migrations** in `packages/storage/src/migrations.ts`. Never edit a released migration. Add a new one with a test that upgrades existing data.
- UI changes should keep the axe accessibility checks in `apps/web/src/app/a11y.spec.ts` passing, and add a check for any new view.

## Pull requests

- Keep each pull request to one change, and explain *why* in the description. The template asks for the checks you ran.
- Add or update tests with behaviour changes. Do not weaken an assertion to make a test pass.
- Update the docs when behaviour, commands or limitations change.
- Commit messages follow the existing style: a short imperative summary, with a prefix such as `Fix:`, `Docs:` or `CI:` where it helps.

## Good first contributions

Look for issues labelled [`good first issue`](https://github.com/AnkitParekh007/rebound-ops/labels/good%20first%20issue) or [`help wanted`](https://github.com/AnkitParekh007/rebound-ops/labels/help%20wanted). Platform reports are especially useful: Windows 11 and Intel macOS are not yet tested.

## Licence

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE) that covers this project.

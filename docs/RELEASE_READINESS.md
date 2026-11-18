# Release readiness — ReboundOps 0.1.0 (pre-release)

_Evidence collected 2026-11-18 on a local development machine (macOS, Node 26, npm 11)._
This report lists what was verified, how, and what is still outstanding. It does **not** approve a
release; owner approval is required for any push, tag or publication.

## Gate A — local verification

| Check | Command | Result |
| --- | --- | --- |
| Clean install | `npm ci` | ✅ pass (also from a fresh `git clone` of the committed tree) |
| Lint | `npm run lint` | ✅ no issues |
| Typecheck | `npm run typecheck` | ✅ pass (backend + Angular app + specs) |
| Unit / API / security / acceptance tests | `npm test` | ✅ 131 backend tests, 16 Angular tests |
| 13-step journey, AI off and AI on | `tests/integration/journey.test.ts` (part of `npm test`) | ✅ pass via real HTTP API + on-disk DB + restart |
| Persistence across restart + packaged serving | `npm run test:smoke` | ✅ pass |
| Production build | `npm run build` | ✅ 295 kB initial (≈79 kB compressed); no inline scripts |
| Independent export read-back | `npm run test:exports` | ✅ DOCX via macOS `textutil`, PDF via Apple PDFKit |
| Release audit | `npm run audit:release` | ✅ pass (notes below) |
| Accessibility (automated) | axe-core on 6 views + negative control | ✅ no violations (colour contrast not machine-checked) |
| **Browser E2E** | `npm run test:e2e` | ✅ pass in GitHub Actions (run 44278376925, commit 4e8c14f, 1 passed). Not runnable inside the development sandbox, where Chrome cannot launch |

### Audit notes

- Runtime dependencies: 0 known vulnerabilities.
- Development tooling: 18 high-severity advisories from one picomatch ReDoS advisory with no upstream fix. They are in build and test tools only and not shipped.
- MPL-2.0 is accepted only for dev tools (`lightningcss`, `axe-core`).
- SBOM: `reports/sbom.json` (generated, not committed).

## What is verified only with mocks

- **AI providers.** The Anthropic (official SDK), OpenAI, Gemini, OpenRouter and Ollama adapters are tested against mocked transports for request shape, auth headers, refusals and error mapping. **No live provider call has been made**, because that needs owner-supplied keys and may cost money.
- **Legacy data migration.** The importer is tested on synthetic files and on ReboundOps' own exports. **Real data from the previous application has not been migrated**; that needs a separately authorised export.

## Known limitations

- PDF resume *import* is not supported (DOCX, TXT, MD or paste only).
- PDF *export* uses standard fonts (WinAnsi); characters outside that set block PDF export with a clear message, and DOCX still works.
- Resume parsing and job extraction are heuristics, so everything they produce is shown for review and marked unverified or with its evidence.
- No live fetching of job postings (by design; postings stay unverified until you confirm them).
- Country detection covers about 60 countries.

## Originality and provenance

See [PROVENANCE.md](PROVENANCE.md). The audit checks the tree for legacy paths, secrets, symlinks and
submodules. Those checks cannot prove legal originality, and no similarity comparison with the
earlier implementation has been made.

## Gate B / Gate C — outstanding owner actions

1. Done: the owner approved the push and commits through 4e8c14f are on `origin/main`.
2. Done: GitHub Actions CI ran green on 4e8c14f (run 44278376925: `verify` and `e2e` jobs passed). The first two runs failed in the E2E spec (a render race and an ambiguous `Name` locator); both were test fixes, not product changes.
3. Decide on tagging or a release, and on live AI provider testing with your own keys.

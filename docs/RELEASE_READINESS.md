# Release readiness — ReboundOps 0.2.0 (pre-release, published)

_Merged to `main` (fast-forward) and tagged `v0.2.0` at commit `4e930db` on 2026-11-18. Published as a GitHub pre-release on 2026-11-18 with the CI-built archive attached._

## Verdict

**Published as a 0.2.0 pre-release with owner approval.** Every phase is implemented, every local gate
passes, and GitHub Actions CI is green on the branch and on `main` (see below). Live cloud-AI requests
are still untested (mocked only). The v0.1.0 pre-release is untouched.

## CI verification (GitHub Actions, 2026-11-18)

Run [44352872985](https://github.com/AnkitParekh007/rebound-ops/actions/runs/44352872985) on commit `0e06154`: **success**.

- `verify` job: `npm ci`, lint, typecheck, `npm test`, smoke, build, `test:packaged`, `test:exports`,
  `audit:release` (strict), `package:release` and `verify:release` (fresh install and real upgrade from the `v0.1.0` tag) all passed.
- `e2e` job: all six browser tests passed twice, against the Angular dev server and against the production
  build served by the API (`PW_PACKAGED=1`), including the five v0.2.0 tests.
- Artifacts: `release-candidate` and `sbom`.

The first CI run (44350531850 on `a5d179c`) failed two of the new browser tests. One was a test selector
that matched two text boxes. The other was a real bug: the API rejected a body-less `DELETE` carrying
`Content-Length: 0` with 415, so deleting (and undoing) contacts and reminders failed in the browser. Fixed in
`0e06154` with an API regression test; no assertion was weakened.

After the fast-forward merge, run [44354333918](https://github.com/AnkitParekh007/rebound-ops/actions/runs/44354333918)
on `main` at `4e930db` was also green (both jobs). Its `release-candidate` artifact is what the pre-release ships.

## Published release (checked 2026-11-18)

[v0.2.0](https://github.com/AnkitParekh007/rebound-ops/releases/tag/v0.2.0): marked pre-release, not a draft, on the
annotated tag `v0.2.0` → `4e930db`. The four attached files were downloaded from the public release URLs and pass
`shasum -a 256 -c SHA256SUMS`. `RELEASE-INFO.json` inside the archive names commit `4e930db`, and the archive holds no
`CLAUDE.md`, `.claude/`, `.env`, database, `graphify-out/` or `node_modules/` entries.

| File | Size | SHA-256 |
| --- | --- | --- |
| `reboundops-0.2.0.tar.gz` | 428,601 B | `e8e3eb6ce513f308a0e439cbbe7b2eeed17242bd7b71426e01a6bad23eff3ee4` |
| `THIRD_PARTY_NOTICES.txt` | 121,575 B | `833e81f79d1b6988042afaade43497f1e5a7303401ce17559db91bc5f28476ce` |
| `reboundops-0.2.0.sbom.json` | 15,310 B | `05e9ad7dda907150784551d4e9ce4ea0d439abf885b1eac766a64f514ec85d59` |
| `SHA256SUMS` | 273 B | checksums of the three files above |

## Local verification (actual results, 2026-11-18)

| Command | Result |
| --- | --- |
| `npm ci` | pass |
| `npm run lint` | pass (ESLint: no issues) |
| `npm run typecheck` | pass |
| `npm test` | pass — 216 backend/API/integration tests (24 files) and 33 Angular tests (10 files, including 12 axe accessibility checks and a negative control) |
| `npm run test:smoke` | pass — data survives an API restart; packaged web app served |
| `npm run build` | pass |
| `npm run test:packaged` | pass — production build served with CSP/nosniff/frame headers; a second process is refused by the lock |
| `npm run audit:release` | pass — runtime: 0 advisories; dev tooling: one reviewed, accepted advisory (picomatch GHSA-fc5q-39xc-vjpf, no fixed version exists) |
| `npm run test:exports` | pass — DOCX via macOS textutil, PDF via Apple PDFKit |
| `npm run test:e2e` | **not run locally**: Chrome cannot launch in the sandbox (`bootstrap_check_in … Permission denied`). Passed in CI in dev-server mode and against the packaged build (see above) |
| `npm run package:release` | pass — 138 files, 417 KB; byte-identical when rebuilt from the same commit |
| `npm run verify:release` | pass — checksums; fresh production install (no dev/optional packages) serves the app, imports a PDF, shuts down cleanly; the real v0.1.0 from its tag runs on schema 3, creates records and a backup, upgrades in place to schema 4 keeping applications, the original submission date, contacts, reminders and profile; this release restores the v0.1.0 backup |

Also checked live, with a locally installed Ollama model (`llama3.2:3b`, nothing downloaded, no cost):
the posting summary, missing-skills and interview-questions tasks ran in 2–8 s, and the grounding gate withheld a
suggested question that named a tool not in the records.

## Local release build (`release/`, git-ignored; from `0e06154`, superseded by the published CI build above)

| File | SHA-256 |
| --- | --- |
| `reboundops-0.2.0.tar.gz` | `3f6d8049300b3ce1aa030766d6d524453d15f58c5cae2aeb33f33722c7557bd0` |
| `THIRD_PARTY_NOTICES.txt` | `833e81f79d1b6988042afaade43497f1e5a7303401ce17559db91bc5f28476ce` |
| `reboundops-0.2.0.sbom.json` | `c216ff8cd98efac800a74d1f8335119a612e564421988e97f13214e4c28b18ab` |
| `SHA256SUMS` | checksums of the three files above |

The archive holds tracked source without tests or CI files, the prebuilt web app and `RELEASE-INFO.json`.
It contains no `CLAUDE.md`, `.claude/`, databases, `.env` files, `graphify-out/` or `node_modules/`, and the
packaging script refuses to build if it finds secrets or machine paths. CI rebuilds it and uploads it as a
workflow artifact.

## Backward compatibility

- Schema 3 → 4 migration is additive (two nullable columns, three new tables). It was tested against the
  real v0.1.0 binary and with hand-written schema-3 rows.
- v0.1.0 plain backups restore (CLI and in-app); v0.1.0 lock files (bare PID) are understood.
- Older records gain defaults on read (reminder priority/notes, profile seniority/pay/per-skill years). Nothing is rewritten.
- The fit rubric changed from `fit-2026.1` to `fit-2026.2`. Assessments are recomputed on demand and never stored, so scores can change after the upgrade.
- API: contact/reminder `DELETE` now returns `200` with an undo record instead of `204`.

## Security and licensing

- Restore stages and validates first, checks free space, journals the swap, and rolls back on failure;
  startup recovers an interrupted restore. The data-folder lock is O_EXCL, with stale-lock takeover.
- Protected backups use scrypt (N=2^17, r=8, p=1, random salt) with AES-256-GCM (random IV); the header is
  authenticated; wrong passwords and tampering leave no plaintext behind; passwords are never stored or logged.
- Job-board requests: https allowlisted hosts only, no credentials or cookies, a generic User-Agent, 15 s timeout,
  25 MB cap, one request per second per host, Retry-After respected, 30-minute cache. No network use without consent.
- AI tasks send only what each task needs (verified profile entries only) and withhold outputs that add facts.
  Cloud providers need per-request consent.
- New runtime dependency: `pdfjs-dist` 6.5.438 (Apache-2.0, pinned). Shipped packages: 71, all with declared
  licences reproduced in `THIRD_PARTY_NOTICES.txt`. MPL-2.0 is limited to dev-only tools (`lightningcss`, `axe-core`) that are not shipped.

## Known limitations

- Discovery covers one company board at a time; none of the providers offers cross-company search.
  Workday is not supported (no documented public API). Lever and Ashby do not return a company display name.
- The Workable integration uses the public feed behind Workable-hosted careers pages, not Workable's
  authenticated developer API. A change on Workable's side would surface as "board unavailable".
- PDF import reads selectable text only. There is no OCR. Multi-column layouts trigger a warning and may merge lines.
- Pay comparison needs the same currency and a stated period; hourly pay is never converted.
- Undo for deleted contacts and reminders lasts 30 days. Deleting a whole application is still permanent and is confirmed first.
- Cloud AI providers are tested with mocked transports only.
- No real legacy data has been migrated. See `docs/MIGRATION_SPEC.md`.
- Windows is untested. Intel macOS is expected to work but is not separately tested.

## Recommendation

1. Done: `feature/v0.2.0` pushed, CI green (run 44352872985), fast-forwarded into `main`, CI green on `main`
   (run 44354333918), tagged `v0.2.0` and published as a pre-release with the CI-built files.
2. Housekeeping: move CI actions off the deprecated Node 20 runtime (`checkout`, `setup-node`, `upload-artifact` v4)
   and pin the runner image before `ubuntu-latest` moves to Ubuntu 26.
3. Next release: OCR-free improvements to PDF layout handling, more official sources where documented
   APIs exist, an optional per-provider discovery schedule, and a separate authorised legacy export session.

---

# Release readiness — ReboundOps 0.1.0 (pre-release, published)

_Post-milestone audit, 2026-11-18, on a local development machine (macOS, Node 26, npm 11)._
This report lists what was checked, how, what was fixed, and what is still open. It does **not**
approve a release. Any push, tag or publication needs the owner's approval.

## Verdict

**GO for a 0.1.0 pre-release.** The local gates pass, and GitHub Actions CI run 44298999802 on
`f8b1f2d` is green (verify and e2e jobs), including the extended browser E2E journey; run
44299686574 on `d47d3a3` is also green. With the owner's approval, `d47d3a3` is tagged `v0.1.0` and
published as a GitHub pre-release. The limitations below stay as documented.

## Gate A — local verification

All rows were run from a **fresh `git clone` of the committed tree** (commit `ff979af`) unless noted.

| Check | Command | Result |
| --- | --- | --- |
| Clean install | `npm ci` | ✅ pass. npm 11 skipped 4 optional install scripts (`esbuild`, `lmdb`, `msgpackr-extract`, `@parcel/watcher`); the build works without them |
| Lint | `npm run lint` | ✅ no issues (exit 0) |
| Typecheck | `npm run typecheck` | ✅ pass (backend, Angular app, specs) |
| Unit, API, security, integration tests | `npm test` | ✅ 139 backend tests, 18 Angular tests |
| 13-step journey, AI off and AI on | `tests/integration/journey.test.ts` | ✅ pass through the real HTTP API, an on-disk database and a restart |
| Backup, restore, import rollback | `tests/integration/backup-restore.test.ts` | ✅ pass (full round trip, 6 kinds of bad backup refused, lock enforced, failed import leaves nothing behind) |
| Persistence across restart, packaged serving | `npm run test:smoke` | ✅ pass |
| Production build | `npm run build` | ✅ pass; no inline scripts |
| Independent export read-back | `npm run test:exports` | ✅ DOCX via macOS `textutil`, PDF via Apple PDFKit |
| Release audit | `npm run audit:release` | ✅ pass (notes below) |
| Production start | `npm start` from the fresh clone | ✅ health OK, web app served with a strict CSP, data folder 0700, database 0600, lock released on shutdown |
| Accessibility (automated) | axe-core on 8 views + a negative control | ✅ no violations. Colour contrast is checked separately against the design tokens (all text pairs ≥ 4.5:1 in both themes) |
| **Browser E2E** | `npm run test:e2e` | ✅ The extended spec passed in GitHub Actions (run 44298999802 on `f8b1f2d`, run 44299686574 on `d47d3a3`). It runs only in CI, because Chrome cannot start in the development sandbox |
| Real local AI | one rewrite through the API with an already-installed Ollama model (`llama3.2:3b`) | ✅ grounded suggestion returned and accepted (manual run, 2026-11-18) |

### Audit notes

- Runtime dependencies: **0** known vulnerabilities (`npm audit --omit=dev`). The release audit fails on any runtime high or critical advisory.
- Development tooling: 18 high-severity entries, all from one `picomatch` ReDoS advisory (GHSA-fc5q-39xc-vjpf, ≤ 4.0.7). No patched release exists. It is reachable only through build and test tools (Angular CLI, Vite, Vitest, typescript-eslint) given glob patterns written by the developer, and nothing in the shipped app uses it. **Accepted** until upstream fixes it.
- Licences: the runtime is MIT, ISC, BSD and Apache-2.0. MPL-2.0 is allowed only for dev tools (`lightningcss`, `axe-core`), which are not redistributed. The production web build writes `apps/web/dist/3rdpartylicenses.txt`.
- SBOM: `reports/sbom.json` (generated, not committed).
- If `npm audit` cannot reach the registry, the release audit still passes and reports vulnerability status as unknown.

## Defect backlog from this audit

Ordered by severity. "Fixed" means it was changed, tested and committed locally.

| # | Severity | Finding | Status |
| --- | --- | --- | --- |
| D1 | High | No lossless backup. The "full export" left out drafts, screening answers and resume originals, and importing an export was the only restore path, which loses even more. | **Fixed** `f63419a`: whole-database backup (`GET /api/backup`, Settings → Download a backup) and `npm run restore`, which validates the file, refuses while the app runs, and keeps the replaced database |
| D2 | High (accessibility) | Status pills failed WCAG AA contrast in dark mode (2.1–3.2:1) and in light mode for several statuses (2.6–4.4:1). Muted text was 3.9–4.3:1 on the page background. | **Fixed** `ff979af`: retuned tokens, every pair ≥ 4.5:1 in both themes |
| D3 | Medium | Two servers could open the same data folder. Startup failures (port in use) printed raw stack traces. | **Fixed** `f63419a`: data-folder lock and clear one-line messages |
| D4 | Medium | Another website could link to `/api/export` or `/api/backup` and trigger a download of your data onto your own disk. It could not read the data. | **Fixed** `58366be`: API refuses `Sec-Fetch-Site: cross-site` requests |
| D5 | Medium | AI timeouts and offline errors were reported vaguely ("Anthropic error.") and had no tests. | **Fixed** `e291254`, with tests for timeouts, consent withdrawal and AI off |
| D6 | Medium (test gap) | The browser E2E did not cover draft edits, DOCX, screening answers, the official link, contacts, reminders, follow-ups, reload persistence or duplicate detection. axe did not cover the overview or the tracking panel. | **Fixed in code** `ff979af`. The axe checks pass. The E2E additions passed in CI run 44298999802 |
| D7 | Low | Docs and UI called the JSON export "full". | **Fixed** `f63419a` and this update |
| D8 | Low | The fictional resume used a realistic-looking phone number. | **Fixed** `4842e63` |
| D9 | Low | There was no way to check a legacy export file without a database, and no written procedure. | **Fixed** `0401a20`: `npm run import:check` and [LEGACY_EXPORT_PROCEDURE.md](LEGACY_EXPORT_PROCEDURE.md) |
| D10 | High | Duplicate detection missed the same posting saved again **without its URL**, from a **different site**, or with the location typed differently (found by the extended E2E in CI run 44286231135). | **Fixed**: several signals (same posting URL, same employer and title, same description), each reported with its reason; "Save anyway" stays available |
| O1 | Medium | The extended E2E had not run. | **Closed**: green in CI run 44298999802 on `f8b1f2d` |
| O2 | Low | Dev-tooling `picomatch` advisory. | **Open, accepted** (no upstream fix, not shipped) |
| O3 | Low | Backups are not encrypted. | **Open**, documented in Settings ("keep it somewhere private") |
| O4 | Low | Rejected or withdrawn can only reopen to Shortlisted. Marking Applied again replaces the original submission date. | **Open** |
| O5 | Low | Deleting a contact or reminder has no confirmation or undo. | **Open** |
| O6 | Low | Restore is command-line only; there is no in-app restore. | **Open** (by design: the app must be stopped) |

## Feature verification (post-milestone audit)

| Area | How it was verified | Result |
| --- | --- | --- |
| Onboarding, skip, back/next, AI mode | Integration journey, Angular tests, E2E (CI, earlier spec) | ✅ |
| Resume import and fact verification | API tests, integration journey, E2E | ✅ |
| Job intake, evidence, unverified label, duplicates | API tests (URL, missing URL, other URL, edited location, same description, save anyway), importer tests; E2E duplicate step | ✅ |
| Fit 0–5 rubric and eligibility statuses | Deterministic unit tests, integration journey, E2E | ✅ |
| Tailored resume and cover letter, editing | API tests, integration journey; E2E edit step added | ✅ |
| PDF and DOCX export with content checks | Unit tests, integration journey, independent macOS read-back, E2E PDF | ✅ |
| Screening answers, official link, review | API and unit tests; E2E steps added | ✅ |
| Tracker transitions and confirmed Applied | Unit, API, E2E | ✅ |
| Contacts, reminders, follow-up drafts (never sent) | API and Angular tests; E2E steps added | ✅ |
| Analytics and persistence after restart | Smoke restart, integration journey, E2E reload | ✅ |
| Backup, restore, interrupted import, invalid files | New integration tests, manual CLI run against the packaged server | ✅ |
| AI on and off | Both journeys; one real local Ollama inference; cloud adapters mocked | ✅ (cloud live pending) |

## AI providers

- **Ollama**: loopback-only base URL, non-streaming `/api/chat`, 60 s timeout. One real inference ran against an already-installed local model; the grounding gate accepted the rewording, which kept both numbers.
- **Anthropic** (official SDK 1.10.0): pinned base URL, `claude-opus-5-5` by default, low effort, server-side refusal fallback, typed error mapping (key, rate limit, timeout, offline). Mocked only.
- **OpenAI, Gemini, OpenRouter**: documented REST shapes, keys only from the environment, refusal and safety-block handling. Mocked only.
- Consent: a cloud provider needs recorded consent plus a confirmation on every request. Withdrawing consent or turning AI off stops all calls (tested). Only the selected text is sent, never the profile or the job description (tested).
- **Live cloud calls are pending** the owner's keys and approval, since they may cost money.

## Data migration

The importer, preview, duplicate detection, single-transaction commit, no-overwrite rules and
rollback are tested on synthetic data. **No real legacy data has been migrated.** The read-only
procedure is in [LEGACY_EXPORT_PROCEDURE.md](LEGACY_EXPORT_PROCEDURE.md). It needs a separately
authorised session with access to the earlier version's data.

## Originality and provenance

See [PROVENANCE.md](PROVENANCE.md). The tracked tree (126 files) was checked for legacy paths,
secrets, symlinks, submodules, personal data and local-only files (`CLAUDE.md`, editor settings,
the code graph), and none were found. These checks **cannot prove legal originality**, and **no
similarity comparison** with the earlier implementation has been made, because that source is
deliberately not accessed. The `LICENSE` names the repository owner as copyright holder for
first-party code. No ownership of third-party components is claimed.

## Gate B / Gate C — owner actions

1. ✅ Audit commits pushed with approval; GitHub Actions green on the latest commit, including the extended E2E.
2. ✅ Tagged `v0.1.0` (on `d47d3a3`) and published as a GitHub pre-release with approval.
3. Optionally authorise live cloud AI testing with your own keys, and a separate session for exporting real legacy data.

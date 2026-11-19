# Contributor issues and labels: review draft

**Status: applied by the owner on 2026-11-18.** All nine labels exist and the eight issues are open as #4–#11 (checked 2026-11-19). Before that, the repository had no issues and 10 labels: the nine GitHub defaults plus `accessibility`.

Every issue below comes from a limitation or plan documented in `docs/RELEASE_READINESS.md`, `docs/INSTALL.md`, the README or the code. None describes an invented defect.

## Label set

Keep the existing labels (`bug`, `documentation`, `duplicate`, `enhancement`, `good first issue`, `help wanted`, `invalid`, `question`, `wontfix`, `accessibility`). Add these:

| Label | Colour | Description | Used by |
| --- | --- | --- | --- |
| `needs-triage` | `fbca04` | New issue, not yet reviewed by a maintainer | issue forms |
| `dependencies` | `0366d6` | Dependency updates | Dependabot, issue 8 |
| `ci` | `1e2430` | Continuous integration and workflows | Dependabot (actions), issue 4 |
| `platform` | `5319e7` | Operating-system support and testing | issues 3, 4, 5 |
| `testing` | `c2e0c6` | Tests, test coverage or test reports | issues 1, 3, 5 |
| `security` | `b60205` | Security hardening (vulnerabilities are reported privately) | issue 8 |
| `import` | `1d6b52` | Resume and data import | issue 6 |
| `discover` | `0b6674` | Job-board discovery | issue 7 |
| `ai` | `6c43a6` | Optional AI providers and assist tasks | none yet |

```bash
R=AnkitParekh007/rebound-ops
gh label create needs-triage --repo $R --color fbca04 --description "New issue, not yet reviewed by a maintainer"
gh label create dependencies --repo $R --color 0366d6 --description "Dependency updates"
gh label create ci           --repo $R --color 1e2430 --description "Continuous integration and workflows"
gh label create platform     --repo $R --color 5319e7 --description "Operating-system support and testing"
gh label create testing      --repo $R --color c2e0c6 --description "Tests, test coverage or test reports"
gh label create security     --repo $R --color b60205 --description "Security hardening (vulnerabilities are reported privately)"
gh label create import       --repo $R --color 1d6b52 --description "Resume and data import"
gh label create discover     --repo $R --color 0b6674 --description "Job-board discovery"
gh label create ai           --repo $R --color 6c43a6 --description "Optional AI providers and assist tasks"
```

## Issues

| # | Title | Difficulty | Labels | Source of the need |
| --- | --- | --- | --- | --- |
| 1 | Add axe checks for the application detail page and a populated tracker | easy | accessibility, testing, good first issue | `a11y.spec.ts` covers the tracker's empty state only |
| 2 | Add README screenshots captured from fictional fixture data | easy–medium | documentation, good first issue, help wanted | README placeholder |
| 3 | Windows 11: run the test suite and the app, and report results | easy (needs Windows) | platform, testing, help wanted | INSTALL: "Windows 11 — Not tested" |
| 4 | CI: add a non-blocking Windows and macOS job | medium | ci, platform, help wanted | CI is Ubuntu only |
| 5 | Intel macOS: run verify:release and report results | easy (needs an Intel Mac) | platform, testing, good first issue, help wanted | INSTALL: "not separately tested" |
| 6 | PDF import: keep multi-column layouts in reading order without OCR | hard | enhancement, import, help wanted | the multi-column warning; next-release plan |
| 7 | Discover: optional per-board schedule, with the same consent and rate limits | hard | enhancement, discover | next-release plan |
| 8 | Remove the accepted picomatch advisory once a fixed version exists | easy | dependencies, security, good first issue | `scripts/audit-accepted.json` |

The full bodies, with files, acceptance criteria and verification steps, are in [`issues/`](issues/).

### Create them (after the labels exist)

Run from the repository root on a branch that contains `docs/community/issues/`:

```bash
R=AnkitParekh007/rebound-ops
gh issue create --repo $R --title "Add axe checks for the application detail page and a populated tracker" --label accessibility --label testing --label "good first issue" --body-file docs/community/issues/01-a11y-application-and-tracker.md
gh issue create --repo $R --title "Add README screenshots captured from fictional fixture data" --label documentation --label "good first issue" --label "help wanted" --body-file docs/community/issues/02-readme-screenshots.md
gh issue create --repo $R --title "Windows 11: run the test suite and the app, and report results" --label platform --label testing --label "help wanted" --body-file docs/community/issues/03-windows-11-report.md
gh issue create --repo $R --title "CI: add a non-blocking Windows and macOS job" --label ci --label platform --label "help wanted" --body-file docs/community/issues/04-cross-platform-ci.md
gh issue create --repo $R --title "Intel macOS: run verify:release and report results" --label platform --label testing --label "good first issue" --label "help wanted" --body-file docs/community/issues/05-intel-macos-report.md
gh issue create --repo $R --title "PDF import: keep multi-column layouts in reading order without OCR" --label enhancement --label import --label "help wanted" --body-file docs/community/issues/06-pdf-multi-column.md
gh issue create --repo $R --title "Discover: optional per-board schedule, with the same consent and rate limits" --label enhancement --label discover --body-file docs/community/issues/07-discovery-schedule.md
gh issue create --repo $R --title "Remove the accepted picomatch advisory once a fixed version exists" --label dependencies --label security --label "good first issue" --body-file docs/community/issues/08-picomatch-advisory.md
```

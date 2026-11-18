# GitHub community readiness report

_Prepared 2026-11-18 on branch `chore/github-community-launch`, cut from `main` at `fc049c1`. Local commits only: nothing has been pushed, and no GitHub setting, label, issue, Discussion or Wiki page has been changed._

## Verdict

**Ready for owner review.** The repository files (README, community health files, issue forms, PR template, Dependabot config, architecture guide, Wiki generator) are complete and pass the local gates below. Every remote change is written as an exact command in the [owner-approval checklist](#owner-approval-checklist). None has been run.

What remains open:

- **Homepage domain** is unconfirmed. Neither `rebound-orgs.org` nor `rebound-ops.org` resolved.
- **README screenshots** don't exist yet. The README says so, and issue 2 is drafted to add them from fictional data.
- **Brand alignment:** the GitHub art follows the marketing site's identity, which is still uncommitted on `feature/marketing-site-v1`, while the app UI uses a green and serif identity. This is an owner decision; see [BRAND.md](BRAND.md#note-on-the-apps-own-identity).
- **Mermaid diagrams** (README and `docs/ARCHITECTURE.md`) were checked by reading only. No Mermaid renderer was available locally, so check them in the PR's rich diff on GitHub.

## Live GitHub state (checked 2026-11-18)

Checked with 9 unauthenticated read-only REST calls (`/repos/…`, labels, issues, releases, rulesets, `branches/main`, `community/profile`, pages, tags), plus public HTML pages. No authenticated or write request was made.

| Item | Live state | Prepared here |
| --- | --- | --- |
| Description | **empty** | Draft text and `gh` command ([GITHUB_SETTINGS.md](GITHUB_SETTINGS.md#1-about-panel)) |
| Topics | **none** | 16 topics, validated against GitHub's format and count limits |
| Homepage | **empty** | Pending domain confirmation |
| Social preview | GitHub's auto-generated card | `docs/assets/brand/social-preview.png` (1280×640, 109 KB) |
| Releases | v0.2.0 pre-release (4 assets: archive, SBOM, notices, `SHA256SUMS`) and v0.1.0 pre-release (no assets), both published | The README now links the published v0.2.0. It used to say "not yet published" |
| Tags | `v0.2.0` → `4e930db`, `v0.1.0` → `d47d3a3` | Tag ruleset drafted |
| Discussions | **off** (`has_discussions: false`; `/discussions` returns 404) | Categories, guidelines and five posts ([DISCUSSIONS.md](DISCUSSIONS.md)) |
| Wiki | enabled, **no pages** (`/wiki` redirects to the repository page) | Generator, 10 pages and a sidebar, with a no-overwrite sync |
| Pages | not enabled (404) | none |
| Branch protection on `main` | **none** (`protected: false`) | Ruleset requiring `verify` and `e2e` |
| Rulesets | **none** (`[]`) | Branch and tag rulesets |
| Labels | 9 GitHub defaults plus `accessibility` | 9 new labels ([ISSUES.md](ISSUES.md#label-set)) |
| Issues and PRs | none | 8 contributor issues drafted |
| Community profile | 28%: README and LICENSE only | CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, SUPPORT, issue forms and PR template added (these count once merged) |
| Licence | MIT (detected by GitHub; `LICENSE` reads "MIT License, Copyright (c) 2026 Ankit Parekh") | The README states MIT after checking `LICENSE` |
| CI badge (`main`) | passing | used in the README |

Not visible without authentication, so not checked: security and analysis settings (secret scanning, push protection, Dependabot alerts, private vulnerability reporting), Actions permissions, merge settings. The checklist commands set them explicitly, so their current values don't matter.

## What was prepared

| Area | Files |
| --- | --- |
| Landing page | `README.md`: banner (light and dark), badges for licence, latest release, CI and Node, then why, differentiators, features, how it works, install, platforms, privacy and AI, architecture, limitations, contributing, roadmap, docs, support and licence. No Wiki or Discussions links, because neither works yet |
| Community health | `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (original text), `SECURITY.md` (private reporting), `SUPPORT.md`, `ROADMAP.md`, `CHANGELOG.md` (v0.1.0 and v0.2.0 only, from the published notes) |
| Templates | `.github/ISSUE_TEMPLATE/{bug_report,feature_request,documentation,config}.yml`, `.github/PULL_REQUEST_TEMPLATE.md` |
| Maintenance | `.github/dependabot.yml` (npm and actions, weekly, grouped). `.github/workflows/ci.yml` is **unchanged** |
| Docs | `docs/ARCHITECTURE.md` (diagrams from the actual `package.json` dependencies) |
| Wiki | `scripts/community/build-wiki.ts`, `scripts/community/sync-wiki.sh`, `docs/community/wiki/*.md`, `tests/integration/wiki-build.test.ts` |
| Drafts | `docs/community/{GITHUB_SETTINGS,DISCUSSIONS,ISSUES,BRAND,LAUNCH_KIT}.md`, `docs/community/issues/*.md` |
| Brand | `docs/assets/brand/*` (original SVGs and one PNG) and `scripts/community/svg2png.swift` |
| Tooling | `scripts/community/check-issue-forms.rb` (issue-form syntax rules) |

## Quality gates (actual results)

| Gate | Result |
| --- | --- |
| Clean-clone setup (fresh clone of `main` at `fc049c1`; Node 26.13.0, npm 11.20.0) | `npm ci`, `lint`, `typecheck`, `npm test` (216 + 33 tests), `test:smoke` and `build` all pass. These are the commands in CONTRIBUTING |
| Template YAML | All 4 issue forms, `dependabot.yml` and `ci.yml` parse (Ruby Psych). The issue forms pass `scripts/community/check-issue-forms.rb`: valid types, unique ids and labels, non-empty options, no reserved `None` |
| Local links and media | 25 Markdown files: every relative link, image, `srcset` and `#anchor` resolves (GitHub slug rules). Code fences are balanced and table columns are consistent |
| External links | 19 URLs fetched. All return 200, except `blob/main/CODE_OF_CONDUCT.md` and `blob/main/SECURITY.md` (404 until this branch is merged) and `issues/new?template=…` (redirects to sign-in when anonymous, which is expected) |
| Badges | shields.io returns "MIT" and "v0.2.0"; the Actions badge returns "passing"; the Node badge reads "≥ 24" |
| Claims vs. sources | Every product claim was checked against `docs/RELEASE_READINESS.md`, `docs/INSTALL.md`, the published release notes or the code. For example: Ollama must be on loopback (`ollamaBaseUrl` in `packages/ai-providers`), only `job-sources` and `ai-providers` make outbound requests, the HTTP limits are in `http.ts`, eligibility rules are in `assess.ts`, and axe coverage is in `a11y.spec.ts`. Corrections made during review: `.nvmrc` names Node 26, not 24; tests live in each package's `test/` folder; axe covers 11 views plus a negative control |
| Secrets and personal data | Changed files scanned for absolute paths, emails, tokens and keys, legacy paths, and local-only names: no hits, except SVG coordinates that look like phone numbers (false positives). The PNG's metadata chunks were stripped (its EXIF held only the pixel size). Local-only instruction and tooling files are not tracked |
| Inherited assets | none. All art is original vector drawing, fonts are not committed, and no third-party logos are used |
| App gates (non-docs files changed) | see [App gates](#app-gates) |

### App gates

Run on this branch at `e2d33eb`, in the worktree, on macOS (Apple Silicon, Node 26.13.0). The files outside `docs/` that changed are the `.github` templates, `dependabot.yml`, `scripts/community/*` and one new test.

| Command | Result |
| --- | --- |
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm test` | pass: 220 backend, API and integration tests (25 files: the previous 216, plus 4 new Wiki-build tests) and 33 Angular tests (10 files) |
| `npm run test:smoke` | pass |
| `npm run build` | pass |
| `REBOUND_AUDIT_STRICT=1 npm run audit:release` | pass (paths, secrets, licences, SBOM, `npm audit`, CSP) |
| `npm run test:packaged` | pass |
| `npm run package:release -- --skip-build` | pass. 172 files, 558 KB (v0.2.0: 138 files, 417 KB). The increase is the new tracked docs and brand files, which the archive includes because it packages tracked source |
| `npm run verify:release` | pass: fresh install, and the upgrade from the real v0.1.0 |
| `npm run test:e2e` | **not run locally**: Chrome cannot launch in this sandbox. No UI code changed. CI runs it on the PR |

`.github/workflows/ci.yml` is byte-for-byte unchanged (`git diff main -- .github/workflows` is empty).

**Follow-up suggestion (not done here):** exclude `docs/community/` and `scripts/community/` from the release archive in `scripts/package-release.ts`, because launch drafts don't belong in an end-user download. That changes a release script, so it should be a separate, reviewed PR.

## Owner-approval checklist

Run these in order, only after approving each step. `R=AnkitParekh007/rebound-ops`.

**1. Push the branch and open a PR.** A push to `chore/**` does not trigger CI; the pull request does.

```bash
git -c lfs.locksverify=false push origin chore/github-community-launch
```

```bash
gh pr create --repo AnkitParekh007/rebound-ops --base main --head chore/github-community-launch --title "Community: README, health files, templates, Dependabot and launch drafts" --body-file docs/community/READINESS.md
```

Merge only when `verify` and `e2e` are green.

**2. Labels** (before Dependabot and the issue forms are used): the nine `gh label create` commands in [ISSUES.md](ISSUES.md#label-set).

**3. About panel:** the `gh repo edit … --description … --add-topic …` command in [GITHUB_SETTINGS.md](GITHUB_SETTINGS.md#apply).

**4. Social preview:** upload `docs/assets/brand/social-preview.png` in **Settings → General → Social preview**. This is UI only; there is no API.

**5. Security settings:**

```bash
gh api -X PUT repos/AnkitParekh007/rebound-ops/private-vulnerability-reporting
gh api -X PUT repos/AnkitParekh007/rebound-ops/vulnerability-alerts
gh api -X PUT repos/AnkitParekh007/rebound-ops/automated-security-fixes
printf '%s' '{"security_and_analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}' | gh api -X PATCH repos/AnkitParekh007/rebound-ops --input -
gh api -X PATCH repos/AnkitParekh007/rebound-ops/code-scanning/default-setup -f state=configured -f query_suite=default
gh api -X PUT repos/AnkitParekh007/rebound-ops/actions/permissions/workflow -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false
gh api -X PUT repos/AnkitParekh007/rebound-ops/actions/permissions -F enabled=true -f allowed_actions=selected
gh api -X PUT repos/AnkitParekh007/rebound-ops/actions/permissions/selected-actions -F github_owned_allowed=true -F verified_allowed=false
```

**6. Rulesets** (after step 1 is merged, so `verify` and `e2e` have run on `main`): save the two JSON documents from [GITHUB_SETTINGS.md](GITHUB_SETTINGS.md#branch-ruleset-for-main-live-state-no-protection-no-rulesets) as `ruleset-main.json` and `ruleset-tags.json` outside the repository, then:

```bash
gh api -X POST repos/AnkitParekh007/rebound-ops/rulesets --input ruleset-main.json
gh api -X POST repos/AnkitParekh007/rebound-ops/rulesets --input ruleset-tags.json
```

After this, `main` changes only through pull requests.

**7. Merge settings (optional):**

```bash
gh repo edit AnkitParekh007/rebound-ops --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false --delete-branch-on-merge
```

**8. Contributor issues:** the eight `gh issue create` commands in [ISSUES.md](ISSUES.md#create-them-after-the-labels-exist), run from a checkout of the merged `main`.

**9. Discussions** (only if you can check it weekly):

```bash
gh repo edit AnkitParekh007/rebound-ops --enable-discussions
```

Then set up the categories in the UI, post and pin the guidelines and the five drafts ([DISCUSSIONS.md](DISCUSSIONS.md#posting-the-drafts-after-approval)), and add the Discussions links to `SUPPORT.md` and `config.yml` in a follow-up PR.

**10. Wiki:** create any first page in the web UI (GitHub creates the Wiki repository only then), then run:

```bash
scripts/community/sync-wiki.sh
```

It asks before pushing, and never overwrites a page that it didn't generate. Then add a Wiki link to the README in a follow-up PR.

**11. Homepage**, once the domain serves the site over HTTPS:

```bash
gh repo edit AnkitParekh007/rebound-ops --homepage "https://<confirmed-domain>"
```

**12. Launch posts:** each draft in [LAUNCH_KIT.md](LAUNCH_KIT.md), posted by you from your own accounts. Wait for the screenshots and the homepage first.

**13. Optional (owner decision):** turn off Projects (`gh repo edit AnkitParekh007/rebound-ops --enable-projects=false`); add a tag-triggered `release.yml` with artifact attestations; pin actions to SHAs in a separate PR.

# GitHub settings: review draft

**Status: applied by the owner on 2026-11-18, except the homepage (no domain yet) and turning off Projects.** See [READINESS.md](READINESS.md#status-after-the-owner-run-2026-11-19) for what was confirmed afterwards. Every command below changes the live repository. The `gh` commands assume `gh auth login` as the repository owner, run from any directory.

The live state was checked on 2026-11-18 with unauthenticated read-only API calls. See [READINESS.md](READINESS.md#live-github-state-checked-2026-11-18).

## 1. About panel

### Description

Suggested text, checked for accuracy (146 characters; GitHub allows 350):

> Open-source, local-first job search assistant. Discover jobs, assess fit, tailor resumes, and track applications. Private by default; AI optional.

Accuracy notes:

- "Discover jobs" is accurate as the name of the feature. Discover covers one company's public board at a time, on Greenhouse, Lever, Ashby or Workable; there is no cross-company search. The README states this.
- "Private by default" is accurate: nothing leaves the machine unless you use Discover or a cloud AI provider, and both need consent.
- "AI optional" is accurate: every feature works with AI off.

### Topics

16 topics (GitHub allows 20, each lowercase letters, digits and hyphens, up to 50 characters; all were checked):

`job-search` `job-tracker` `job-application-tracker` `resume` `cover-letter` `ats` `local-first` `privacy` `self-hosted` `offline-first` `ollama` `angular` `fastify` `typescript` `sqlite` `nodejs`

`offline-first` holds because only Discover and cloud AI use the network after installation. `ats` refers to the ATS-friendly PDF and DOCX exports; ReboundOps does not integrate with any ATS.

### Apply

```bash
gh repo edit AnkitParekh007/rebound-ops \
  --description "Open-source, local-first job search assistant. Discover jobs, assess fit, tailor resumes, and track applications. Private by default; AI optional." \
  --add-topic job-search --add-topic job-tracker --add-topic job-application-tracker \
  --add-topic resume --add-topic cover-letter --add-topic ats \
  --add-topic local-first --add-topic privacy --add-topic self-hosted --add-topic offline-first \
  --add-topic ollama --add-topic angular --add-topic fastify --add-topic typescript \
  --add-topic sqlite --add-topic nodejs
```

### Homepage

**Pending domain confirmation.** Neither `rebound-orgs.org` nor `rebound-ops.org` resolved when this was prepared, and the marketing site is being built on another branch. Leave the homepage empty until a domain serves the site over HTTPS. Then run:

```bash
gh repo edit AnkitParekh007/rebound-ops --homepage "https://<confirmed-domain>"
```

### Social preview

Upload [`docs/assets/brand/social-preview.png`](../assets/brand/social-preview.png) (1280×640 PNG, about 109 KB; GitHub requires under 1 MB). There is no API for this. Use **Settings → General → Social preview → Edit → Upload an image**. GitHub currently shows its auto-generated card.

## 2. Features

| Setting | Live state | Recommendation | Command |
| --- | --- | --- | --- |
| Issues | on | keep | none |
| Discussions | **off** | enable after the categories and first posts are reviewed ([DISCUSSIONS.md](DISCUSSIONS.md)) | `gh repo edit AnkitParekh007/rebound-ops --enable-discussions` |
| Wiki | on, **no pages** | create the first page in the UI, then run [`scripts/community/sync-wiki.sh`](../../scripts/community/sync-wiki.sh) | none (already enabled) |
| Projects | on, unused | turn off to reduce clutter, unless you plan to use a board | `gh repo edit AnkitParekh007/rebound-ops --enable-projects=false` |
| Merge methods | not checked | squash only, so `main` keeps one commit per change | `gh repo edit AnkitParekh007/rebound-ops --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false --delete-branch-on-merge` |

## 3. Security and maintainability

### Branch ruleset for `main` (live state: no protection, no rulesets)

The ruleset blocks force-pushes and deletion of `main`, requires changes through a pull request, and requires the two CI jobs, **`verify`** and **`e2e`**, to pass on an up-to-date branch. `ci.yml` is not changed. The job names are the check names. `integration_id` 15368 is the GitHub Actions app, which pins the checks to Actions so that another app cannot report them.

Because there is one maintainer, the ruleset requires **zero** approving reviews: you cannot approve your own pull request. Add reviewers when there is a second maintainer.

Save as `ruleset-main.json` (outside the repository) and apply:

```json
{
  "name": "Protect main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "verify", "integration_id": 15368 },
          { "context": "e2e", "integration_id": 15368 }
        ]
      }
    }
  ]
}
```

```bash
gh api -X POST repos/AnkitParekh007/rebound-ops/rulesets --input ruleset-main.json
```

**Effect on your workflow:** after this, `main` changes only through pull requests, so the local fast-forward-and-push pattern used for v0.2.0 stops working. Open a PR from each branch instead (`gh pr create`). To keep direct pushes, remove the `pull_request` rule and keep the other three.

### Tag ruleset for releases

This stops a published release tag from being moved or deleted:

```json
{
  "name": "Protect release tags",
  "target": "tag",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
  "bypass_actors": [],
  "rules": [ { "type": "deletion" }, { "type": "non_fast_forward" }, { "type": "update" } ]
}
```

```bash
gh api -X POST repos/AnkitParekh007/rebound-ops/rulesets --input ruleset-tags.json
```

Creating new `v*` tags still works.

### Dependabot

- **Version updates:** `.github/dependabot.yml` is added on this branch: npm and GitHub Actions, weekly, grouped, at most five npm PRs at a time. Each PR must pass `verify` and `e2e`, including the strict licence and secret audit. It takes effect when merged to `main`. Create the `dependencies` and `ci` labels first (see [ISSUES.md](ISSUES.md#label-set)).
- **Alerts and security updates** are repository settings:

```bash
gh api -X PUT repos/AnkitParekh007/rebound-ops/vulnerability-alerts
gh api -X PUT repos/AnkitParekh007/rebound-ops/automated-security-fixes
```

### Secret scanning, push protection and private reporting

Secret scanning is on by default for public repositories. Push protection stops a commit that contains a recognised secret. Private vulnerability reporting enables the **Report a vulnerability** button that [SECURITY.md](../../SECURITY.md) relies on.

```bash
printf '%s' '{"security_and_analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}' \
  | gh api -X PATCH repos/AnkitParekh007/rebound-ops --input -
gh api -X PUT repos/AnkitParekh007/rebound-ops/private-vulnerability-reporting
```

### CodeQL

**Suitable, and recommended through default setup.** The code is TypeScript and JavaScript, which CodeQL supports, and it is free for public repositories. Default setup adds no workflow file, so `ci.yml` stays as it is. It also covers the `actions` language, which checks workflow files.

```bash
gh api -X PATCH repos/AnkitParekh007/rebound-ops/code-scanning/default-setup \
  -f state=configured -f query_suite=default
```

The first analysis may report alerts. Review them before adding CodeQL as a required check.

### Least-privilege Actions

- `ci.yml` already declares `permissions: contents: read` at the top level, and its jobs need nothing more. No change is needed.
- Set the repository default for workflow tokens to read-only, and stop workflows from approving pull requests:

```bash
gh api -X PUT repos/AnkitParekh007/rebound-ops/actions/permissions/workflow \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false
```

- Allow only GitHub-owned actions; `ci.yml` uses only `actions/checkout`, `actions/setup-node` and `actions/upload-artifact`:

```bash
gh api -X PUT repos/AnkitParekh007/rebound-ops/actions/permissions -F enabled=true -f allowed_actions=selected
gh api -X PUT repos/AnkitParekh007/rebound-ops/actions/permissions/selected-actions -F github_owned_allowed=true -F verified_allowed=false
```

- Optional hardening for a later PR: pin each action to a full commit SHA, with the version in a comment. Dependabot keeps SHA pins up to date. This changes `ci.yml`, so it should be its own reviewed PR with a green CI run.

### Release integrity

What already exists: CI builds the archive reproducibly (byte-identical from the same commit), publishes `SHA256SUMS`, an SBOM and third-party notices, and `verify:release` checks a fresh install and the upgrade from v0.1.0.

Recommended next steps, each as its own reviewed change:

1. Protect `v*` tags (the ruleset above).
2. Add **artifact attestations** in a separate `release.yml` workflow that runs on tags (`actions/attest-build-provenance`, with `id-token: write` and `attestations: write` in that workflow only), so users can run `gh attestation verify reboundops-<version>.tar.gz -R AnkitParekh007/rebound-ops`. Leave `ci.yml` unchanged.
3. If **immutable releases** are offered in your repository settings, turn them on, so assets of a published release cannot be replaced.
4. Keep publishing releases from the CI-built artifact, never from a local build, as was done for v0.2.0.

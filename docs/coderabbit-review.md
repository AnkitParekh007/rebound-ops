# CodeRabbit review setup

CodeRabbit is an additional automated reviewer, not a replacement for required
CI, CodeQL or independent human approval. The root `.coderabbit.yaml` controls
this repository; the nested legacy configuration in `engine/` is not the root
configuration.

## Activate once with the repository owner's account

1. Open https://github.com/apps/coderabbitai/installations/new.
2. Select AnkitParekh007, choose **Only select repositories**, and select
   **rebound-ops**. Review GitHub's permission prompt and install the app.
3. Complete the CodeRabbit GitHub sign-in/onboarding if requested. Enable
   reviews for this repository. Do not select a paid upgrade or enter billing
   details for this setup.

CodeRabbit currently advertises free reviews for public repositories, and
ReboundOps is public: https://www.coderabbit.ai/pricing. Installation and account
authorization must be completed by the owner; committing configuration does not
install or activate the GitHub App.

## Review behaviour

Non-draft PRs targeting `main`, or one of the `feature/*` branches that
stacked operations-feature PRs target, are reviewed automatically, with
incremental review on subsequent pushes. CodeRabbit pauses automatic review
after five reviewed commits on a PR (its default
`auto_pause_after_reviewed_commits`, not overridden here); later pushes stay
unreviewed until someone comments `@coderabbitai resume` or
`@coderabbitai review`. Stacked PRs with many fix-up commits reach this limit
quickly. Generated builds, dependency directories and binary marketing assets
are excluded; source, CI, contracts, docs, manifests and lockfiles remain
eligible. Findings should emphasize real defects, data loss,
privacy and accessible interactions.

Automatic approvals, label/reviewer assignment, generated fixes/tests/docstrings
and post-merge actions are disabled. Do not count a bot review as independent
human approval or make CodeRabbit a required branch check before confirming its
availability and behaviour. Existing CI and CodeQL requirements stay in place.

Bot-authored PRs can be skipped when the bot has no assigned CodeRabbit review
seat. Check the review response before assuming dependency updates were reviewed;
do not purchase or assign paid seats as part of this setup. Required CI still
applies to those PRs.

## Verify after installation

Open a non-draft PR, or comment `@coderabbitai review` on an existing one. Confirm
the response/review is from `coderabbitai[bot]` and that the loaded configuration
has no errors. Review the findings and keep useful checks even when the bot
misses a defect. A configuration file or a successful installation screen alone
does not prove a review has run.

For an intentional draft PR, mark it ready when you want automatic review. A
paused review can be resumed with `@coderabbitai resume` and an on-demand review
requested with `@coderabbitai review`.

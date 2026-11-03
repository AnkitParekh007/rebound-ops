# DRAFT — ReboundOps v0.2.0-rc1 developer-preview release notes

**NOT PUBLISHED.** These notes are for release-candidate review, not an announcement or approval to launch a public beta.

## Product scope

ReboundOps is a local, open-source prototype for experienced software professionals exploring directions after job loss or career change. Evidence is user-supplied and career routes are hypotheses, not hiring predictions or independently verified claims.

## Features

- Angular interface and localhost Fastify service on one port.
- Editable and confirmed/unverified/rejected claims, exact citations, correction history and dependent requirement-link revocation.
- Manually pasted job requirements with supported/gap/unreviewed classification.
- Return, Shift and Bridge options with deterministic seven-day plans within the stated time budget.
- Mock action tracking, check-in notes, Markdown export, user-directed private JSON backup/restore, and session deletion.
- Optional opt-in local disk snapshots (not encrypted).
- Optional browser-memory-only research feedback and respondent-controlled download.
- Optional AI integration is OFF by default and has not been live evaluated with paid Anthropic calls.

## Evidence and release-build fields

The pipeline requires a clean locked npm install, 40 unit/API checks, 51 Chromium/Firefox/WebKit checks (17 per engine), Angular production build, dependency and package audits, preview manifest verification and an extracted startup smoke test. **Do not assume any particular build passed until the run is complete.**

- Candidate source commit: fill from successful final CI run
- CI run URL and test counts: fill from successful final CI run
- Archive SHA-256: generated when a reviewer builds the package
- Manual OS/accessibility acceptance: **pending**
- Owner publication authorization: **pending**

## Limitations

There are no independent user interviews, retention measurements or confirmed real-world actions. Storage is local and potentially plaintext. The API is unauthenticated and **must never be exposed to the internet**. Automated tests do not replace manual device/assistive-tech testing. A recent npm audit reported 0 high/critical and 3 moderate production advisory entries across the @fastify/static → glob → minimatch chain (Issue #19); verify this again on the release commit. Development/build license/notice obligations need independent review.

Not present: hosted accounts, verified job feeds, salary predictions, job scraping, automated applications, recruiter contact harvesting, placement guarantees, live-verified paid AI.

## Publication gate

Do not publish any GitHub Release, package, hosted demo or marketing announcement without explicit owner approval. First inspect the archive, run manual installation/accessibility QA, review and disposition residual security/license issues, name an issue-response owner and acknowledge experimental limitations. A later validated public beta requires the deferred human-participant research.

Related: preview-quickstart.md, preview-security-review.md, preview-manual-qa.md and release-checklist.md.

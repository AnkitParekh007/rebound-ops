# Cloud-based founder acceptance rehearsal — 3 November 2026

**Status: Automated cloud rehearsal passed on GitHub Actions. Not real-user validation.**

## Execution

- Repository: https://github.com/AnkitParekh007/rebound-ops
- Test environment: GitHub-hosted Ubuntu runner, Node 24, locally hosted Fastify+Angular production build, Playwright Chromium.
- Baseline passing run: https://github.com/AnkitParekh007/rebound-ops/actions/runs/41575067889
- All data used in these browser journeys is **synthetic and fictional**. No private user or participant data was accessed. No paid AI provider calls were made.
- The test runner checks out the repository automatically in a temporary cloud job; it is **not connected to the owner's localhost browser at 127.0.0.1:4200**.

## Observed cloud result

| Automated check | Result |
| --- | --- |
| Unit and API tests | **35 passed, 0 failed** |
| Playwright Chromium browser tests | **13 passed, 0 failed** |
| Angular production compilation | Passed |
| Automated axe accessibility checks | Passed (within existing serious/critical WCAG-rule scope) |
| Original static prototype syntax checks | Passed |

The runner exited successfully. Results above describe a prior passing run of the acceptance suite; later source/documentation-only changes and an additional fictional evidence line must be confirmed on their own CI commit.

## Rehearsal coverage

- Return, Shift and Bridge: a new session; fictional role, constraints and achievements; local source text; exact citation; claim correction; participant confirmation; a job target with both manually supported and missing requirements; a time-budgeted plan; a simulated action checkbox; a check-in note; exported Markdown content; JSON backup; delete; restore and comparison.
- Every route also tested independently with a **one-hour weekly budget**, asserting scheduled minutes stay within the budget.
- A disabled-by-default AI flow checked that job requirements and confirmed claims appear in a preview, while private location/notes and unverified claims do not. The external-send button stayed disabled with no provider configured.
- Invalid source quotations were rejected without changing the underlying claim, with a user-readable validation error.
- Existing suites separately check API route consistency, provenance, optional disk storage, AI mock behavior, mobile overflow, keyboard smoke testing, and automated accessibility.

## What this does NOT establish

- **No other people tested the app** in this run; a browser script is not a human.
- A checked box is a **simulated completion**, not proof of a real-world job-search action.
- Usability, comprehensibility, desirability, seven-day retention and willingness to use the tool again are **not determined** by automated tests.
- Only Chromium on a Linux cloud runner was used for the full journeys. This is not a cross-browser, screen-reader or cross-operating-system human study.
- No live, paid Anthropic response or user account was tested.
- The original browser tab and any private local sessions on the owner's machine remain inaccessible.

## Next acceptance gate

Recruit participants voluntarily with consent and use the [pilot evaluation pack](pilot-evaluation-pack.md) and [blank scorecard](pilot-scorecard.md). Keep sensitive or identifying data out of GitHub. The open participant research and live-provider issues remain open until real outcomes and owner approvals are available.

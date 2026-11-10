# Usability remediation and release verification

The local draft was reconciled onto current main rather than replacing newer startup, navigation or intake changes. The backup stash preserves the original draft. The final candidate is tested before publication; its CI run is the source for platform results.

## Integrated changes

- Retain main's Node launcher and opt-in key isolation. Resolve npm-cli.js directly for forked Windows startup, propagate it to preparation/build, and stop owned Windows process trees. Bash compatibility entry point remains intact. Native Windows is experimental pending manual acceptance, and its CI gate remains mandatory.
- Retain main's optional browser draft recovery and safe intake edits. Unchanged evidence IDs, confirmations, citations, correction records, requirement links, check-in and plan survive ordinary edits. Changed/removed evidence invalidates affected links. Reduced availability preserves the existing week with a warning; a new plan uses the new budget.
- Preserve concrete first deliverables while adding the selected role and observable outputs to new plans. No hiring-readiness inference. Existing plans are not silently rewritten. Experiment editors use the selected time box; the integrated composer defaults to the next unfinished action.
- Integrate the workspace guide, saved-record status, same-session full-evidence link, reviewed context handoffs and combined-backup guidance. Keep main's three direct plan links as well.
- Distinguish no saved scan from saved zero-match results and filtered-out rows. Show query/location review and employer-board links without suggesting that a single board is the entire market. Failed/partial scan summaries remain separate.
- Evaluate can explicitly prepare an editable prompt without calling a provider. Editing clears sharing approval; downloads contain the edited text. UTF-8 text/Markdown answer import clears answer review, as does editing the answer. Saved reports do not automatically apply claims or scores. These changes apply to Evaluate, not every advanced AI tool.
- Short live status messages announce readiness and approval changes without announcing the entire private prompt as a live status.

## Required engineering checks

Run npm test, the production build, Chromium journey/accessibility checks, workspace readiness/scan tests and the real fresh-checkout startup/PDF/stop/restart smoke. The smoke also covers keyboard activation, both guide themes, narrow reflow, explicit no-call preparation, edited-prompt download, review confirmation, preserved intake links and combined backup. CI runs the relevant startup checks on Windows and macOS; Node 22 compatibility remains enforced. The marketing build, page checker and screenshot-artifact tests must pass; current screenshots are captured by CI, not substituted manually.

A narrow viewport and axe are not a human screen-reader or actual browser-zoom pass. A successful connection test is not an AI quality pass. Tests contain fictional inputs only.

## Human and live-model gates

[Launch validation status](launch-validation-status.md) is the decision record. Recruitment is pending; the facilitator protocol and AT script are prepared, not executed. Broad beta remains HOLD until actual journeys and seven-day follow-ups have been reviewed. Hosted production remains a separate scope.

Anthropic evaluation is authorized up to US$5. Add a dedicated ANTHROPIC_API_KEY through secret settings or use a private local terminal. Enforce a provider-side spend limit at or below that ceiling before running the fictional 20-case golden set. Case counts are not dollar caps. Review every output and publish aggregate results only. No credential or live report is available in this environment; no paid call has been made by this remediation.

# Launch decision and validation tracker

Decision date: 10 November 2026. **Broad beta: HOLD. Hosted multi-user production: out of scope.** This decision changes only when the required evidence below exists; publishing engineering fixes does not pass participant gates.

## Supported preview scope

Linux/macOS local developer preview. Native Windows is experimental pending manual acceptance. Fresh installation, PDF export, saved-session continuity, stop and restart must pass in Windows CI on the candidate before publication; failures are not ignored or reclassified as success. The Node launcher resolves npm's JavaScript CLI without a Windows command shell and cleans up owned child-process trees.

The older local usability draft has been reconciled onto current main. Intake edits retain the newer plan, notes, source and confirmed-evidence continuity rules; purposeful evidence changes still revoke affected links. The final candidate must pass CI before it is advanced to main. Review the workflow associated with the actual published commit rather than assuming an earlier green run applies.

## Participant evidence — current release validation round

The owner confirmed that **no participants are recruited yet**. No facilitator sessions, VoiceOver/NVDA sessions or seven-day follow-ups have been performed by this work. Existing product testimonials are not substituted for consent records, scored tasks or follow-up evidence in this tracker.

| Measure | Count / status |
| --- | --- |
| Recruited participants with consent | 0 |
| Documented discovery interviews supplied for this round | 0 of 5 required |
| Complete facilitated journeys | 0 of 3 required |
| Seven-day follow-ups completed | 0 |
| Regular VoiceOver/NVDA user sessions | 0 |
| Unaided completion rate | N/A — no attempts observed |
| Assisted / failed / skipped task results | N/A — no attempts observed |
| Real-world action and usefulness findings | Pending |

Use [the facilitator protocol](participant-validation-session.md) and [manual AT checklist](accessibility-manual-qa.md). The owner recruits and confirms consent; do not contact people, schedule interviews or record them automatically. Use anonymous IDs in public aggregate reporting. Keep availability, consent, raw notes and recordings private, outside Git.

## Session results format

For each actual task, record participant ID, build commit, OS/browser, regular assistive technology, task, attempted yes/no, outcome, assistance, elapsed time and observed problem. Outcome must be one of **unaided / assisted / failed / skipped / not-run**. An assisted completion never becomes unaided success. Retain negative observations and reasons for skips; do not drop participants who struggled during installation.

Record a short explanation of the person's decision before and after the task. Ask what helped, what did not, what they would use instead and whether they would return. Plan completion checkboxes are not evidence of actual career actions. A seven-day follow-up records self-reported attempts and decisions as self-report; it is not proof of employment outcomes.

Do not invent placeholder participants or prefill success rows. Start the first private scorecard only when a real participant has consented. Schedule follow-up relative to that session date; no calendar date can be assigned before recruitment. Track attempted, assisted, failed and skipped denominators when aggregating.

## Broad beta reassessment — not yet due

Reassess after five discovery interviews, at least three complete journeys, their seven-day follow-ups and a regular VoiceOver/NVDA session. Review all unresolved high-impact failures, data-loss risks, misleading claims, sharing comprehension, installation abandonment and participant-defined usefulness. Record limitations of the small sample rather than treating it as statistical or causal evidence.

A reassessment must name a human reviewer, list the tested commit(s), summarize unaided and assisted outcomes separately, retain failures/negative feedback, link only anonymized synthesis and state GO / LIMITED PILOT / HOLD with reasons. Until then the current decision remains HOLD for broad beta. A small developer preview is a separate decision.

## Other open gates

- Manual supported-OS, actual 400% browser zoom and assistive-technology acceptance.
- Named facilitator, issue-response owner and retention/deletion date before recruitment.
- Release-specific dependency advisory disposition and artifact attestation verification.
- Live recovery AI quality: Anthropic budget authorized up to US$5; dedicated secret and provider-enforced spend limit still needed. No live result has been supplied. Mock results cannot close this gate.
- Hosted architecture: authentication, authorization, tenant isolation, encryption/retention, monitoring and incident response need a separate ADR and implementation; do not expose the local API through a tunnel as a substitute.

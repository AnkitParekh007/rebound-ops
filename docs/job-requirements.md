# Manual job-requirement comparison

ReboundOps treats employer job descriptions as **untrusted external material**. In v0.2, it does not fetch, scrape, summarise or automatically infer requirements.

## How to use

1. Copy the title of an actual opportunity and, optionally, its HTTPS URL.
2. Paste 1–12 specific role requirements, one per line. Avoid copying sensitive employer content.
3. Review each requirement with the participant. Every requirement starts **unreviewed**.
4. Mark achievements as **confirmed** only if the participant can substantiate them.
5. Select a confirmed achievement beside a requirement and click **Supported by my evidence**; otherwise mark **Evidence gap** or keep **Unreviewed**.
6. Export Markdown to see reviewed requirements and the linked achievement claims.

A matching link is **participant judgement**, not independent credential verification or a hiring recommendation. ReboundOps refuses to mark unsupported evidence as proof. Rejecting previously linked evidence resets linked requirements to unreviewed.

## Worked example

- Claim: "Led a migration to a shared component library."
- Requirement: "Design maintainable, accessible component APIs."
- Decision: The migration may be related, but the participant must substantiate accessibility work. If it is not demonstrated, mark **gap**.

## Limitations

- No semantic comparison or job scraping.
- Source URLs are stored as text and never fetched. Only HTTPS links are accepted.
- Job openings, salaries and employer needs are not independently checked.
- At most 3 targets and 12 requirements per target.
- Replacing intake resets old evidence, job-target reviews, plan and notes. Back up a valuable session first.

## Evaluation

Ask: "Did identifying this gap change your next action?" and "What new evidence would change your assessment?" Both are better than invented fit scores.

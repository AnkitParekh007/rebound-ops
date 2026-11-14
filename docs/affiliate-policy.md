# Affiliate support policy

ReboundOps remains MIT-licensed and free. The optional `/support/` page is the **only** destination for curated partner links. Affiliate recommendations never affect job ranking, suitability assessments, CV generation or any private local workflow.

## Operating rules

1. Affiliate marketing is opt-in by visitors who choose to open the support page; no affiliate recommendations inside search/evaluation results.
2. Every partner must be approved and recorded in `marketing-website/affiliate-offers.json`. Do not add placeholder affiliate IDs or invented endorsements.
3. Approved records require `id`, `name`, `description`, `category`, a public HTTPS `url`, and `active:true`.
4. Page shows an up-front commission disclosure and each partner link includes `rel="sponsored nofollow noopener noreferrer"` and `referrerpolicy="no-referrer"`.
5. Do not inject partner scripts, analytics, tracking pixels or cookies into the job-search workspace. Links may contain network-level affiliate identifiers, so avoid leaking private career data through URL parameters.
6. Disclose compensation and material connections clearly in relevant communications. Validate relevant local consumer/advertising standards and partner terms before launch.
7. Never promise earnings or a commercial partnership without an executed agreement.

## Go-live checklist

- [ ] Obtain written approval from each partner and an account-specific affiliate destination.
- [ ] Verify permitted marketing text, brand assets and any required disclosures.
- [ ] Check destination for security, consumer protection and suitability to a career-transition audience.
- [ ] Add verified record via PR; validate tests and rendered page.
- [ ] Verify disclosures are visible before scrolling on mobile and desktop.
- [ ] Independently confirm signed commits and CI. Publish only after review.
- [ ] Periodically check dead links, changes to compensation and partner terms.

**No approved offers are bundled initially.** The support page works without them and does not falsely imply an existing partnership.

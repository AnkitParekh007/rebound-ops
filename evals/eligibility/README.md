# Eligibility posting corpus

233 **fictional** job-posting snippets, written for this corpus in common posting wording (no company, posting or person is real). Each row lists the hard requirements a careful reader finds in it:

- `work_authorization`, `citizenship_or_clearance`, `location`, `language`, `degree`;
- `sponsorship:refused` or `sponsorship:offered`, the sponsorship kind with its stance.

A preference (preferred, a plus, ideally, desirable) is not a hard requirement, and neither is a degree with an "or equivalent experience" alternative. 70 rows state no hard requirement, including preference wording and near misses such as "a high degree of autonomy" or "event sponsorships".

`lib.mjs` runs every snippet through `findRequirements` from `engine/web/src/lib/eligibility/screen.mjs`, exactly as the screen does, and compares the kinds it finds with the labels row by row. Years of experience are not scored: the screen takes them from `engine/jd-years.mjs`, which imports engine-only packages that root CI does not install.

The gate (`thresholds.json`, agreed by the owner 14 Nov 2026) allows no sponsorship offer read as a refusal (or the reverse) and no false `sponsorship:refused`, plus regression floors for micro and per-label precision and recall and for false alarms on rows with no requirement.

```
npm run eval:eligibility            # report and gate
npm run eval:eligibility -- --json  # full score
```

The corpus runs in `npm test` (`corpus.test.mjs`). Its scores describe this corpus only, not real postings. The first measurement (14 Nov 2026), taken before any pattern changed, was 96.0% micro precision and 81.5% micro recall. The patterns were then widened by wording family for the misses it found, and each family is checked with paraphrases kept out of the corpus (`engine/web/tests/lib/eligibility-screen.test.mjs`). On the corpus now: 98.3% micro precision and 99.4% micro recall. Because the corpus found those gaps, its scores are not an unbiased estimate of anything. Add a snippet by adding a row with its labels; never adjust a label to match what the code does.

# Pay corpus

222 **fictional** job-posting snippets, written for this corpus in common posting wording (no company, posting or person is real). Each row has one label, `pay`: does the snippet state a figure or range for the person's own pay (salary, wage, hourly or day rate, on-target earnings, or a stipend paid as pay)?

116 rows state pay and 106 do not. The rows without pay are near misses: vague pay ("competitive", "DOE"), company money (funding, revenue, volumes), perks and allowances (including perk stipends), bonuses, commission or equity on their own, product prices and deal sizes, and numbers that are not money. The id prefix names the wording family; `corpus.json` lists them.

`lib.mjs` runs every snippet through `statesPay` from `engine/web/src/lib/eligibility/quality.mjs`, exactly as the scan's `qual:` label does, and compares its answer with the label. A provider's structured salary field is not scored: the label uses it without reading any text.

The gate (`thresholds.json`, **proposed**, owner to agree) sets regression floors for precision and recall and caps on false "pay stated" answers and on missed pay.

```
npm run eval:pay            # report and gate
npm run eval:pay -- --json  # full score
```

The corpus runs in `npm test` (`corpus.test.mjs`). Its scores describe this corpus only, not real postings. The first measurement (14 Nov 2026), taken with the detector unchanged, was 84.3% precision and 83.6% recall: 18 false "pay stated" answers on the 106 rows without pay, and 19 missed pay figures on the 116 rows with pay. Ranges, vague pay and bonuses had no errors. The misses are weekly rates, `/annum`, a figure with no pay word or period ("Up to $85,000 DOE", "AUD 130k + super"), "salary for this role is", "will be" and "starts at" wordings, figures without a currency ("Salary 55-65k", "12-18 LPA"), Brazilian, Mexican and German wordings, and pay in a sentence that also names funding or users. The false answers are perk stipends ("Wellness stipend: $100/month"), benefits and funds with a period, product prices, consultants' billing rates, deal sizes, and volumes with a period ("processes €2,000,000 per day"). Add a snippet by adding a row with its label; never adjust a label to match what the code does.

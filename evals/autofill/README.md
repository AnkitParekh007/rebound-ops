# Autofill policy corpus

200 **fictional** application-form questions, written for this corpus in common ATS wording (no company, posting or person is real), each labelled with what the Autofill answer policy should do:

- `category`: the sensitive category `fieldSensitiveCategory` should give, or `null`;
- `outcome`: `profile` or `derived` (a reviewed fact from the corpus's fictional profile, with `fact` naming it), `draft` (the planner's answer is proposed), `held` (left for the person), or `none` (a file upload);
- `savable`: whether the person may save the answer for later forms.

`lib.mjs` runs every question through `enforceAnswerPolicy` exactly as the prefill route does, with a planner that offers a valid answer for every field, so only the policy decides. The gate (`thresholds.json`, proposed) allows no sensitive question drafted, no wrong profile fact and no unsafe save, plus regression floors for recall, precision and outcome accuracy.

```
npm run eval:autofill            # report and gate
npm run eval:autofill -- --json  # full score
```

The corpus runs in `npm test` (`corpus.test.mjs`). Its scores describe this corpus only. The corpus was used to find and fix gaps in the sensitive-question patterns, so they are not an unbiased estimate of anything, least of all accuracy on real forms. Add a question by adding a row with its labels; never adjust a label to match what the code does.

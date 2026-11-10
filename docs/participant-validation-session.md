# Participant validation session — recruitment pending

This is a ready-to-run protocol, **not completed user research**. Use 3–5 target participants for the first usability round, including someone who regularly uses VoiceOver or NVDA. The broader discovery gate still requires five discovery interviews; the journey gate requires three completed journeys and seven-day follow-ups. A test run by the maintainer does not count as a participant session.

## Preparation and privacy

Appoint a facilitator and issue-response owner. Reserve 45–60 minutes for a normal journey and 60–90 minutes for assistive-technology review. Tell participants that ReboundOps is a local developer preview, participation is voluntary, they may skip tasks or stop, and hiring outcomes are not promised. Use the fictional scenario below first; do not request a real résumé, API key or sensitive employment history.

Ask separately for consent to participate, keep anonymized observations, and record a screen/audio session. Recording is optional. Capture no keys, notifications, employer secrets or other people's information. Keep raw notes/recordings outside Git and shared issue trackers. Agree a deletion date before starting (default: within 30 days), delete exports from Downloads/Trash as well as the app, and record completion privately. Publish only anonymized synthesis with consent. Do not contact or recruit people automatically.

## Scenario

You are a software engineer in Bengaluru considering platform engineering after a layoff. You have six hours per week and prefer remote/hybrid work in India. Your fictional evidence: migrated three Node.js services, measured latency from 420 to 290 ms in a load test, and built Kubernetes deployment pipelines. Production AWS/Terraform ownership is not demonstrated. Use `example.org` for fictional contacts and jobs. Do not actually apply or message an employer.

## Session script

First ask: “What would make a career transition tool worth using for you? How do you organize this work today? What is hardest?” Record the participant's own problem before showing features. Avoid suggesting that AI or a tracker is necessarily the answer.

Give these tasks one at a time, without naming the required button. Let participants think aloud. After two minutes stuck, offer help and record it; an assisted completion is not an unaided success.

| Task | Neutral prompt | Observable success |
| --- | --- | --- |
| Install | Starting from the website, get the app ready to use | Supported Node and complete checkout; correct local URL opens; help requests recorded |
| Decide | Explain your situation and choose something manageable to do next | Participant can explain the chosen hypothesis and next action in their own words |
| Review evidence | Show what supports your experience and what is still uncertain for this job | No unsupported AWS/Terraform claim marked as established; participant understands user review is not independent verification |
| Make it practical | Turn one gap into a task you could finish this week | Concrete action, stopping point and observable result within allocated minutes |
| Prepare materials | Bring the fictional résumé into the app and inspect an export | Saved editor content and opened PDF inspected; no invented achievements |
| Find a role | Configure an employer board and look for an appropriate role | Query/location understood; failure distinguished from no matches; work-model evidence inspected |
| Record reality | Keep a record of an intended or fictional application | Correct manual record; participant understands this does not submit an application |
| Sharing | Prepare a no-key review, remove contact details and retain a reviewed answer | Participant identifies what would leave the machine; editing clears approval; imported answer reviewed before saving |
| Return | Preserve work, stop/reopen, then recover it | Saving or backup chosen deliberately; plan and records available after return |

Finish by asking: “Which part helped you make a real decision? What was confusing or unnecessary? What would you use instead? Would you choose to return next week? Why?” Do not ask for testimonials during the evaluation.

## Scorecard — one private copy per participant

Record anonymous participant ID, date, build commit, OS/browser, familiarity with terminals, and normal assistive technology. For each task record: unaided / assisted / failed / skipped, elapsed time, help given, friction severity, and a short observation. Separate observed behaviour from facilitator interpretation. Do not include personal career records.

Suggested decision rules, to be reviewed before recruitment: no unaddressed data-loss or misleading-claim defect; at least 3 completed end-to-end journeys; most participants can explain evidence versus inference and storage/sharing; every high-impact task failure gets a disposition. A small usability round is not statistical proof or a hiring-outcome study. Record disagreements and negative results.

## Seven-day follow-up

With prior consent, ask which planned action they actually attempted, whether the task changed their decision, where they got stuck and whether they returned voluntarily. A checked checkbox is not proof of a real-world action. Record self-report as self-report. Do not attribute interview or hiring outcomes to ReboundOps. Count only completed follow-ups toward the release gate; retain missed follow-ups in the denominator.

## Completion record

- Recruitment: pending; no participants have been contacted by this change.
- Sessions / seven-day follow-ups: pending.
- Manual VoiceOver/NVDA review: pending; use [the assistive-technology checklist](accessibility-manual-qa.md).
- Facilitator, response owner, consent and retention decisions: assign before sessions.
- Aggregate synthesis: create only after sessions, linking build and actual task results.

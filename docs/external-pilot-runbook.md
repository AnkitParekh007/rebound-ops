# External-user pilot — launch and analysis runbook

**Current status: tools prepared, participants not recruited or interviewed.** This guide is for the solo maintainer running a **small, opt-in, non-public** study. Do not claim people have tested ReboundOps based on GitHub Actions or scripted browser runs.

## Goal and thresholds

Aim for **five discovery interviews**, of which **at least three** may opt to complete a facilitated end-to-end recovery journey and a seven-day follow-up. These are targets, **not observed sample sizes**. Evaluate whether at least three of five interviewees independently describe a meaningful shared problem. Keep failure, criticism, withdrawals and nonresponses in the denominator when appropriate.

Before inviting anyone, decide where you will privately store consent and notes, who can access them, a deletion date, and how participants can withdraw or request deletion. Do not put participant exports or contact details in this public repository.

### Retention and deletion (required)

Keep a private facilitator log (outside Git) with:

| Artifact | Keep until | Then |
| --- | --- | --- |
| Raw interview notes / recordings | Synthesis complete, or ≤30 days after the session (whichever is sooner) | Delete or irreversibly redact |
| Downloaded pilot-feedback Markdown | Redaction + aggregate summary done, or ≤30 days | Delete; never commit |
| Session JSON backups created during a session | End of that facilitated session unless the participant keeps their own copy | Delete from the facilitator machine |
| Consent record (who agreed, when, scope) | Until the pilot evaluation report is finalized, then ≤90 days unless a longer legal hold applies | Delete or anonymize |
| Aggregate scorecard / go-no-go notes | May be retained without identifiers | Keep identifiers out |

If a participant withdraws or asks for deletion, remove their identifiable artifacts promptly and note the request in the private log. Aggregated counts may remain if they cannot identify the person.

## Participation invitation (owner sends manually, never bulk-spam)

> Hi — I'm building ReboundOps, a free, open-source tool to help experienced software professionals regain momentum after a layoff or career transition. I'm looking for candid feedback from a few volunteers. Would you be open to a 20–30 minute conversation about what is most difficult during a career transition? If you want, we can also test a local prototype with fictional data for about 30 minutes, plus an optional seven-day check-in. This is research, not job placement or a promise of career advice. You can skip questions, decline the prototype, or stop at any point. I won't publish your name, résumé or comments without separate permission.

Do not claim an incentive unless one is actually offered. Avoid recruiting vulnerable people into perceived employment obligations, and don't collect private résumé data merely to test a user interface.

## Pilot setup (facilitator-controlled computer)

The application is **localhost-only**, not a publicly accessible website. Participants cannot open the maintainer's \`127.0.0.1:4200\` tab on their own computers. For a facilitated session, the maintainer runs the app on their computer, shows the browser during a call or in person, and lets the participant make decisions. Alternatively, technically capable participants may install their own copy using the README quick-start.

Use Node 24.15+ and start the API with AI disabled and **without** \`REBOUNDOPS_DATA_DIR\`. Do not expose port 4174 to the internet or use tunnels. Use the clearly marked fictional example or other participant-approved, non-sensitive text. Close/delete the session between participants. Shared-screen displays can still reveal private content, so never use real data unless the participant specifically understands and consents.

## Session script

1. **Ask for consent verbally** using the wording in [the facilitator guide](pilot-evaluation-pack.md). Record it privately, separately from the product.
2. **Discovery first (20–30 minutes):** Ask about actual struggles and recent actions, without leading with ReboundOps benefits or showing the tool first. Record one independently stated problem and one contradiction per participant.
3. **Facilitated product journey (30–45 minutes, optional):** Allow participants to set a fictional intake, review/correct evidence, manually compare a job requirement, choose one of the three options (similar work, a new kind of work, a stepping-stone role), and inspect a seven-day action plan. Note where they get stuck **before** explaining.
4. **Optional in-app feedback:** At the bottom of an active session, open **Private pilot feedback**. The participant can choose to answer and check consent to download a private Markdown report. A code such as P01 is optional and must not contain a name. Neither the form nor its answers go to the API or a cloud service. The file is created locally, and it is shared with the facilitator only if the participant chooses.
5. **Record follow-up permission privately:** If the participant agrees, arrange a seven-day check-in outside the app. Don't force tracking or ask for sensitive contact information in the feedback form.
6. **Follow-up:** Reopen a local session if the participant preserved a backup or opted into local storage; otherwise a new session works. Record *not attempted*, *attempted*, or *self-reported completed*; don't infer actual completion from a checkbox. Repeat the optional survey with stage **Seven-day follow-up**.
7. **End:** Ask what they would change, whether they would use the tool again, and whether you may retain *a redacted summary*. Remove any source text that wasn't explicitly approved for storage.

## In-app private feedback data boundary

The feedback panel is deliberately **client-side only** and separate from the career session. It captures:
- Optional pseudonymous code and survey stage
- Direction clarity and understanding of data sharing
- What helped, what confused them
- Self-reported real-world action status
- Whether they'd use ReboundOps again

Answers are **not** stored in the API, JSON session backups, browser local storage or analytics. They disappear on reload, clearing the form, or switching to a new session. Download requires an explicit checkbox and at least one answer. The downloaded Markdown is unencrypted; the respondent should review/redact it before choosing to share. Do not commit feedback reports, raw notes, personal data, recordings, or unredacted screenshots to GitHub.

This is a research aid, not a certified consent-management system. A voluntary checkbox for *downloading* is not blanket consent to research, publish quotes or contact someone later.

## Research synthesis and go/no-go

Use [the private scorecard template](pilot-scorecard.md) **outside the repository**. Report counts with correct denominators (e.g., 2/3 volunteers who completed a journey, not 2/5 discovery interviewees); note missing follow-ups. Keep a traceable, private reference to anonymized evidence where participants consented. Distinguish:
- Application technically reached an action plan
- Participant said they would try an action
- Participant actually attempted an action (self-report)
- Participant says they completed an action (self-report)
- Participant found that action useful
- Participant would use ReboundOps again

Do not equate these observations, infer employment outcomes, or convert a three-person sample into a population claim. Any decision to invite more testers, enable paid AI, publish real quotes, or release a public beta requires owner review.

## Owner handoff

**Human actions needed:** recruit volunteers, obtain meaningful consent, facilitate interviews and journeys, follow up after seven days, and bring a *redacted, aggregate* summary back for analysis. We can then prioritize the usability failures, update the product, and make an evidence-based release recommendation.

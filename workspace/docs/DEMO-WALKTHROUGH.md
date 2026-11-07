# ReboundOps — demo walkthrough (fictional data)

> Local demo only; not publicly hosted; AI off; no personal data used.

Start the services from the repository root with `scripts/start-demo.sh` (see
[INTEGRATION-DEMO.md](INTEGRATION-DEMO.md)), then open **http://127.0.0.1:4317/**. For a true
first visit use a private window, or clear this site's storage. Screenshots below are produced
by `node scripts/reboundops-smoke.mjs --browser` (run inside `workspace/`); the folder is
git-ignored, so run that once to see them. A committed before/after gallery is in
[`docs/ux-review/index.html`](../../docs/ux-review/index.html).

## 1. Start — one question first (`#/start`)

Expect: "What would help you move forward right now?", four stepping stones (Your goal → The
essentials → Optional context → Review) and five choices. No form fields on step 1.

- Pick **Find similar work** → Continue.
- *Persona D:* pick **I know my target role** — nothing navigates; a panel offers **Plan around my
  target** or **Go straight to job search**.
- Shortcut: **Use a fictional example** jumps to Review with an "Example — fictional answers" tag.

![Start](reboundops-next/screenshots/1-start.png)

## 2. Essentials, optional context, review

- Essentials: current or recent role, a 1–20 hour slider ("4 hours a week"), and timing in plain
  words. Back keeps your answers.
- Optional context: everything skippable (**Skip this step**). Achievements are labelled
  self-reported.
- Review: every answer with **Change**; one privacy sentence with a detail disclosure. Press
  **Create my plan**.

## 3. My next step — before a direction (`#/recovery`)

Expect the decision ("Pick one direction to test this week"), the three directions in one line
each, and **Where you are** (starting from, heading toward, what matters, this week, evidence).
No "Internal name", revision numbers or raw enums.

![Home](reboundops-next/screenshots/2-home.png)

## 4. Explore directions (`#/directions`)

Three hypotheses side by side. Open **What is still unknown** for uncertainty, missing proof and
evidence to review. Press **Plan my week around this** on *Similar work to before*.

![Directions](reboundops-next/screenshots/3-directions.png)

## 5. Your next useful step

Expect one step first: title, "Day 1 of your week · about 30 min", **Why it matters**, **Mark as
done**, progress stones and "About 3h 20m planned within your 4h a week". The whole week is in
**See the whole week**. Mark the step done — the next step appears; reload — it is still done.

![Next step](reboundops-next/screenshots/4-next-step.png)

Try **Change direction** → choose another: a dialog says how many completed steps will not carry
over; **Keep my current plan** leaves everything as it was.

## 6. Find opportunities — consent handoff (`#/opportunities`)

Expect **What will be used** (the search text, editable) and **What will not happen** (no copy
of your answers, no job board contacted until you press Scan, no AI). **Continue to Vacancy
search** opens `#/scan?q=Software%20Engineer` with the filter filled in and the quiet **My next
step** panel above the tool.

![Handoff](reboundops-next/screenshots/5-handoff.png)
![Vacancy search](reboundops-next/screenshots/6-workspace-scan.png)

## 7. My evidence (`#/evidence`)

Your achievement as a quotation with "Self-reported · not reviewed". **I have reviewed this**
records your own review — the page says it is not external verification.

## 8. Failure states

- Stop the ReboundOps API: start and recovery screens say the recovery service is not running,
  with the restart command; nothing is invented.
- Restart the API: **My next step** says the earlier plan has ended (memory-only) and offers
  **Start again**.

## Manual acceptance checklist

- [ ] Step 1 shows one question and five choices; "I know my target role" never redirects on its own
- [ ] Back keeps answers; optional step can be skipped
- [ ] `sessionStorage['reboundops:handoff']` holds only `sessionId`, `goal`, `suggestedRoute`
- [ ] The next useful step is visible without scrolling at 1440 and 390 px
- [ ] Switching direction warns before replacing the plan
- [ ] The handoff lists the exact search text and requires Continue
- [ ] Job-search tools are under "Tools & settings"; deep links such as `#/scan` still work
- [ ] Light and dark themes; keyboard only; no horizontal scrolling at 320 px
- [ ] `git status engine` is clean after the demo

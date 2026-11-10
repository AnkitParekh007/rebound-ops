# Accessibility manual QA (pilot gate)

Automated Playwright axe checks cover WCAG 2.A / 2.AA / 2.1 AA / 2.2 AA tags on the recovery onboarding path:

- **Serious/critical** findings always fail CI.
- **Moderate/minor** findings fail unless listed in [`e2e/a11y-baseline.json`](../e2e/a11y-baseline.json) after triage (empty means none are tolerated).

They are **not** a substitute for human assistive-technology testing.

## Target

Declare **WCAG 2.2 AA** as the product target for the recovery Angular app before external pilots.

## Facilitator checklist (about 60–90 minutes)

Use fictional data only.

1. **Keyboard only (Chrome or Safari):** complete guided onboarding → create session → open evidence → add/correct one claim → open routes → select a direction → open plan. Confirm visible focus, no keyboard traps, and operable buttons/links.
2. **400% zoom:** repeat the critical path at 400% browser zoom on a 1280×800 viewport; content must remain readable without horizontal scrolling of the main flow where practical.
3. **VoiceOver (macOS) or NVDA (Windows):** navigate headings, form labels, status messages and the plan list. Note any unlabeled controls or announcements that disagree with the visual UI.
4. **Reduced motion:** enable OS reduce-motion and confirm the onboarding transition remains usable.
5. **Colour / contrast:** spot-check error text and selected route cards against surrounding backgrounds.

Record pass/fail per step privately (do not commit participant notes). Blocking failures must be fixed before inviting external pilot volunteers (roadmap Q1 / G4).

## Automated companion

```sh
npx playwright install chromium
npm run test:e2e -- e2e/accessibility.spec.ts
```

## Integrated workspace handoff (new task guide and manual review)

Use `npm start`, then open `/#/guide`. Record the build, OS, browser, AT name/version and result per task. Use a tester who normally uses the selected AT; a scripted DOM/axe check is not a substitute.

1. Follow the skip link, navigate headings and read the six guide tasks. Ensure each state is understandable without colour and that links have distinct names in context.
2. With keyboard only, open My next step, expand the experiment composer and confirm the next unfinished task is selected. Editing a completed task must explain that its completion will reset.
3. Open Evaluate, paste the fictional job description and prepare an editable prompt without a provider call. Confirm the prompt label, sharing explanation and disabled Copy state are announced. Check approval, edit one character, and confirm approval clears and Copy disables again.
4. Open Bring a web-chat answer back, import a fictional UTF-8 text answer, review it, give it a name and save. Confirm import/saved-report status and links are announced without moving focus unexpectedly.
5. Open combined-backup restore preview and cancel using Escape. Confirm focus returns to the control that opened the dialog and no files changed.
6. Repeat core tasks at actual 400% browser zoom, in dark/light themes and with OS reduced motion. Narrow-viewport automation covers reflow only; document actual zoom separately.

Mark not-run tasks **pending**, not passed. Block an external pilot on inaccessible core controls, lost focus/traps, misleading announcements or destructive actions without understandable confirmation. Log failures with fictional data and minimal reproduction steps.

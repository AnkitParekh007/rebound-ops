# Accessibility manual QA (pilot gate)

Automated Playwright axe checks cover **serious/critical** findings for WCAG 2.A / 2.AA / 2.1 AA / 2.2 AA tags on the recovery onboarding path. They are **not** a substitute for human assistive-technology testing.

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

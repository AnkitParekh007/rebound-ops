# ADR 0003 — Operations features: delivery shape and Autofill base

**Status:** Accepted by the owner on 12 November 2026. Revisit after the first Autofill pilot.

## Context

The owner's seven-feature implementation pack (11 November 2026, held privately) proposes Auto Apply, Autofill, Eligibility screening, a Recruiter Inbox, Referrals, an Interview Coach and a Strategy Advisor. The owner wants each feature delivered and marketed on its own.

The pack proposed building Autofill as a new Chrome Manifest V3 extension with loopback pairing. Its repository review was not exhaustive. It missed the Playwright prefill pipeline that already exists in `engine/web/src/lib/apply/`:

| What already exists | Where |
|---|---|
| Headed browser session, form extraction tagged with stable `data-co-field` ids | `session.ts`, `extract.ts` |
| Greenhouse public question schema used to enrich labels, types and options | `greenhouse.ts` |
| SSRF/egress guard on every navigation and redirect | `url-guard.mjs` |
| Never-submit guard shared by the snapshot and the action path | `submit-guard.mjs`, `drive-action.mjs` |
| Post-fill verification of values, required fields and validation errors | `diagnose.ts` (`verifyFill`) |
| Exact or single whole-word option matching (no "US" → "Australia") | `option-match.mjs` |

## Decision

1. **Autofill extends the engine prefill pipeline.** The MV3 extension is not built now. Contracts stay transport-neutral, so an extension can become a second front end later without changing them.
2. **Shared vocabulary lives in `@reboundops/contracts`** (`packages/contracts/src/operations/`). The engine is a separate package with no build step, so it mirrors the few enums it needs in plain `.mjs`. `tests/operations-parity.test.mjs` fails if the two lists drift apart.
3. **Feature flags default off** (`FEATURE_FLAGS`, enabled only through `REBOUNDOPS_FEATURES`). Safety guards that only narrow what an existing path may do are not flag-gated.
4. **Sensitive answers are policed in code, not only in the prompt.** Answers on work authorization, sponsorship, citizenship, salary, demographics, attestations and background checks may only come from a reviewed profile fact or an approved answer (`AnswerProposalSchema`). The prefill route enforces this on every planner answer (`answer-policy.mjs`). The agentic `drive` loop enforces it on every write it performs (`drive-write-guard.mjs`, roadmap gap C3). Its question detection is a DOM heuristic, so a radio whose question it cannot read is left for the person rather than guessed.
5. **Branching:** `feature/00-foundation` holds shared work. `feature/01-auto-apply` … `feature/07-strategy-advisor` branch from it. Each coherent work package reaches `main` by pull request with its flags off.

This narrows [ADR 0001](adr-0001-local-first.md) and does not replace it. Model suggestions are still never applied without a person selecting them. LinkedIn and Indeed direct automation stays disabled while their terms prohibit third-party automation.

## Consequences

**Benefits:** Autofill can be marketed sooner because it reuses guards that are already tested. There is no browser-store review or pairing protocol on the critical path, and less new attack surface.

**Costs:** Autofill runs in a browser that ReboundOps launches, not in the person's own logged-in browser. The engine web tests (`engine/web/tests`) are not part of the root CI run, so new engine modules add their tests to `npm test` explicitly.

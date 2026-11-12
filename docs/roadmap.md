# ReboundOps — delivery roadmap

**Start:** 2 November 2026. **Re-baselined:** 4 November 2026 (week 1).
**Plan status:** proposal; proceed through validation gates, not calendar alone.

> **Honesty rule:** checked items below are *engineering* facts verifiable in this repository. No user-research, outcome or adoption metric has been collected yet; none may be claimed until it is documented (privately, anonymized) per the [pilot runbook](external-pilot-runbook.md).

## 1. Status snapshot (4 Nov 2026)

Engineering has delivered the scope originally planned for weeks 3–6, about four weeks ahead of the calendar. The user-research gates from weeks 1–2 have not started. **These gates are now the critical path.** Building more features before they produce evidence raises the risk of building the wrong product.

| Week | Original goal | Exit artifacts | Status |
|---|---|---|---|
| 1 (Nov 2–8) | Problem discovery | 5 interviews; 3 candidate problems; synthetic prototype; draft rubric | **Partial**: prototype and rubric done; 0/5 interviews (#1) |
| 2 (Nov 9–15) | Facilitated manual pilot | 3 complete journeys, consented anonymized notes, follow-ups | **Not started** (#2) |
| 3 (Nov 16–22) | App skeleton | Angular shell, Fastify API, state machine, schema, intake, correction | **Done early** |
| 4 (Nov 23–29) | Complete MVP flow | Evidence inventory, Return/Shift/Bridge, plan, progress, export | **Done early** |
| 5 (Nov 30–Dec 6) | Private pilot | 5–10 guided users, evaluation report, quality fixes | **Kit ready**; no participants (#9) |
| 6 (Dec 7–13) | Reliability | Provider errors, resume, packaging, cost controls, tests | **Mostly done**; first live provider run (#8) failed G2; re-run with prompt `evidence-review@1.1.0` and persisted spend controls open |
| 7 (Dec 14–20) | Public preview | Demo, docs, issue templates, contribution guide, consent-based stories | **Partial**: docs/templates/script done; stories need pilot evidence |
| 8 (Dec 21–27) | Public beta | GitHub release, staged launch, triage, first patch | **Blocked** on gates G1–G4 below |

Effort target unchanged: 120–160 hours, before unavoidable participant scheduling delays.

**9 Nov engineering update:** launch-review blockers B1–B3 repaired: locked root/workspace/engine startup verification with Chromium preflight; ignored user-layer career files plus release-audit enforcement; truthful CV PDF completion/error feedback. This does not close participant-validation or live AI-quality gates.

**9 Nov high-priority journey repairs:** H1 save/backup/resume controls on the integrated path; H2 reviewed source/query inputs and regional opt-in; H3 manual application entry; H4 optional fact-check sources and targeted errors; H5 self-contained web-chat prompts; H6 same-session full recovery and reviewed CV/profile/preferences prefills. Full recovery uses ReboundOps orange branding and light/dark themes. Engineering checks do not close human validation or live AI gates.

**9 Nov readiness remediation:** R1–R6 implemented: failed/partial scan summaries, reviewed query/display alignment, evidence-based work models with Unknown fallback, source onboarding and incomplete-probe diagnostics, current AI navigation guidance and guarded name masking. Added concrete time-bounded experiments, reviewed external-answer saving, task navigation, duplicate-aware CV transfers and combined private career backup/restore. This is engineering delivery; G1–G4 still require their documented human/live-provider evidence.

## 2. Gap analysis

**8 Nov engineering update:** guided Recovery AI setup is available before intake and from workspace Settings, with explicit metadata-only connection testing and launcher `--ai` / `--no-ai` opt-in. This does not close G2: live model-quality evaluation remains outstanding.

The gaps are grouped by architecture domain and ranked by their impact on the next decision (pilot → preview), not by how hard they are.

### 2.1 Product and validation (critical path)

| # | Gap | Why it matters | Response |
|---|---|---|---|
| P1 | Research gates (#1, #2) have no recruitment timebox or fallback | Engineering can keep expanding scope indefinitely while the core hypothesis stays untested | Timebox recruitment (Track A); explicit no-go/pivot rule at G1 |
| P2 | No defined post-pilot decision path (iterate / expand / defer / stop) | Week 8 "public beta" assumes success | Gate G3 with documented decision options; ADR-0002 drafted only if evidence supports hosting |
| P3 | Pilot measurement relies on facilitator notes only; the app has no way to see whether a plan action led to a real-world outcome | The behaviour gate (≥50% complete one action in 7 days) needs consistent capture | Use the existing scorecard plus the 7-day follow-up; add no telemetry (privacy principle) |

### 2.2 AI architecture

| # | Gap | Why it matters | Response |
|---|---|---|---|
| A1 | ~~Only **invariant** tests exist (consent, IDs, injection, caps). There is no **quality** evaluation set with expected outcomes or metrics~~ **Done (B4)** | Mock tests cannot say whether suggestions are useful or over-claim support; a model change cannot be regression-tested | Versioned fictional golden set (≥20 cases incl. red-team scenarios from the [rubric](evaluation-rubric.md)) with metrics: invalid-output rate, over-claimed `possible_support` rate (human-labelled), gap-recall, latency, tokens |
| A2 | ~~Prompt and model are not versioned or recorded with outputs~~ **Done (B4)** | Results can't be reproduced or compared after a prompt or model change | Prompt ID/version constant; return `{model, promptVersion}` with every analysis; changing either requires a golden-set rerun |
| A3 | ~~Spend control resets on restart~~ Counters can persist via `REBOUNDOPS_DATA_DIR` / `REBOUNDOPS_AI_COUNTER_FILE`; still no currency ceiling | Money risk remains if provider limits are unset | Require a provider-side workspace spend limit before live tests; local counters only bound request count |
| A4 | No user-feedback loop on AI suggestions (accept/dismiss) | AI usefulness can't be measured during the pilot | Explicit "apply suggestion" action that goes through the existing manual requirement review, plus local-only accept/dismiss counts included in the pilot feedback export |
| A5 | ~~No fairness / responsible-AI test cases (career breaks, non-native English phrasing, seniority/age signals)~~ **Done (B4)** | Career guidance is high-impact; the target users skew experienced | Add to the golden set; reviewer checks tone and assessment parity across paired cases |
| A6 | Highest-value AI use (reviewable claim **extraction** from pasted documents with span citations, original engineering issue 3) is not built | The span/citation infrastructure exists, so this is the natural next AI capability | **Deferred** until G2 (live eval) passes and pilot shows that manual claim entry is a real friction point |

### 2.3 Frontend architecture (Angular)

| # | Gap | Why it matters | Response |
|---|---|---|---|
| F1 | ~~Entire UI is one 554-line `AppComponent`~~ **Done (B2)** with a 420-line template, ~14 signals and ~15 mutable template-driven fields | Hard to change safely during the pilot, review or test in isolation; contributors face a high entry cost | Decompose into feature components (intake, evidence, sources, routes, targets, AI review, plan, persistence, pilot feedback); behaviour-preserving, guarded by the existing Playwright suite |
| F2 | ~~HTTP calls and session state live in the component; no service or store layer~~ **Done (B2)** | Optimistic-revision/409 handling is duplicated and hard to test | `SessionApiService` (typed, contract-validated) + signal-based `SessionStore` owning revision/conflict logic |
| F3 | ~~No Angular unit/component tests; only E2E~~ **Done (B6)** | Slow feedback; E2E alone cannot cover edge states | Add component tests for store and conflict handling after F1/F2 |
| F4 | ~~Template-driven `FormsModule` mixed with signals~~ **Done (B6)** | Inconsistent reactivity model; validation duplicated from Zod | Move to typed forms validated against `@reboundops/contracts` schemas |

### 2.4 Data and contracts

| # | Gap | Why it matters | Response |
|---|---|---|---|
| D1 | ~~`schemaVersion: z.literal(1)` with no migration path for saved sessions or JSON backups~~ | The first schema change in a pilot upgrade would have made participants' saved sessions and backups unreadable | **Done (B1):** forward-only migration chain applied on disk load and backup restore, pre-upgrade `.backup` files, newer-version refusal, frozen v1 fixture; see [schema migrations](schema-migrations.md) |
| D2 | ~~No stated retention guidance for pilot artifacts~~ **Documented** in the pilot runbook | Privacy promises depend on facilitators following the schedule | Facilitators must still execute deletion; engineering cannot prove compliance |

### 2.5 Security and supply chain

| # | Gap | Why it matters | Response |
|---|---|---|---|
| S1 | ~~GitHub Actions pinned by tag (`@v4`), not commit SHA; no Dependabot/Renovate; no CodeQL/secret scanning workflow~~ | Exposure to supply-chain attacks through CI; new advisories arrive unnoticed between manual reviews (#19) | **Done (B3):** actions SHA-pinned, least-privilege workflow permissions, Dependabot (npm + actions), CodeQL (`security-extended`, JS/TS + workflows). **Owner action still open:** enable secret scanning and push protection in repository settings (not configurable from files) |
| S2 | ~~Preview archive has a SHA-256 checksum produced by the same pipeline, but no build-provenance attestation or SBOM~~ **Done (B7)** | A checksum proves the file is intact, not where it came from | `actions/attest-build-provenance` + CycloneDX SBOM attached to the artifact before any publication |
| S3 | Encryption at rest for saved sessions (original engineering issue 6) not implemented | Saved files hold career/personal data in plaintext | Keep documented as a limitation for the localhost pilot; becomes **mandatory** for any hosted or shared-machine scenario (ADR-0002 trigger) |
| S4 | ~~README claims Node 22.x support, but CI tests only Node 24~~ | Users on 22.x may hit failures CI never sees | **Done (B3):** `Node 22 compatibility` CI job runs install, unit/API tests and the Angular build |

### 2.6 Accessibility and quality

| # | Gap | Response |
|---|---|---|
| Q1 | ~~No explicit conformance target~~ Target + manual script + axe WCAG 2.2 AA tags; residual moderate/minor gated by [`e2e/a11y-baseline.json`](../e2e/a11y-baseline.json) | Human screen-reader pass (NVDA + VoiceOver) remains a gate (#9); do not grow the baseline without triage notes |

### 2.7 Documentation drift — resolved (B0, 5 Nov 2026)

Some documents described finished work as future work, which misled contributors and reviewers:

- `architecture.md` "Next design steps" 1–3 are implemented (spans, requirement review, opt-in persistence).
- `phase-2.md` still says "No … AI analysis" and lists completed items under "Next vertical slice".
- The "First engineering issues" list (below) had no completion state.

Response: fixed in B0. `architecture.md` now has a status table, and `phase-2.md` points to this roadmap for upcoming work instead of keeping its own list. Rule going forward: **only the roadmap holds future work**, other docs describe what exists.

## 3. Revised plan (from week 1)

Two parallel tracks. **Track A is the critical path.** Track B may only reduce risk for the pilot, make it measurable, or keep the code maintainable. **Track B adds no new user-facing features before G1.**

### Track A — Validation (owner-led)

| When | Work | Exit |
|---|---|---|
| Wk 1–2 (Nov 4–15) | Recruit and run 5 discovery interviews (#1) | Anonymized synthesis; **G1** decision |
| Wk 2–3 (Nov 11–22) | 3 facilitated journeys with 7-day follow-up (#2) | Scorecards per [rubric](evaluation-rubric.md) |
| Wk 3 (by Nov 22) | **Recruitment timebox check**: if fewer than 3 interviews are done, stop and re-plan recruitment channels before any further engineering | Recorded decision |
| Wk 4–6 (Nov 23–Dec 13) | Private pilot, 5–10 participants on the preview candidate (#9) | Evaluation report; **G3** decision |

### Track B — Engineering hardening (pilot-enabling only)

| Order | Item | Gaps closed | Why now |
|---|---|---|---|
| B0 | ✅ Docs drift fix + this roadmap | 2.7 | Done 5 Nov 2026; future work lives only in the roadmap |
| B1 | ✅ Schema migration framework + fixtures | D1 | Done 4 Nov 2026; every future schema change follows the [playbook](schema-migrations.md) |
| B2 | ✅ Angular decomposition: feature components, `SessionApiService`, `SessionStore` (no behaviour change) | F1, F2 | Done 4 Nov 2026; see [frontend architecture](frontend-architecture.md) |
| B3 | ✅ CI supply-chain hardening: SHA-pinned actions, Dependabot, CodeQL, Node 22 job | S1, S4 | Done 4 Nov 2026; owner must enable secret scanning/push protection in settings |
| B4 | ✅ AI golden set + offline eval runner (mock + live mode), prompt/model versioning | A1, A2, A5 | Done 4 Nov 2026; thresholds proposed, owner to agree; see [AI evaluation](ai-evaluation.md) |
| B5 | Live provider evaluation on fictional data with provider-side spend limit (owner approval) | A3, #8 | **G2**. First live run 9 Nov 2026 (Claude Sonnet 5.5, prompt `evidence-review@1.0.0`) **failed G2**: 9 of 20 responses invalid, 40% fairness parity. Prompt `evidence-review@1.1.0` tightens the output rules the validator enforces and needs a new live run plus human review before G2 can pass; see [AI evaluation](ai-evaluation.md) |
| B6 | ✅ Component tests, typed forms on contracts | F3, F4 | Done 5 Nov 2026; Vitest unit tests in `npm test`, reactive forms validated by shared Zod contracts |
| B7 | ✅ Provenance attestation + SBOM for the preview artifact | S2 | Done 5 Nov 2026; CycloneDX SBOM in every archive, SLSA provenance + SBOM attestations on `main` builds |
| B9 | ✅ Guided first visit (default first screen) + intake sample-data fix | — | Done 6 Nov 2026. **Owner decision to ship before G1**, an explicit exception to the Track B feature freeze. Wording is a draft; test it in the discovery interviews and pilot (see [guided first visit](onboarding.md)) |
| B8 | AI suggestion apply/dismiss with local-only counts in pilot feedback export | A4 | Only if G2 passes and AI is enabled in the pilot |
| B10 | Seven operations features (Track C below), behind default-off flags | — | **Owner decision 12 Nov 2026 to build before G1**, a second explicit exception to the feature freeze. G1–G4 still gate every public release and claim |

### Track C — Operations features (owner exception B10)

Source: the owner's seven-feature implementation pack (11 Nov 2026, held privately). Decisions are recorded in [ADR 0003](adr-0003-operations-features.md). Release order follows dependencies. Each feature is marketed separately, only after its own gate passes. Every flag is off unless named in `REBOUNDOPS_FEATURES`.

| Release | Feature | Branch | Flags | Status |
|---|---|---|---|---|
| R0 | Shared foundation | `feature/00-foundation` | — | **Started:** flag registry (FND-07) and Autofill answer vocabulary in `@reboundops/contracts`. Operations store ([ADR 0004](adr-0004-operations-store.md)): `node:sqlite` file under `REBOUNDOPS_DATA_DIR`, single-owner lock, backed-up forward-only migrations (FND-01), and an append-only event ledger with idempotent ids, expected-revision conflicts and atomic batches (FND-02), tested on Linux CI. Backups and restore (FND-06, first slice): hashed manifests, name-only and hash-checked restore, a safety backup first, all-or-nothing, and restore on a clean profile. The API opens it on first use behind the flags, with ledger routes and `409 STALE_REVISION` (`apps/api/src/operations/routes.ts`). Legacy tracker import (FND-03, first slice): `applications.md` text is imported with stable `legacy-<#>` ids, dry run, idempotent reimport and quarantined rows, parity-tested against the engine reader. Optional local model (FND-05, [ADR 0005](adr-0005-local-model.md)): loopback-only OpenAI-compatible adapter with timeout, cancellation, schema-validated output and a manual fallback that states its reason; no feature uses it yet. **Deferred (owner decision, 12 Nov 2026):** pairing and grants (FND-04) were specified for a browser extension, which is not being built (ADR 0003); revisit if an extension or another out-of-process client is added. Open: FND-03 projections (Markdown export from the store, reading not-yet-imported rows without double counting) and an import screen, FND-06 deletion and retention (redacting a record's payloads, purging freed pages, and stating that backups still hold them), restoring backups from an older schema, a backup and restore screen, store tests on macOS/Windows |
| R1 | #2 Page-aware Autofill | `feature/02-autofill` | `autofill` | **Started:** AF-04 code-enforced answer policy in the prefill route (`answer-policy.mjs`). Sensitive categories are never answered from a model draft, off-list options and unknown field ids are dropped, and every answer carries a source label. The review screen shows each field's source or hold reason (`answer-note.mjs`), linked to the control through `aria-describedby`, and stops calling a value an AI draft once the person edits it. AF-02 first slice (`profile-facts.mjs`): identity fields and stated work authorization come from the structured keys of `config/profile.yml` as `profile_fact`, with no model. "Authorized to work in X?" is answered Yes only when X is in `authorized_in`. "Sponsorship in X?" is answered No only when X is authorized and `needs_sponsorship` is false. Everything else, including salary, is left for the person; `compensation.*` is never read (owner decision 12 Nov 2026). Extends the engine prefill pipeline (ADR 0003). Open: repeated employment/education sections with stable IDs, approved-answer reuse, Lever adapter with context scope, per-field `FillResult` readback, Lever adapter, labelled 200-field corpus |
| R2 | #3 Eligibility & Quality | `feature/03-eligibility-quality` | `eligibilityScreening` | Not started |
| R3 | #1 Controlled Auto Apply | `feature/01-auto-apply` | `autoApply` + per-adapter submit | Not started. Needs R0–R2. LinkedIn/Indeed direct automation stays disabled while their terms prohibit it |
| R4 | #4 Recruiter Inbox | `feature/04-recruiter-inbox` | `inboxImport`, `gmailRead`, `followupDrafts` | Not started. Stage A (import) does not need Gmail verification |
| R5 | #5 Referrals | `feature/05-referrals` | `contactImport`, `referralMatching`, `referralDrafts` | Not started |
| R6 | #6 Interview Coach | `feature/06-interview-coach` | `applicationInterviewContext`, `interviewCoaching` | Not started |
| R7 | #7 Strategy Advisor | `feature/07-strategy-advisor` | `strategyMetrics`, `strategyRecommendations`, `strategyExperiments` | Not started |

Track C gaps:

| # | Gap | Response |
|---|---|---|
| C1 | `engine/web/tests` is not run by root CI, so the prefill pipeline Autofill extends has no required check | New engine modules add their tests to root `npm test`; owner to decide whether CI runs the whole engine web suite |
| C2 | The engine cannot import `@reboundops/contracts` (separate package, no build step) | Mirror enums in `.mjs`, pinned by `tests/operations-parity.test.mjs`; revisit if the engine gains a build |
| C3 | ~~The agentic `drive` path in `full` mode lets the model fill fields directly, outside the prefill answer policy~~ **Done (engineering)** | `drive-write-guard.mjs` runs inside `executeAction` before every type, select and radio/checkbox click. In `full` mode only reviewed values are entered, and sensitive fields take only the reviewed answer to that same question. Consent checkboxes are never ticked, and a radio with an unidentified question is left for the person. In `reach` mode, sensitive fields are refused. Not yet run against live ATS forms with the Claude planner |

### Decision gates

| Gate | Criterion (proposed, from [rubric](evaluation-rubric.md)) | If not met |
|---|---|---|
| **G1 Problem** | ≥3 of 5 interviewees independently describe the same consequential problem, and it matches the app's core flow | Pivot the problem framing before any further feature work |
| **G2 AI quality** | Live golden-set run (`npm run eval:ai:live`) passes every check in [`thresholds.json`](../evals/ai-review/thresholds.json) (0 fabricated evidence, ≤5% over-claims, 0 injection over-claims, ≥90% fairness parity — proposed, owner to agree), plus human review sign-off; provider terms reviewed | AI stays disabled for participants; core flow ships without it |
| **G3 Value** | ≥4 of 5 complete the core flow without help; ≥50% complete one real action within 7 days; no invented achievements in exports | Iterate on the pilot or defer the public preview |
| **G4 Release** | G3 passed; open advisories triaged (#19); manual OS/screen-reader QA; provenance/SBOM; owner approval | No public release |

Public beta (original week 8) moves to **after G4**; the date follows the evidence, not the calendar.

## 4. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Recruitment stalls (solo maintainer, sensitive audience) | High | Critical | Timebox at Nov 22; multiple channels; prepared [invitation](external-pilot-runbook.md) |
| Scope creep while research lags | High | High | Track B limited to pilot-enabling items; feature freeze until G1 |
| Saved sessions break on upgrade | Low (B1 done) | High | Migration chain + frozen fixtures + pre-upgrade backups |
| Live model over-claims support or tone harms users | Medium | High | G2 golden set incl. fairness pairs; suggestions never auto-applied |
| Single-maintainer bus factor | High | Medium | Decomposed frontend (B2 done), current docs, contributor guide |
| Dependency advisory exposure | Medium | Medium | Dependabot + CodeQL active (B3); #19 tracking; localhost-only binding |

## 5. Deferred scope and re-entry triggers

Still deferred: automated job scraping, recruiter contact harvesting, salary estimates, mobile apps, complex agent teams. Auto-applying moved to Track C (R3) behind default-off flags; unattended submission stays out of scope until its own gate passes.

| Deferred capability | Re-entry trigger | Prerequisites |
|---|---|---|
| Hosted service / accounts / sync | G3 shows that local-only setup is a top adoption blocker | ADR-0002; authN/authZ, encryption at rest, tenancy isolation, privacy compliance review (e.g. India DPDP Act, GDPR), incident response |
| AI claim extraction from documents (A6) | G2 passed and pilot shows manual claim entry is a key friction point | Span-citation contracts (exist); golden set extension |
| Additional AI providers | A concrete user or cost need | Existing `AiProvider` interface; same golden-set gate |
| Automatic recovery ↔ job-search synchronization | Pilot evidence justifies automation beyond the shipped reviewed prefills | CV/Profile/Two-pager already offer explicit draft handoffs; broader synchronization needs a consent model and no silent overwrite |
| Two-way sync of CV, evidence, job targets and applications | The handoff above is in use and users ask for shared records | Conflict rules, provenance carried across, per-record consent |
| Recovery screens inside the Workspace for evidence review, job targets and corrections | Users split between the Angular app and the Workspace | Bridge allowlist extension with the same validation discipline |
| Durable recovery sessions through the bridge (`REBOUNDOPS_DATA_DIR`) | Demo users lose sessions on API restart | Existing opt-in disk persistence; bridge allowlist for the persistence route |
| Translations for the Workspace recovery screens (English only today) | Non-English pilot participants | Workspace locale dictionaries |
| Vector (SVG) logo | Print or large-format use | Source artwork from the logo owner |
| Workspace Home redesign (replace the existing "Command Center" composition) | Journey screens validated with real job seekers | `docs/design-system.md` components; keep every tool reachable |
| Opportunity Lens inside Vacancy search / Evaluate ("why this might help your direction / what is unknown") | Handoff in use | Grounded only in real posting data and the chosen route; no invented fit ratings |
| Weekly Reflection (what I tried, learned, continue / change / pause) | Users finish a seven-day plan | Contract support for reflection notes (the API has `review` notes today) |
| "I couldn't do this" action state | Users report blocked steps | Contract change: an action outcome other than completed; no falsified progress |
| Manual screen-reader and 400% zoom review of the journey screens | Before any external pilot | VoiceOver/NVDA walkthrough script |

## 6. Original stage checklists (updated)

### Stage 0 — immediately usable baseline

- [x] Initialize open-source repository
- [x] Build deterministic browser pilot (no external AI or API key)
- [x] Add evidence intake and traceable user-entered lines
- [x] Compare three non-scored route hypotheses
- [x] Allocate a realistic seven-day plan within stated weekly hours
- [x] Track completed steps and export a Markdown report
- [x] Add unit tests and automated CI workflow
- [ ] Validate with 5 discovery participants (#1)
- [ ] Facilitate 3 complete journeys and record outcomes (#2)
- [ ] Choose one dominant problem based on actual evidence (G1)

### Stage 1 acceptance criteria

- At least 3/5 discovery interviewees independently describe a consequential shared problem.
- Three users can choose and carry out a first action with a facilitator.
- No fabricated career achievements or false verified claims in exported journeys.
- Every plan stays within the declared time budget.
- Participants understand what is fictional, inferred, verified or uncertain.
- Any external publication requires explicit consent; raw profiles stay private.

### First engineering issues (original list)

1. [x] Structured intake and evidence schemas with explicit source provenance.
2. [x] State transitions and resumable local sessions with consent, with schema migrations (D1).
3. [ ] Reviewable AI extraction behind one provider adapter. *(Adapter and requirement review done; extraction deferred: A6.)*
4. [x] Job-description comparison with explicit missing evidence, never numeric hireability.
5. [x] Accessibility and browser testing for an Angular MVP. *(Manual AT testing open: Q1.)*
6. [ ] Encryption/secret handling and cost telemetry. *(Server-side secrets and token counts done; encryption at rest and persisted spend control open: S3, A3.)*

### Phase 2 implementation progress (owner review pending)

The solo maintainer feature-tested the original prototype, and the Angular/Fastify application is merged into `main` with scripted cloud acceptance checks. **No external participant interviews or completed real-world action journeys have yet been documented.** These engineering checks cannot satisfy the user-research gates.

- [x] Angular application and local Fastify service
- [x] Shared Zod schema, source provenance and optimistic revisions
- [x] Manual requirement review linked to participant-confirmed evidence
- [x] Seven-day route plans, check-ins, Markdown export
- [x] Explicit private JSON backup/restore and local delete
- [x] Optional AI adapter disabled by default, with exact payload preview and consent gate
- [x] Automated unit, API, browser-journey and axe accessibility tests
- [x] Cloud-hosted scripted end-to-end acceptance for Return, Shift and Bridge using fictional data
- [x] Adversarial AI mock evaluation, provider error sanitization and token-usage reporting
- [x] Facilitator guide, consent introduction, blank results scorecard and synthetic demo script
- [x] Optional browser-only participant feedback with consent-gated Markdown export and no telemetry
- [x] Recruitment invitation and facilitator handoff for a private pilot
- [x] User-correctable exact source spans, document IDs and auditable correction history (#6)
- [x] Consent-based durable local sessions and recovery (#7)
- [x] Chromium/Firefox/WebKit browser CI, Host-header safeguards, external disk-change detection and release hygiene audit
- [x] npm workspace lockfile and clean `npm ci` installs in CI
- [x] Live npm advisory and dependency license inventory checks; upgraded vulnerable @fastify/static
- [ ] Independent human usability evaluation with at least three real journeys (#2, #9)
- [ ] Cross-platform manual testing and live provider compatibility with fictional data (#8, #9)
- [x] Approve a small live-provider evaluation budget/key before paid calls (B5); used for the first live run on 9 Nov 2026
- [ ] Re-run the live golden-set evaluation for prompt `evidence-review@1.1.0` and complete the human review (B5, G2)
- [ ] Recruit actual volunteers; conduct five interviews, three journeys and follow-ups (#1, #2)
- [ ] Collect and summarize actual pilot outcomes before claiming success metrics (G3)
- [ ] Independently review flagged licenses and future dependency/registry advisory changes (#19, B3)
- [ ] Independent security review and manual screen-reader/cross-platform evaluation (Q1, G4)
- [ ] Validate opt-in saving with users across supported operating systems

### Owner-requested product presentation work (2026-11-07)

- [x] Keep MIT notices and dependency redistribution notes in standalone distributions.
- [x] Record component provenance in `PROVENANCE.md` / `provenance.json`.
- [x] Retire unused marketing sources; keep `marketing-website/` as the public site.
- [x] Replace the primary tool dashboard with a recovery-linked search workbench.
- [x] Add contextual Opportunity Lens/Application Review framing and product screenshots.
- [x] Add provenance/package regression checks and screenshot automation.

These items do not satisfy participant research gates. See [provenance](../PROVENANCE.md).

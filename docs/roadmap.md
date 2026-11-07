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
| 6 (Dec 7–13) | Reliability | Provider errors, resume, packaging, cost controls, tests | **Mostly done**; live provider (#8) and persisted spend controls open |
| 7 (Dec 14–20) | Public preview | Demo, docs, issue templates, contribution guide, consent-based stories | **Partial**: docs/templates/script done; stories need pilot evidence |
| 8 (Dec 21–27) | Public beta | GitHub release, staged launch, triage, first patch | **Blocked** on gates G1–G4 below |

Effort target unchanged: 120–160 hours, before unavoidable participant scheduling delays.

## 2. Gap analysis

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
| Q1 | ~~No explicit conformance target; axe covers only serious/critical rules~~ Target + manual script documented; axe tags now include WCAG 2.2 AA for serious/critical | Declare **WCAG 2.2 AA** as target ([manual QA](accessibility-manual-qa.md)); extend axe beyond serious/critical with a triaged baseline later; human screen-reader pass (NVDA + VoiceOver) remains a gate (#9) |

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
| B5 | Live provider evaluation on fictional data with provider-side spend limit (owner approval) | A3, #8 | **G2** |
| B6 | ✅ Component tests, typed forms on contracts | F3, F4 | Done 5 Nov 2026; Vitest unit tests in `npm test`, reactive forms validated by shared Zod contracts |
| B7 | ✅ Provenance attestation + SBOM for the preview artifact | S2 | Done 5 Nov 2026; CycloneDX SBOM in every archive, SLSA provenance + SBOM attestations on `main` builds |
| B9 | ✅ Guided first visit (default first screen) + intake sample-data fix | — | Done 6 Nov 2026. **Owner decision to ship before G1**, an explicit exception to the Track B feature freeze. Wording is a draft; test it in the discovery interviews and pilot (see [guided first visit](onboarding.md)) |
| B8 | AI suggestion apply/dismiss with local-only counts in pilot feedback export | A4 | Only if G2 passes and AI is enabled in the pilot |

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

Still deferred: automated job scraping, auto-applying, recruiter contact harvesting, salary estimates, mobile apps, complex agent teams.

| Deferred capability | Re-entry trigger | Prerequisites |
|---|---|---|
| Hosted service / accounts / sync | G3 shows that local-only setup is a top adoption blocker | ADR-0002; authN/authZ, encryption at rest, tenancy isolation, privacy compliance review (e.g. India DPDP Act, GDPR), incident response |
| AI claim extraction from documents (A6) | G2 passed and pilot shows manual claim entry is a key friction point | Span-citation contracts (exist); golden set extension |
| Additional AI providers | A concrete user or cost need | Existing `AiProvider` interface; same golden-set gate |
| Recovery ↔ job-search data handoff (`workspace/`, `engine/`) | Pilot users want their chosen direction reflected in job-search targets | Schema map from session route to engine profile/targets; explicit consent UI before any write into `engine/`; no automatic sync |
| Two-way sync of CV, evidence, job targets and applications | The handoff above is in use and users ask for shared records | Conflict rules, provenance carried across, per-record consent |
| Recovery screens inside the Workspace for evidence review, job targets and corrections | Users split between the Angular app and the Workspace | Bridge allowlist extension with the same validation discipline |
| Durable recovery sessions through the bridge (`REBOUNDOPS_DATA_DIR`) | Demo users lose sessions on API restart | Existing opt-in disk persistence; bridge allowlist for the persistence route |
| Translations for the Workspace recovery screens (English only today) | Non-English pilot participants | Workspace locale dictionaries |
| Vector (SVG) logo | Print or large-format use | Source artwork from the logo owner |
| Workspace Home redesign (replace the inherited "Command Center" composition) | Journey screens validated with real job seekers | `docs/design-system.md` components; keep every tool reachable |
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
- [ ] Approve a small live-provider evaluation budget/key before paid calls (B5)
- [ ] Recruit actual volunteers; conduct five interviews, three journeys and follow-ups (#1, #2)
- [ ] Collect and summarize actual pilot outcomes before claiming success metrics (G3)
- [ ] Independently review flagged licenses and future dependency/registry advisory changes (#19, B3)
- [ ] Independent security review and manual screen-reader/cross-platform evaluation (Q1, G4)
- [ ] Validate opt-in saving with users across supported operating systems

### Owner-requested originality remediation (2026-11-07)

- [x] Preserve complete upstream licenses in standalone distributions and expose public credits.
- [x] Record component provenance and remove misattributed founder/manifesto/signature claims.
- [x] Retire the unused copied marketing site and repair imported issue/wiki references.
- [x] Replace the primary tool dashboard with an original recovery-linked search workbench; retain credited advanced tools.
- [x] Add contextual Opportunity Lens/Application Review framing and seven current product screenshots.
- [x] Add provenance/package regression checks and extend screenshot automation.

These changes were explicitly requested by the owner following the originality audit. They do not satisfy participant research gates. See [the remediation record](originality-remediation.md) and [provenance](../PROVENANCE.md).

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
| A1 | Only **invariant** tests exist (consent, IDs, injection, caps). There is no **quality** evaluation set with expected outcomes or metrics | Mock tests cannot say whether suggestions are useful or over-claim support; a model change cannot be regression-tested | Versioned fictional golden set (≥20 cases incl. red-team scenarios from the [rubric](evaluation-rubric.md)) with metrics: invalid-output rate, over-claimed `possible_support` rate (human-labelled), gap-recall, latency, tokens |
| A2 | Prompt and model are not versioned or recorded with outputs | Results can't be reproduced or compared after a prompt or model change | Prompt ID/version constant; return `{model, promptVersion}` with every analysis; changing either requires a golden-set rerun |
| A3 | Spend control is a per-process attempt counter that resets on restart; no currency ceiling | Restarting the process removes the cap | Require a provider-side workspace spend limit before live tests; document it as the real ceiling; optionally persist counters with durable storage |
| A4 | No user-feedback loop on AI suggestions (accept/dismiss) | AI usefulness can't be measured during the pilot | Explicit "apply suggestion" action that goes through the existing manual requirement review, plus local-only accept/dismiss counts included in the pilot feedback export |
| A5 | No fairness / responsible-AI test cases (career breaks, non-native English phrasing, seniority/age signals) | Career guidance is high-impact; the target users skew experienced | Add to the golden set; reviewer checks tone and assessment parity across paired cases |
| A6 | Highest-value AI use (reviewable claim **extraction** from pasted documents with span citations, original engineering issue 3) is not built | The span/citation infrastructure exists, so this is the natural next AI capability | **Deferred** until G2 (live eval) passes and pilot shows that manual claim entry is a real friction point |

### 2.3 Frontend architecture (Angular)

| # | Gap | Why it matters | Response |
|---|---|---|---|
| F1 | ~~Entire UI is one 554-line `AppComponent`~~ **Done (B2)** with a 420-line template, ~14 signals and ~15 mutable template-driven fields | Hard to change safely during the pilot, review or test in isolation; contributors face a high entry cost | Decompose into feature components (intake, evidence, sources, routes, targets, AI review, plan, persistence, pilot feedback); behaviour-preserving, guarded by the existing Playwright suite |
| F2 | ~~HTTP calls and session state live in the component; no service or store layer~~ **Done (B2)** | Optimistic-revision/409 handling is duplicated and hard to test | `SessionApiService` (typed, contract-validated) + signal-based `SessionStore` owning revision/conflict logic |
| F3 | No Angular unit/component tests; only E2E | Slow feedback; E2E alone cannot cover edge states | Add component tests for store and conflict handling after F1/F2 |
| F4 | Template-driven `FormsModule` mixed with signals | Inconsistent reactivity model; validation duplicated from Zod | Move to typed forms validated against `@reboundops/contracts` schemas |

### 2.4 Data and contracts

| # | Gap | Why it matters | Response |
|---|---|---|---|
| D1 | ~~`schemaVersion: z.literal(1)` with no migration path for saved sessions or JSON backups~~ | The first schema change in a pilot upgrade would have made participants' saved sessions and backups unreadable | **Done (B1):** forward-only migration chain applied on disk load and backup restore, pre-upgrade `.backup` files, newer-version refusal, frozen v1 fixture; see [schema migrations](schema-migrations.md) |
| D2 | No stated retention guidance for pilot artifacts (backups, feedback exports, facilitator notes) | Privacy promises depend on facilitators deleting data on schedule | Add retention/deletion step to the pilot runbook (e.g. delete raw notes after synthesis) |

### 2.5 Security and supply chain

| # | Gap | Why it matters | Response |
|---|---|---|---|
| S1 | GitHub Actions pinned by tag (`@v4`), not commit SHA; no Dependabot/Renovate; no CodeQL/secret scanning workflow | Exposure to supply-chain attacks through CI; new advisories arrive unnoticed between manual reviews (#19) | Pin actions to SHAs; enable Dependabot (npm + actions) and CodeQL; enable GitHub secret scanning/push protection |
| S2 | Preview archive has a SHA-256 checksum produced by the same pipeline, but no build-provenance attestation or SBOM | A checksum proves the file is intact, not where it came from | `actions/attest-build-provenance` + CycloneDX SBOM attached to the artifact before any publication |
| S3 | Encryption at rest for saved sessions (original engineering issue 6) not implemented | Saved files hold career/personal data in plaintext | Keep documented as a limitation for the localhost pilot; becomes **mandatory** for any hosted or shared-machine scenario (ADR-0002 trigger) |
| S4 | README claims Node 22.x support, but CI tests only Node 24 | Users on 22.x may hit failures CI never sees | Add Node 22 to the test matrix or narrow the supported engines |

### 2.6 Accessibility and quality

| # | Gap | Response |
|---|---|---|
| Q1 | No explicit conformance target; axe covers only serious/critical rules | Declare **WCAG 2.2 AA** as target; extend axe to all rules with a triaged baseline; manual screen-reader pass (NVDA + VoiceOver) remains a gate (#9) |

### 2.7 Documentation drift

Some documents describe work that is already finished as future work. This misleads contributors and reviewers:

- `architecture.md` "Next design steps" 1–3 are implemented (spans, requirement review, opt-in persistence).
- `phase-2.md` still says "No … AI analysis" and lists completed items under "Next vertical slice".
- The "First engineering issues" list (below) had no completion state.

Response: fix in a single docs-only PR (Track B, item B0).

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
| B0 | Docs drift fix + this roadmap | 2.7 | Cheap; prevents misleading reviewers |
| B1 | ✅ Schema migration framework + fixtures | D1 | Done 4 Nov 2026; every future schema change follows the [playbook](schema-migrations.md) |
| B2 | ✅ Angular decomposition: feature components, `SessionApiService`, `SessionStore` (no behaviour change) | F1, F2 | Done 4 Nov 2026; see [frontend architecture](frontend-architecture.md) |
| B3 | CI supply-chain hardening: SHA-pinned actions, Dependabot, CodeQL, Node 22 matrix | S1, S4 | Low effort, ongoing protection (#19) |
| B4 | AI golden set + offline eval runner (mock + live mode), prompt/model versioning | A1, A2, A5 | Prerequisite for live evaluation (#8) |
| B5 | Live provider evaluation on fictional data with provider-side spend limit (owner approval) | A3, #8 | **G2** |
| B6 | Component tests, typed forms on contracts | F3, F4 | After B2 |
| B7 | Provenance attestation + SBOM for the preview artifact | S2 | Before **G4** |
| B8 | AI suggestion apply/dismiss with local-only counts in pilot feedback export | A4 | Only if G2 passes and AI is enabled in the pilot |

### Decision gates

| Gate | Criterion (proposed, from [rubric](evaluation-rubric.md)) | If not met |
|---|---|---|
| **G1 Problem** | ≥3 of 5 interviewees independently describe the same consequential problem, and it matches the app's core flow | Pivot the problem framing before any further feature work |
| **G2 AI quality** | Golden set: 0 invalid outputs accepted, 0 fabricated evidence IDs, over-claimed support ≤ an agreed threshold, plus human review sign-off; provider terms reviewed | AI stays disabled for participants; core flow ships without it |
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
| Dependency advisory exposure | Medium | Medium | Dependabot/CodeQL; #19 tracking; localhost-only binding |

## 5. Deferred scope and re-entry triggers

Still deferred: automated job scraping, auto-applying, recruiter contact harvesting, salary estimates, mobile apps, complex agent teams.

| Deferred capability | Re-entry trigger | Prerequisites |
|---|---|---|
| Hosted service / accounts / sync | G3 shows that local-only setup is a top adoption blocker | ADR-0002; authN/authZ, encryption at rest, tenancy isolation, privacy compliance review (e.g. India DPDP Act, GDPR), incident response |
| AI claim extraction from documents (A6) | G2 passed and pilot shows manual claim entry is a key friction point | Span-citation contracts (exist); golden set extension |
| Additional AI providers | A concrete user or cost need | Existing `AiProvider` interface; same golden-set gate |

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

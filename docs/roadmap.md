# ReboundOps — eight-week delivery roadmap

**Start:** 2 November 2026. **Plan status:** proposal; proceed through validation gates, not calendar alone.

| Week | Goal | Exit artifacts | Estimated effort |
|---|---|---|---|
| 1 (Nov 2–8) | Problem discovery | 5 interviews; 3 candidate problems; synthetic prototype; draft rubric | 12–16 h |
| 2 (Nov 9–15) | Facilitated manual pilot | 3 complete recovery journeys, consented anonymized notes, action follow-ups | 12–16 h |
| 3 (Nov 16–22) | App skeleton | Angular shell, Fastify local API, state machine, schema, intake, correction | 18–24 h |
| 4 (Nov 23–29) | Complete MVP flow | Evidence inventory, Return/Shift/Bridge, plan, progress, export | 18–24 h |
| 5 (Nov 30–Dec 6) | Private pilot | 5–10 guided users, evaluation report, quality fixes | 16–20 h |
| 6 (Dec 7–13) | Reliability | Provider errors, resume, packaging, cost controls, tests | 16–22 h |
| 7 (Dec 14–20) | Public preview | demo, docs, issue templates, contribution guide, consent-based stories | 12–16 h |
| 8 (Dec 21–27) | Public beta | GitHub release, staged launch, triage, first patch | 16–22 h |

Effort target: 120–160 hours, before unavoidable participant scheduling delays.

## Stage 0 — immediately usable baseline

- [x] Initialize open-source repository
- [x] Build deterministic browser pilot (no external AI or API key)
- [x] Add evidence intake and traceable user-entered lines
- [x] Compare three non-scored route hypotheses
- [x] Allocate a realistic seven-day plan within stated weekly hours
- [x] Track completed steps and export a Markdown report
- [x] Add unit tests and automated CI workflow
- [ ] Validate with 5 discovery participants
- [ ] Facilitate 3 complete journeys and record outcomes
- [ ] Choose one dominant problem based on actual evidence

## Stage 1 acceptance criteria

- At least 3/5 discovery interviewees independently describe a consequential shared problem.
- Three users can choose and carry out a first action with a facilitator.
- No fabricated career achievements or false verified claims in exported journeys.
- Every plan stays within the declared time budget.
- Participants understand what is fictional, inferred, verified or uncertain.
- Any external publication requires explicit consent; raw profiles stay private.

## Stage 2 feature gates

Defer building automated job scraping, auto-applying, recruiter contact harvesting, authentication, mobile apps, hosted storage, complex agent teams or employer salary estimates. AI integration should follow signed-off content contracts and an explicit preview of provider-bound data.

## First engineering issues

1. Implement structured intake and evidence schemas with explicit source provenance.
2. Define state transitions and resumable local sessions (with consent).
3. Implement reviewable AI extraction behind one provider adapter.
4. Add job-description comparison with explicit missing evidence, never numeric hireability.
5. Build accessibility and browser testing for an Angular MVP.
6. Add encryption/secret handling and cost telemetry for local API providers.

## Phase 2 implementation progress (owner review pending)

The validated manual pilot has led to a working typed Angular and local Fastify application on a feature branch. This is **implementation progress**, not a claim that wider usability or market-evidence gates have been satisfied.

- [x] Angular application and local Fastify service
- [x] Shared Zod schema, source provenance and optimistic revisions
- [x] Manual requirement review linked to participant-confirmed evidence
- [x] Seven-day route plans, check-ins, Markdown export
- [x] Explicit private JSON backup/restore and local delete
- [x] Optional AI adapter disabled by default, with exact payload preview and consent gate
- [x] Automated unit, API, browser-journey and axe accessibility tests
- [ ] Confirm cross-platform manual testing and live provider compatibility with fictional data
- [x] Add adversarial AI mock evaluation, provider error sanitization and token-usage reporting
- [ ] Approve a small live-provider evaluation budget/key before paid calls
- [ ] Collect and summarize actual pilot outcomes before claiming success metrics
- [x] Add user-correctable exact source spans, document IDs and an auditable correction history (Issue #6)
- [x] Implement consent-based durable local sessions and recovery (Issue #7)
- [ ] Validate opt-in saving with users across supported operating systems

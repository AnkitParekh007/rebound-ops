# Release readiness and evidence gates

This is a **pre-release checklist**, not a declaration that ReboundOps is production-ready.

## Product and evaluation

- [x] Prepare interview guide, seven-day follow-up method, blank anonymized scorecard and demo walkthrough
- [x] Add consent-gated, browser-only participant feedback export and recruitment handoff
- [ ] Collect anonymized synthesis of five discovery interviews without publishing raw notes
- [ ] Document three facilitated complete journeys and seven-day action follow-ups
- [ ] Confirm the core workflow is useful beyond polished generated text
- [ ] Test with 5–10 pilot participants and track first-action completion
- [ ] Do not present hiring results as caused by ReboundOps without appropriate evidence

## Quality

- [x] Local Angular + Fastify vertical slice on feature branch
- [x] Shared Zod source-provenance contracts
- [x] Time-limited deterministic routes and plans
- [x] Manual requirement-to-evidence links (no automated fit scores)
- [x] Explicit JSON backup/restore and delete
- [x] Consent-based local disk saving and resume controls
- [x] Mock-tested AI data preview, consent gate, adversarial inputs, request cap, output validation and token reporting
- [x] Automated unit, integration and end-to-end tests implemented
- [x] CI checks on merged main commits (verify the exact intended release commit separately)
- [x] Linux Chromium, Firefox and WebKit automated end-to-end and axe checks
- [x] Local Host/Origin protection, saved-file change detection and release hygiene check
- [x] Unpublished preview archive allowlist, SHA-256 manifest, archive checksum and clean extracted startup smoke checks in CI
- [x] Configure expiring GitHub Actions artifact download on successful `main` push builds (no GitHub Release)
- [ ] Manually verify the final preview archive and complete the OS/assistive-technology QA handoff
- [ ] Test manually across supported operating systems, browsers and screen readers; automated Linux browser checks are not a human usability study
- [ ] Validate keyboard and screen reader use with participants
- [ ] Verify provider against fictional data before allowing real-user external calls
- [ ] Add source spans for external descriptions and provenance migrations

## Safety and operations

- [ ] Confirm copy explains exactly what goes to a configured provider
- [ ] Confirm real participant data is absent from public history
- [ ] Document deletion, backup and API key handling
- [ ] Threat-model any transition from localhost to hosted access
- [x] Commit npm workspace lockfile and verify `npm ci` in CI
- [x] Scan npm advisories (production and full graph) and inventory declared dependency licenses
- [ ] Verify individual license notices / redistribution obligations and repeat npm audit at each release
- [x] Prepare scoped issue templates, security reporting and a preview QA/triage handoff
- [ ] Appoint a human issue-response owner and confirm a triage cadence before publication
- [ ] Obtain explicit consent for testimonials and case studies

## Suggested launch stages

1. **Private pilot:** invite interested software professionals without expecting public testimonials.
2. **Public preview:** use fictional demonstrations, architecture and evaluation findings.
3. **Public beta:** only after usability, privacy and reliability requirements are met.

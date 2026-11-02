# Release readiness and evidence gates

This is a **pre-release checklist**, not a declaration that ReboundOps is production-ready.

## Product and evaluation

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
- [x] Mock-tested AI data preview, consent gate and output validation
- [x] Automated unit, integration and end-to-end tests implemented
- [ ] All CI jobs green and feature branch merged
- [ ] Test across current supported operating systems and browsers
- [ ] Validate keyboard and screen reader use with participants
- [ ] Verify provider against fictional data before allowing real-user external calls
- [ ] Add source spans for external descriptions and provenance migrations

## Safety and operations

- [ ] Confirm copy explains exactly what goes to a configured provider
- [ ] Confirm real participant data is absent from public history
- [ ] Document deletion, backup and API key handling
- [ ] Threat-model any transition from localhost to hosted access
- [ ] Check dependencies and licence compatibility
- [ ] Create scoped contribution issues and a maintainer triage cadence
- [ ] Obtain explicit consent for testimonials and case studies

## Suggested launch stages

1. **Private pilot:** invite interested software professionals without expecting public testimonials.
2. **Public preview:** use fictional demonstrations, architecture and evaluation findings.
3. **Public beta:** only after usability, privacy and reliability requirements are met.

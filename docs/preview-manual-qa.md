# Release-candidate manual QA handoff — unfilled record

**Not executed.** A future maintainer or owner must complete these checks on a real device. Automated CI must not be presented as evidence of manual use.

## Environment

- Candidate archive and manifest source commit:
- Archive SHA-256:
- Operating system/version:
- Browser/version:
- Node/npm versions:
- Screen reader/assistive technology, if available:
- Date and pseudonymous tester code:
- Private record location and deletion plan:

## Checks (all initially open)

- [ ] Extract the candidate, check the archive SHA-256 and run node scripts/verify-preview.mjs.
- [ ] Install using npm ci --omit=dev --ignore-scripts and start the service on 127.0.0.1:4174.
- [ ] Confirm memory-only and AI-disabled defaults; no credentials or personal data needed.
- [ ] Complete a fictional evidence/citation/correction, requirement-gap and plan journey.
- [ ] Choose each of the three options (similar work, a new kind of work, a stepping-stone role) on both one-hour and six-hour budgets.
- [ ] Test simulated action check-ins, Markdown/JSON exports, delete and restore.
- [ ] Confirm no unapproved persistence or automatic external AI transfer.
- [ ] Keyboard-only flow, visible focus and logical heading/control order.
- [ ] Screen reader announcements, errors, status notices and accessible naming.
- [ ] Mobile viewport, pinch zoom, touch targets and content overflow.
- [ ] Inspect the unencrypted export disclosures, local API binding, deletion and restart. Check that opt-in disk saving works on this OS; Windows requires a write-capable handle for file flushes.
- [ ] Review security advisories, package integrity and third-party notices.
- [ ] Confirm the owner's named issue triage contact and no private data in any public report.
- [ ] Record defects using synthetic steps and obtain owner review.

## Approval

- Go / No-go / Rework: **pending**
- Blocking issues:
- Human accessibility evidence:
- Manual OS/browser evidence:
- Security/license advisory disposition:
- Source commit and exact green CI run URL:
- Explicit owner signature/date:
- Public distribution authorized? **No**

This record must not be filled with synthetic participant findings or inferred from cloud scripts.

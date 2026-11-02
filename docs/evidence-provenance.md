# Evidence provenance and corrections

ReboundOps treats career achievements as **participant claims**, not independently verified facts. The goal of exact source citations is to make review easier, not to certify employment history.

## How to cite a claim

1. Start a recovery session with a fictional example or your own data.
2. Under **Private source documents**, paste a short résumé or project-note excerpt (maximum 10,000 characters per document, up to three documents).
3. Select **Correct & cite** on an evidence line.
4. Adjust the claim, record why it changed, and select the relevant pasted document.
5. Paste an **exact, unique quotation** taken from that document. ReboundOps checks it appears exactly once and stores the document ID and the JavaScript UTF-16 text offsets where it appears.
6. Save. The claim becomes **unverified** again; explicitly reconfirm only if the user stands behind the corrected wording.
7. Export Markdown to see the current claim, source label, exact quote, citation offsets, and correction history.

A quoted passage supports traceability. It does *not* prove the quoted statement is true, that the participant did the work, or that an employer verified it. Do not infer outcomes that are absent from the quotation.

## Correction and invalidation rules

- A correction preserves the claim's ID and records the previous/new wording, previous/new source references, a time and a reason.
- Every correction resets status to **unverified**, even if a participant previously confirmed the claim.
- Any job requirements linked to that claim become **unreviewed** with evidence links cleared.
- The participant can then review and confirm the corrected claim.
- Source text is immutable. To remove a cited document, first correct its linked evidence to another source (or mark it as manual).
- Replacing the *entire* intake intentionally clears the source documents, correction history, job-target reviews, plan and progress, because those records belong to the previous intake. **Download a backup first** if those records matter.
- Imported backups are checked against their source documents; a mismatched document ID, quote or character range is refused.
- Older Phase 2 backups without source documents remain readable, with their original unanchored source labels. Missing spans are not treated as proof.

## Limits and privacy

The app processes pasted plain text only. It does not OCR, upload or parse an actual résumé file. Source text stays in the localhost API memory until deletion/restart; a user-triggered JSON backup includes all source text and correction history. Do not paste confidential employer material or sensitive personal data.

Only the claim text of participant-confirmed evidence may enter an optional provider payload after a separate, exact-payload preview and explicit consent. Original pasted source documents, quotations, labels and correction history are not sent in that payload.

## Research questions

In the next pilot, ask whether participants find exact citations more helpful than labels; whether correction history affects confidence; and whether backing up source text introduces privacy concerns. Evaluate claims for fabrication and quote mismatch using entirely synthetic examples.

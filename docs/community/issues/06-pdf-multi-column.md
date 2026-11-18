**Difficulty:** hard · **Labels:** `enhancement`, `import`, `help wanted`

### Background

PDF import reads selectable text only. When many lines contain wide gaps, `packages/documents/src/pdf-import.ts` adds the warning *"The PDF looks like it has multiple columns. Lines from different columns may be merged; check each section carefully."* The release readiness report plans "OCR-free improvements to PDF layout handling" for the next release.

### Files

- `packages/documents/src/pdf-import.ts`
- `packages/documents/test/` (new tests)
- `tests/helpers/pdf-fixtures.ts` (`buildPdf`, `page`, `stream`), to generate a fictional two-column PDF inside the test so that no binary fixture is committed

### Acceptance criteria

- [ ] A generated, fictional two-column resume PDF imports with each column's lines kept together, in reading order (left column, then right).
- [ ] Single-column PDFs produce exactly the same text as before, and existing tests pass unchanged.
- [ ] When the layout is still ambiguous, the warning stays, and confidence is not raised to `high`.
- [ ] No OCR, no new runtime dependency, and no network access.
- [ ] Import time for the existing fixtures does not noticeably regress (note before and after in the PR).

### Verify

```bash
npm run test:unit
npm run lint && npm run typecheck
```

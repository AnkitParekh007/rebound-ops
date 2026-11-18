**Difficulty:** easy · **Labels:** `accessibility`, `testing`, `good first issue`

### Background

`apps/web/src/app/a11y.spec.ts` runs axe on 11 views and panels, plus a negative control that proves the harness detects real violations. Two views are not covered yet:

- the **application detail page** (`apps/web/src/app/pages/application.page.ts`). Its panels (interview notes, contacts and reminders) are checked on their own, but the page as a whole is not;
- the **tracker with rows**. Only the empty state (`tracker (empty state)`) is checked today.

### Files

- `apps/web/src/app/a11y.spec.ts`
- the fixtures it already uses (reuse them; add fictional data only if needed)

### Acceptance criteria

- [ ] A new axe test renders `ApplicationPage` with a fictional application (status, timeline, links) and expects no violations.
- [ ] A new axe test renders `TrackerPage` with at least three fictional applications in different statuses and expects no violations.
- [ ] Each new test passes a `mustShow` text, so it cannot pass on a blank render.
- [ ] If axe finds a real violation, the component is fixed rather than the rule disabled, and the PR says so.

### Verify

```bash
npm run test:web
npm run lint && npm run typecheck
```

# Frontend architecture (Angular)

**Status:** roadmap item B2 (gaps F1, F2) is implemented. This was a behaviour-preserving refactor: same DOM text, labels, roles and CSS classes, verified by the unchanged Playwright suite.

## Layers

```text
apps/web/src/
  main.ts                      zoneless bootstrap + HttpClient
  app/
    app.component.*            shell: header, hero, steps, global messages, composition
    core/
      session-api.service.ts   typed, stateless HTTP gateway: one method per API endpoint
      session-store.ts         signal store: session, busy/error/notice, AI preview, intents
      api-types.ts             response/request shapes not covered by shared Zod contracts
      error-messages.ts        pure HTTP-failure → user-message mapping
      download.ts              local file download helper (nothing leaves the device)
    features/
      intake/                  01 intake form, saved-session resume, backup restore
      evidence/                02 source documents, confirm/reject, cited corrections, history
      job-targets/             02b manual job requirements reviewed against confirmed evidence
      ai-review/               optional AI: exact payload preview → consent → non-applied suggestions
      routes/                  03 Return / Shift / Bridge hypotheses
      plan/                    04 seven-day plan, check-in notes, Markdown export
      pilot-feedback/          private questionnaire (component-local state only) + model
      data-controls/           opt-in disk saving, JSON backup, delete
```

Data flow is one-directional:

```text
feature component ──intent──▶ SessionStore ──▶ SessionApiService ──▶ localhost API
        ▲                          │
        └──── signals (session, busy, error, notice, aiPreview …) ◀──┘
```

## Rules

1. **Components never inject `HttpClient`.** All requests go through `SessionStore` intents (`decideEvidence`, `chooseRoute`, `previewAi` …). The store is the only caller of `SessionApiService`.
2. **One request at a time.** `busy` serializes mutations, matching the API's single-writer, optimistic-revision model. Every mutation sends the last-seen `revision`; on HTTP 409 the store loads the server's latest session and asks the user to retry.
3. **Any successful session change clears the AI preview and analysis**, so a consent click always refers to the current data.
4. **Session-scoped UI state lives in the feature component**, not the store: form drafts, evidence-link selections and private pilot answers. The shell renders features inside `@for (current of store.activeSession(); track current.id)`, so switching, restoring or deleting a session recreates them, and per-session state can never leak into another session.
5. **Private pilot feedback stays out of the store** on purpose: it must never reach the API, backups or AI payloads.
6. Features receive the active session as a required signal input (`session = input.required<Session>()`) and read global status from the store. All components use `OnPush` and the app runs zoneless.

## Next steps (roadmap B6)

- Unit tests for `SessionStore` (conflict handling, AI invalidation) and `describeFailure`, using a stubbed `SessionApiService`.
- Replace template-driven `FormsModule` drafts with typed forms validated against `@reboundops/contracts` schemas (gap F4).

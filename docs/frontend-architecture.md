# Frontend architecture (Angular)

**Status:** roadmap item B2 (gaps F1, F2) is implemented. The single long page was later replaced by a step-by-step wizard (below); Playwright specs open steps through `e2e/steps.ts`.

## Layers

```text
apps/web/src/
  main.ts                      zoneless bootstrap + HttpClient
  app/
    app.component.*            shell: header, step navigation, global messages, composition
    core/
      wizard.ts                WizardStore: step list, statuses, locking, URL-hash sync
      session-api.service.ts   typed, stateless HTTP gateway: one method per API endpoint
      session-store.ts         signal store: session, busy/error/notice, AI preview, intents
      api-types.ts             response/request shapes not covered by shared Zod contracts
      error-messages.ts        pure HTTP-failure → user-message mapping
      download.ts              local file download helper (nothing leaves the device)
    features/
      onboarding/              first-visit guided questions (default "About you"); see docs/onboarding.md
      intake/                  "About you" as one full form (starts blank; reloads from the active session)
      resume/                  open a saved session or restore a backup ("Coming back?")
      evidence/                02 source documents, confirm/reject, cited corrections, history
      job-targets/             02b manual job requirements reviewed against confirmed evidence
      ai-review/               optional AI: exact payload preview → consent → non-applied suggestions
      routes/                  "Your options": similar work / a new kind of work / a stepping-stone role
      plan/                    04 seven-day plan, check-in notes, Markdown export
      pilot-feedback/          private questionnaire (component-local state only) + model
      data-controls/           opt-in disk saving, JSON backup, delete
      records/                 application records (operations store): tracker import, Markdown export, backups, redaction
```

Data flow is one-directional:

```text
feature component ──intent──▶ SessionStore ──▶ SessionApiService ──▶ localhost API
        ▲                          │
        └──── signals (session, busy, error, notice, aiPreview …) ◀──┘
```

## Step-by-step wizard

The app shows one step at a time instead of one long page. Main steps: **About you → Things you did → Jobs you are looking at (optional) → Your options → Your 7-day plan**; side steps, open at any time: **Keep or delete my data**, **Application records** (only when an operations feature flag is on and `REBOUNDOPS_DATA_DIR` is set) and **Tell us how it went**.

- `WizardStore` (`core/wizard.ts`) owns navigation. `steps` is one memoized `computed` derived from `SessionStore.session()`, so every status (`current`, `done`, `todo`, `optional`, `locked`) comes from the same snapshot. Status is never derived from form state.
- Locked steps explain why in plain language (for example "Choose one of your options first") through `aria-disabled` and `aria-describedby`. If the current step becomes locked (session cleared or deleted), the wizard returns to "About you".
- The current step is mirrored into `location.hash` (`#start`, `#evidence` …) with `pushState`, so the browser Back button and bookmarks work without a router or server fallback. An unknown or locked hash opens "About you".
- Inactive steps stay **mounted but hidden** (`[hidden]`, enforced globally with `display: none !important`), so unsaved drafts survive moving between steps. Features are still keyed by session ID (rule 4).
- Each user-driven step change moves focus to the step's `<h2>` and updates `document.title` ("Step 2 of 5: Things you did – ReboundOps").
- On narrow screens the step list collapses behind a toggle with `aria-expanded`.
- Before a session exists, "About you" shows the **guided questions** (`rb-onboarding`) by default, or the full form (`rb-intake`) if the user asks for it; the step list and Back/Continue buttons appear once the session exists. The guided flow keeps answers in component memory and creates the session with one `submitIntake` call from its summary ([details](onboarding.md)).
- The full form starts blank (the fictional example loads only on request) and reloads from the active session whenever its id changes, so "Update intake" always edits the real answers.
- The global notice is a `role="status"` element that is always rendered, so new text is announced.
- Navigation never changes the session. Successful intents may advance the wizard (intake → Things you did; choosing an option → Your 7-day plan; resume/restore → the plan if one exists).

### Application records (operations store)

- The records live in the operations store ([ADR 0004](adr-0004-operations-store.md)), not in the recovery session, so they never enter session backups or AI payloads. Their intents (`checkTracker`, `importTracker`, `exportTracker`, `createOperationsBackup`, `restoreOperationsBackup`, `redactTrackerRecord`) are on `SessionStore` and share its `busy` lock, error and notice; they leave the session and the AI preview alone.
- `SessionStore.operationsAvailable` comes from `GET /api/operations/status`, which never opens the store. A step with `available()` false is not listed and cannot be opened from the URL; if it disappears while open, the wizard returns to "About you".
- The screen is rendered outside the per-session loop and loaded with `@defer` on first open, so its code is not in the initial bundle; it moves focus to its own heading on that first render.
- The tracker text stays in the component's form and is sent only on "Check" (read-only) or "Import". Restoring a backup and removing a record's details each need a ticked confirmation box.
- E2e: `e2e/records.spec.ts` runs against a second API on port 4175 (`e2e/support/operations-server.mjs`: one flag on, a throwaway data folder). That store is shared by all browser projects, so the journey runs in Chromium only.

## Rules

1. **Components never inject `HttpClient`.** All requests go through `SessionStore` intents (`decideEvidence`, `chooseRoute`, `previewAi` …). The store is the only caller of `SessionApiService`.
2. **One request at a time.** `busy` serializes mutations, matching the API's single-writer, optimistic-revision model. Every mutation sends the last-seen `revision`; on HTTP 409 the store loads the server's latest session and asks the user to retry.
3. **Any successful session change clears the AI preview and analysis**, so a consent click always refers to the current data.
4. **Session-scoped UI state lives in the feature component**, not the store: form drafts, evidence-link selections and private pilot answers. The shell renders features inside `@for (current of store.activeSession(); track current.id)`, so switching, restoring or deleting a session recreates them, and per-session state can never leak into another session.
5. **Forms are typed reactive forms validated with the shared contracts** (below); never add `FormsModule`/`ngModel`.
6. **Private pilot feedback stays out of the store** on purpose: it must never reach the API, backups or AI payloads.
7. Features receive the active session as a required signal input (`session = input.required<Session>()`) and read global status from the store. All components use `OnPush` and the app runs zoneless.

## Forms and validation (roadmap B6, gap F4)

All forms are **typed reactive forms** (`ReactiveFormsModule`); there is no template-driven `ngModel` left.

- Validators come from the **shared Zod contracts** through `core/form-validation.ts`: `contractValidator(IntakeSchema.shape.role)`, plus `linesValidator` for "one per line" fields. The browser and the API enforce exactly the same rules, including trimming, length limits, integer hours and the HTTPS-only job URL.
- Zod's issue codes are turned into short, readable messages (`describeIssue`). Custom contract messages (e.g. "Source URL must use HTTPS") are passed through.
- An invalid form is **not sent**: fields are marked touched, inline messages appear, and the store shows the same summary the API returns for bad input.
- Inline messages sit **outside** the `<label>` and are linked with `aria-describedby` plus `aria-invalid`, so a control's accessible name stays stable and screen readers announce the error as its description.
- **Bundle trade-off:** importing the contract schemas brings Zod's validation core into the browser bundle (about 71 kB → about 150 kB gzipped initial; Zod's non-English locales are already removed). This was accepted because it gives one source of truth for validation, and the app is served from loopback. `angular.json` has budgets (initial: warn 850 kB, error 1 MB) to stop silent growth. The warning level was raised from 800 kB when the application records screen was added (initial bundle 799 kB → about 813 kB): the screen itself loads lazily with `@defer`, and the rest is its store intents and Angular's defer runtime. A future option is moving the contracts to `zod/mini`.

## Unit tests (roadmap B6, gap F3)

- Runner: Angular's `@angular/build:unit-test` builder with **Vitest** and jsdom (`npm run test:web`, also part of root `npm test`, so CI runs it on Linux, Windows, macOS and Node 22).
- Specs live next to the code (`*.spec.ts`). `src/app/testing/fixtures.ts` builds fictional sessions with the real `createSession`, so fixtures stay contract-valid.
- Coverage today: `SessionStore` (revision sent with every mutation, 409 conflict reload, one request at a time, AI-preview invalidation, consent-only provider calls, delete races), error mapping, contract validators, the intake and job-target forms, and the pilot-feedback export.
- Component specs stub `SessionStore` with the signals their template reads and spied intents; the store spec stubs `SessionApiService`. Playwright remains the end-to-end safety net, including `e2e/form-validation.spec.ts` for inline errors and accessibility.

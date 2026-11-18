## What and why

<!-- What does this change, and why? Link the issue it addresses, for example "Closes #12". -->

## How it was tested

<!-- Tick what you ran locally. CI runs the verify and e2e jobs on every pull request. -->

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run test:smoke`
- [ ] `PW_CHANNEL=chromium npm run test:e2e` (UI changes)
- [ ] `npm run build && npm run audit:release` (dependency, packaging or release-script changes)
- [ ] Docs updated, or no change needed

## Checklist

- [ ] Tests cover the change, and no assertion was weakened to make a test pass.
- [ ] Fixtures, screenshots and examples use **fictional data only**. No real personal data, keys, database files or backups.
- [ ] Nothing new is invented: drafts, extraction and AI output use only the user's verified facts.
- [ ] Nothing is submitted, sent or marked *Applied* without the user's explicit action.
- [ ] Any new network request needs consent and uses a documented, permitted endpoint.
- [ ] Any new dependency is necessary, pinned, licence-checked and in `package-lock.json`.
- [ ] Database changes are a new append-only migration with an upgrade test.
- [ ] I wrote this code myself or have the right to contribute it under the MIT License.

## Screenshots (UI changes)

<!-- Light and dark theme if relevant. Fictional data only. -->

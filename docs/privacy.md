# Privacy, security and data portability — local Phase 2

## Current boundaries

- UI: Angular in the browser, normally `127.0.0.1:4200`.
- API: Fastify bound to `127.0.0.1:4174`. The UI sends form data to this local process only.
- Session data: in API memory, **not persisted to disk automatically**.
- No AI provider, telemetry, hosted account, tracking pixel, résumé upload, job scraper or third-party data transmission in v0.2.
- The API limits request bodies to 128 KB and accepts only defined localhost browser origins.
- API has no user authentication. **Do not expose or reverse-proxy its port to the internet.**

## Back up

1. Open **Your data → Download session JSON** while a session is active.
2. Store the file privately, never in a public repository, issue or chat.
3. After an API restart, use **Resume a previous local backup** on the intake screen.
4. The local API validates structure, time budgets and evidence-link consistency; it assigns a new session ID.
5. Deleting a local session does **not** delete any files you previously downloaded.

Backups may contain career history, location preferences and private notes. The app does **not encrypt** downloaded files. Use operating-system disk protection.

## Delete and recover

- **Delete local session** removes it from the running API process.
- Restarting the API clears all remaining memory-only sessions. Unsaved work is lost.
- JSON snapshot import/export is the supported way to continue across restarts.
- The older static pilot's in-tab state is not compatible with these snapshots.

## Known limitations

- A local computer is not a security boundary against other processes running on it.
- Browser developer tools and extensions may access rendered content.
- Backup validity is checked for structure and internal references, **not truthfulness**.
- Manual evidence confirmation is not independent credential verification.
- Before adding an AI provider, show exactly what information would leave the machine and obtain user consent.

Use fictional sample data for public demonstrations. Keep keys and participant records out of GitHub.

# Privacy, security and data portability — local Phase 2

## Current boundaries

- UI: Angular in the browser, normally `127.0.0.1:4200`.
- API: Fastify bound to `127.0.0.1:4174`. The UI sends form data to this local process only.
- Session data: memory-only by default, including source text and correction history. Configuring a private REBOUNDOPS_DATA_DIR **and** enabling saving per session allows unencrypted local disk writes.
- No **automatic** AI provider calls, telemetry, hosted account, tracking pixel, résumé upload or job scraper. Optional external provider calls require local configuration, payload inspection and explicit consent.
- Optional **Private pilot feedback** lives only in the open Angular page; its answers are never sent to the API, included in JSON session backups or sent to an AI provider. Export creates an unencrypted local Markdown file only after explicit agreement. Refreshing the page or switching sessions discards unsaved answers.
- The API limits request bodies to 128 KB, rejects non-loopback Host headers and browser cross-site requests, and accepts only specified localhost browser origins. This is defense in depth for a local-only API, not authentication.
- API has no user authentication. **Do not expose or reverse-proxy its port to the internet.**

## Back up

1. Open **Your data → Download session JSON** while a session is active.
2. Store the file privately, never in a public repository, issue or chat.
3. After an API restart, use **Resume a previous local backup** on the intake screen.
4. The local API validates structure, time budgets and evidence-link consistency; it assigns a new session ID.
5. Deleting a local session does **not** delete any files you previously downloaded.

Backups also contain all retained pasted source document texts, original and revised claims and correction reasons. Backups may contain career history, location preferences and private notes. The app does **not encrypt** downloaded files. Use operating-system disk protection.

## Delete and recover

- **Delete local session** removes it from the running API process and deletes its opted-in local disk copy, if any.
- Restarting the API clears memory-only sessions. Explicitly opted-in saved sessions can be resumed after restart.
- Explicit JSON backup/restore also works across restarts. Import always creates a memory-only session; users must opt in again if they want local disk saving.
- The older static pilot's in-tab state is not compatible with these snapshots.

## Optional research feedback — local download only

During a facilitated study, participants may answer optional questions about clarity, confusion, attempted real-world actions and willingness to use the tool again. No answers are auto-collected. The local Markdown feedback file contains only form answers, an optional anonymous code, the selected route and the date, not résumé data. The respondent must review/redact before deciding whether to share it; explicit permission is still required before publishing quotes. An app checkbox authorizes export only; it is not a substitute for facilitator consent or retention controls.

## Optional external provider — only after explicit opt-in

With the default environment, no AI provider calls can occur. If `REBOUNDOPS_AI_ENABLED=true` **and** a server-side Anthropic API key are configured, the user can:

1. Select a job target and request a preview (local-only; no provider call).
2. Inspect the exact JSON containing the selected target title/requirements and **only confirmed** achievement claims. Location, income urgency, preferences and notes are omitted.
3. Explicitly click **I consent: send this exact payload**. Only this action may send the displayed information to Anthropic for processing.

Provider billing and data policies apply. Do not enable it for confidential data or participants without explicit agreement. The model's output may be wrong; all suggestions remain unapplied and require user review. Invalid references are discarded. The API refuses stale previews and caps AI attempts per process.

## Known limitations

- A local computer is not a security boundary against other processes running on it.
- Browser developer tools and extensions may access rendered content.
- Backup validity is checked for structure and internal references, **not truthfulness**.
- Manual evidence confirmation is not independent credential verification.
- Before adding an AI provider, show exactly what information would leave the machine and obtain user consent.

Use fictional sample data for public demonstrations. Keep keys and participant records out of GitHub.

## Git protection for workspace records

CVs, profile and two-pager settings, private memory, career plans, plugin configuration and generated career-record directories belong to the user layer. Ignore rules keep these canonical paths out of ordinary `git add .`; the release audit also rejects them if force-staged. System scaffolds and fictional test fixtures remain trackable. Ignore rules do not remove an already tracked file or copies in Git history. Never force-add personal records.

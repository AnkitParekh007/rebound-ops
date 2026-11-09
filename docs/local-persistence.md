# Durable local sessions — opt-in and recovery

## How to enable

ReboundOps remains memory-only by default. The integrated launcher configures a private folder outside Git (`${XDG_DATA_HOME:-$HOME/.local/share}/reboundops/sessions`, overridable with `REBOUNDOPS_DATA_DIR`). Saving still requires explicit consent: check **Save on this computer** during intake or choose it in **Save and resume**. For separately started API processes, configure a folder as shown below and opt in through the browser. Setting the folder alone does not save any sessions.

Start the API using a private, non-synced directory outside your Git checkout:

~~~sh
REBOUNDOPS_DATA_DIR="$HOME/.reboundops/sessions" npm run dev
~~~

`npm run dev` starts the API and the Angular frontend together (use `npm run dev:api` to start only the API). Then open the Angular frontend and explicitly enable saving for the current session. After restarting the API, click **Resume session** on the intake screen to reopen an opted-in session. Sessions not opted in are lost on restart. **Importing a JSON backup always starts a memory-only session**.

## Privacy and file safety

- Files are plain JSON, **not encrypted**. Use disk encryption and private folders; never store real résumés or backups in Git.
- Each saved session lives in a separate UUID-named file in the configured folder. Files include all pasted source text, corrections, review notes and selected actions.
- The format is versioned with formatVersion 1 and the validated session schemaVersion 1. Older-schema files and backups are upgraded automatically on load; before the first rewrite, the original is kept as `<id>.schema-v<N>.backup`. Files from a newer build are refused and left untouched. See [schema migrations](schema-migrations.md). Legacy backup files without the new persistence flag are still loadable through manual JSON restore.
- Writes use exclusive private temporary files, a file flush, atomic rename and a best-effort directory flush. This reduces risk of partial writes on ordinary local filesystems but cannot guarantee recovery across every power failure or filesystem.
- On Unix, the data folder and files use restricted permissions. Do not point to a shared directory, symlink, cloud-synced location or repository checkout.
- Files over 256 KiB, malformed JSON, unknown future versions, overly broad Unix permissions and mismatched IDs are **not loaded, deleted or overwritten automatically**. A warning is exposed through the local API. Interrupted temporary files are left untouched for diagnosis.
- Already-loaded files are compared with the current in-memory snapshot before write, opt-out or deletion. Unexpected disk changes or removal block the operation and leave the in-memory session unchanged. An unknown file or symlink is not overwritten at opt-in.
- There is **no cross-process locking**. Do not run multiple API processes against one data folder. These checks cannot guarantee safety against a concurrent writer that changes a file between check and rename.
- Sessions are validated on load, including evidence citation offsets, job support links and time budgets. Invalid or incomplete records remain available for manual recovery.
- Deleting a saved session removes both the in-memory record and its saved file; turning saving off removes the disk copy while leaving the session usable in memory. Downloaded JSON backups and other copies are unaffected.

## Recovery playbook

If the UI shows skipped saved files: stop the API, make a private backup of the folder, inspect the warning and source file offline, and do not publish its contents in an issue. The app upgrades older supported schema versions automatically (keeping the original as a `.backup` file), but deliberately does not downgrade files from newer builds or delete corrupted records.

## Test coverage and limitations

Synthetic tests exercise opt-in defaults, persistence across process restarts, opt-out, deletion, imported-backup consent reset, invalid files and leftover temporary data. No real-user or cross-platform pilot testing is claimed. An explicit manual JSON export remains recommended before major upgrades.

## Combined career backup

Start and My next step offer **Download combined career backup**. The versioned JSON contains the current recovery session and eligible local CV, profile, two-pager, memory, tracker, pipeline, source settings, reports and job descriptions. Provider settings, generated PDFs and browser data are excluded. Known source credentials are redacted; review the plaintext backup before sharing or moving it. Limits are 2 MB of workspace content, 512 KB per file and up to 100 reports plus 100 job descriptions.

Combined restore previews filenames and whether each exists. Existing files begin unselected; selecting one explicitly replaces it. Only known career paths are accepted, symlink paths are rejected, and file hashes are checked under locks before writes. A changed file requires a fresh preview. Dangerous Markdown markup is removed on restore. Errors report any files already written; this is not a cross-service transaction. Recovery restores under a new ID in memory; original sessions remain available, and saving needs renewed consent. Large recovery snapshots can be extracted as raw JSON for the full recovery interface.

Raw recovery JSON still contains only the recovery session. Combined backups do not synchronize the two interfaces or create cloud accounts.

# Moving data from an earlier version

ReboundOps does not read another application's files or folders. To bring data
across, you produce **one JSON file** in the [neutral import format](IMPORT_FORMAT.md),
check it, and then import it. Every step is read-only for the earlier version.

This procedure has not been run on real data yet. Its steps are tested only on
synthetic files.

## Before you start

- Do this in a separate session that you authorise for the purpose. That session
  needs read access to the earlier version's data. ReboundOps' own development
  sessions are not given that access.
- Take a ReboundOps backup first (**Settings → Your data → Download a backup**),
  so you can return to where you were.
- Work in a new staging folder outside both projects, for example
  `~/reboundops-migration/`. Do not put it in a Git repository. It will hold
  personal data.

## 1. Copy, never touch, the earlier data

1. Find where the earlier version stores its data (its own documentation or
   settings will say).
2. Copy that data into the staging folder. Use a plain copy, such as `cp -R` or the
   Finder. Do not open the original with tools that might write to it, such as a
   database browser in read-write mode.
3. Check that the copy is complete (file count and sizes) and then work only on the copy.

## 2. Produce the import file

Write a small one-off converter (in any language) that reads **the copy** and
writes `reboundops-import.json` in the format described in
[IMPORT_FORMAT.md](IMPORT_FORMAT.md). Rules:

- Map only what the earlier data actually contains. Leave a field out rather than
  guessing. Do not invent dates, employers, salaries or statuses.
- Use `status: "applied"` (or later) only where the earlier data recorded that
  you submitted the application. Include `appliedAt` when the date is known.
- Put free-text notes in `notes`, and status changes in `history`.
- Never include passwords, API keys or tokens.

## 3. Check the file (writes nothing)

```bash
npm run import:check -- ~/reboundops-migration/reboundops-import.json
```

This prints what would be added, which records would be rejected and why, and
any warnings. Fix the converter and repeat until there are no unexpected
rejections. Nothing is written by this command.

## 4. Preview and import

1. Open ReboundOps and go to **Settings → Import data**.
2. Choose the file. The preview shows what will be added, which jobs already
   exist (they are skipped), and which records were rejected. Nothing is saved yet.
3. Confirm to import. The import runs in a single transaction: either all of the
   previewed records are added or none are. Existing profile details are never
   overwritten, and imported experience and education stay **unverified** until
   you review them in your profile.

## 5. Afterwards

- Review the imported profile facts and mark the accurate ones as verified.
- If anything is wrong, restore the backup from the start of this procedure
  (`npm run restore -- <backup-file> --yes` while ReboundOps is stopped).
- Delete the staging folder when you no longer need it. It contains personal data.

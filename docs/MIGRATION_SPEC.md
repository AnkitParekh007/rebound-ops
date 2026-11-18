# Migration specification for a legacy-data export session

This is the hand-over specification for a **separate, explicitly authorised session** that will
turn data from an earlier job-search tool into one file ReboundOps can import. ReboundOps itself
never reads the earlier tool's files, source or folders, and its development sessions are denied
access to them. Nothing in this document has been run on real data; it is tested only with
synthetic fixtures.

Read together with [LEGACY_EXPORT_PROCEDURE.md](LEGACY_EXPORT_PROCEDURE.md) (the step-by-step
operator procedure) and [IMPORT_FORMAT.md](IMPORT_FORMAT.md) (the schema).

## 1. Scope and roles

| | |
| --- | --- |
| Input | A *copy* of the earlier tool's data, made by the person who owns it, in a staging folder outside every Git repository. |
| Output | One UTF-8 JSON file, `format: "reboundops-import"`, `formatVersion: 1`, at most 10 MB and 5,000 jobs. |
| Who runs it | The data owner, or a session they authorise for this purpose only. |
| Out of scope | Reading or reusing the earlier tool's source code, UI, tests or prompts; changing the earlier data; uploading anything anywhere. |

## 2. Target structure (summary)

```text
profile        displayName, headline, contact (email, phone, location, links),
               targetRoles, preferredCountries, workAuthorizedCountries, workArrangements,
               openToRelocation, requiresSponsorship, skills, experience[], education[], answers[]
jobs[]         title*, employer*, location, salary, sourceUrl, description, capturedAt,
               status, appliedAt, history[], notes[], contacts[], reminders[]
```

`*` required. Everything else is optional. Unknown keys make a job invalid (it is rejected on its
own; the rest of the file still imports).

## 3. Mapping rules

Fill a mapping table like the one below **from the earlier tool's own documentation or the
exported data**, not from guesses:

| Earlier concept | Neutral field | Rule |
| --- | --- | --- |
| Job / posting title | `jobs[].title` | Copy as written. |
| Company | `jobs[].employer` | Copy as written. Do not normalise names. |
| Posting link | `jobs[].sourceUrl` | Only `http(s)` URLs; drop anything else. |
| Posting text | `jobs[].description` | Plain text. Strip HTML; keep line breaks. |
| Saved / created time | `jobs[].capturedAt` | ISO 8601 with offset. If only a date is known, use `T00:00:00Z` and say so in a note. |
| Pipeline stage | `jobs[].status` and `history[]` | Map each stage to one of the nine statuses (table below). Keep the earlier stage name in the history `note`. |
| Date the person applied | `jobs[].appliedAt` | Only if the earlier data records a submission. Never infer from a stage name alone. |
| Free-text notes | `jobs[].notes[]` | One entry per note, with its own timestamp if known. |
| Recruiter / contact | `jobs[].contacts[]` | Name required; email must be valid or left out. |
| Task / reminder | `jobs[].reminders[]` | `dueOn` as `YYYY-MM-DD`; `done` only if recorded. |
| Profile facts | `profile.*` | Imported facts arrive **unverified**; the person confirms them in ReboundOps. |

Suggested status mapping (adjust to the earlier tool's real stages):

| Earlier stage (examples) | ReboundOps status |
| --- | --- |
| saved, bookmarked, wishlist | `discovered` |
| interested, shortlist | `shortlisted` |
| drafting, preparing | `preparing` |
| ready, to submit | `ready_for_review` |
| applied, submitted | `applied` (with `appliedAt` only if a date is recorded) |
| screen, interview, assessment | `interviewing` |
| offer | `offer` |
| rejected, declined by employer | `rejected` |
| withdrawn, not pursuing | `withdrawn` |

### Never

- Invent employers, dates, salaries, skills, certifications, contacts or outcomes.
- Turn a missing value into a default that looks real (for example today's date as an application date).
- Mark anything as verified.
- Include passwords, API keys, session tokens, browser cookies or files from outside the earlier data.

When a value cannot be mapped, leave the field out and add a note such as
`"Earlier stage 'Phase 3' had no clear equivalent; mapped to interviewing."`

## 4. Validation before import

1. `npm run import:check -- <file>` — validates the file and prints what would be added,
   skipped as duplicate, or rejected, without changing any data.
2. Review rejected jobs and fix the file, or accept that they will be skipped.
3. Download a ReboundOps backup (Settings → Backup and restore).
4. Import from Settings → Import data: preview, then confirm.
5. Spot-check five applications against the earlier data: titles, employers, status, applied date,
   contacts, reminders.

## 5. Acceptance criteria for a real migration

- The import preview's counts match the number of records exported, minus documented skips.
- No job has an `appliedAt` that the earlier data does not record.
- Every rejected job is listed with its reason and either fixed or knowingly dropped.
- The staging folder (it holds personal data) is deleted, or moved somewhere private, afterwards.
- The migration is recorded in `docs/IMPLEMENTATION_PROGRESS.md` as done, with counts only (no personal data).

## 6. Status

| Item | Status |
| --- | --- |
| Neutral format, preview, deduplication, per-job rejection, confirmation | Implemented and tested with synthetic files |
| Contacts and reminders in the format (v0.2.0) | Implemented and tested with synthetic files |
| Real legacy export | **Not done.** Requires the separately authorised session described above. |

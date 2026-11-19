# Changelog

All notable changes to ReboundOps are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Before 1.0, minor versions may change behaviour.

## [Unreleased]

### Added

- **Desktop apps** for macOS (Apple Silicon and Intel) and Windows x64: a native window (Tauri) around the same local server, with the Node.js runtime bundled, so nothing else needs installing. The apps use the same data folder as `npm start`. They are built and smoke-tested in CI and are not yet signed with a developer certificate (see [docs/INSTALL.md](docs/INSTALL.md#desktop-apps)).
- `REBOUND_PARENT_WATCH=stdin`: the server shuts down cleanly when its stdin closes, so a parent process (the desktop app) can stop it on every platform, including Windows.

### Changed

- The project's earlier "no desktop wrapper" decision is reversed at the owner's request; the browser-tab install from the release archive stays available.

## [0.2.0] - 2026-11-18

Pre-release. Tag `v0.2.0` (annotated) on commit `4e930db`. The archive, SBOM, third-party notices and `SHA256SUMS` attached to the release were built by CI.

### Added

- **PDF resume import**, read locally (selectable text only, no OCR). Scanned, protected or damaged PDFs are detected, and you can type the text while the original file is kept. Every fact is reviewed before it is added.
- **Discover**: look up one company's public job board on Greenhouse, Lever, Ashby or Workable, after you consent to the network request. Workday is not supported because it has no documented public API.
- **Password-protected backups** (scrypt and AES-256-GCM), and **in-app restore** with typed confirmation and a recovery copy.
- Crash-safe journalled restore with a disk-space check, and a data-folder lock.
- Undo for deleted contacts and reminders (30 days), follow-up ranking, your own follow-up templates, interview notes and CSV export.
- **Optional local AI** (Ollama): seven grounded assist tasks that withhold any output adding facts not in your records.
- The import format now carries contacts and reminders.

### Changed

- Fit rubric `fit-2026.2` (was `fit-2026.1`) adds per-skill years, seniority and published pay. Missing information is still kept separate from real disqualifiers. Assessments are recomputed rather than stored, so scores can change after upgrading.
- Closed applications reopen with their history kept, and the original submission date is kept.
- API: deleting a contact or reminder returns `200` with an undo record instead of `204`.
- The database migrates in place from schema 3 to 4. The migration only adds columns and tables, and it was tested against the real 0.1.0 release. Backups from 0.1.0 restore in 0.2.0.

### Fixed

- A body-less `DELETE` sent with `Content-Length: 0` was rejected with `415`, so deleting and undoing contacts and reminders failed in the browser (`0e06154`).

### Known limitations

- Cloud AI providers are tested with mocked requests only.
- PDF import has no OCR, and multi-column layouts may merge lines.
- The Workable integration uses the public feed behind Workable-hosted careers pages, which could change.
- Windows is untested.
- No automatic migration from earlier, non-ReboundOps tools is included yet.

## [0.1.0] - 2026-11-18

First pre-release. Tag `v0.1.0` on commit `d47d3a3`.

### Added

- **Onboarding and profile:** goals, roles, countries, remote and relocation preferences, skills, verified experience and reusable answers.
- **Resume import:** your resume becomes editable facts, and the original file is kept. Imported facts stay unverified until you confirm them.
- **Job intake:** paste a job description or URL. Details are extracted only where the text supports them, and a posting nobody has checked live is labelled unverified. A duplicate check compares URL, employer, title and description, and explains its reasons.
- **Screening:** an explainable 0–5 fit score, plus a separate eligibility status: confirmed, unconfirmed or ineligible.
- **Tailoring and documents:** editable resume and cover-letter drafts built only from your facts, with ATS-friendly PDF and DOCX export.
- **Application prep:** screening-answer drafts for you to review, and a link to the official application page when it is known.
- **Tracking:** statuses from Discovered to Offer, where Applied is only ever set by you, with an activity trail.
- **Follow-ups:** contacts, reminders and follow-up drafts. Nothing is sent automatically.
- **Dashboard:** history, filters, next actions and metrics from your saved records.
- **Data control:** local SQLite with migrations, JSON export, a lossless backup with `npm run restore`, an import for files exported from an earlier version (preview, then confirm), and a data-folder lock.
- **Optional AI:** local Ollama, or an opt-in cloud provider that needs your consent on every request.

### Known limitations

- Cloud AI providers were tested only with mocks.
- Backups were not encrypted, and restore was command-line only (both addressed in 0.2.0).
- Deleting a contact or reminder had no confirmation or undo (addressed in 0.2.0).

[Unreleased]: https://github.com/AnkitParekh007/rebound-ops/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/AnkitParekh007/rebound-ops/releases/tag/v0.2.0
[0.1.0]: https://github.com/AnkitParekh007/rebound-ops/releases/tag/v0.1.0

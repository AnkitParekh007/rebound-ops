# Installation

[← Wiki home](Home) · [First run →](First-Run-Guide)

## Prerequisites

- Node.js **24.15.0+ recommended**; package engines also allow Node 22.22.3+ and Node 26+.
- npm and Git.
- A terminal, writable local directory and internet access for first-run npm/browser downloads.
- **Linux/macOS** for the documented local developer preview. **Windows is experimental** and subject to platform acceptance checks.

You do **not** need an AI API key for the core guided recovery workflow.

## Standard installation

```bash
git clone https://github.com/AnkitParekh007/rebound-ops.git
cd rebound-ops
npm run doctor
npm start
```

Keep this terminal open; press **Ctrl+C** to stop the local services. The integrated task guide should be available at **http://127.0.0.1:4317/#/guide**.

The launcher verifies dependencies, downloads required browser components on first use, builds the recovery API and starts local services. Expect first-run network downloads.

## Other supported modes

| Purpose | Run from repository root | Visit |
| --- | --- | --- |
| Integrated recovery + job-search workspace | `npm start` | `http://127.0.0.1:4317/#/start` |
| Full Angular recovery UI + development API | `npm run dev` | `http://127.0.0.1:4200` |
| Compiled local recovery UI/API | `npm run build`, then `npm run start -w @reboundops/api` | `http://127.0.0.1:4174` |

**Important:** The integrated workspace and Angular recovery UI are distinct interfaces. They share the recovery API but do not automatically synchronize all job-search files and session records. The launcher exposes **Open full recovery** for the richer evidence workflow.

## Browser setup failures

Try `npm run doctor`, verify Node version, and inspect the first actual terminal error. If Chromium cannot start on Linux, follow the printed installation instructions, which may include:

```bash
cd engine
npx playwright install --with-deps chromium
```

Avoid running commands as administrator unless installing OS packages is explicitly required.

## Upgrading

Before pulling updates, export your current recovery session and any combined career backup. These files are **unencrypted**; store them privately. Check the [release notes](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/preview-release-notes.md) and [schema migration documentation](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/schema-migrations.md) before resuming older saved sessions.

See [Troubleshooting](Troubleshooting) and the [repository quick start](https://github.com/AnkitParekh007/rebound-ops#quick-start).

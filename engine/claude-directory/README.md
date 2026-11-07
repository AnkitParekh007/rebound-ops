# rebound-ops

Open-source AI job search that runs locally in Claude Code: scan job portals, evaluate listings into a structured A-H report with a 1-5 score, tailor your CV and track your applications. Your CV, reports and tracker are files on your machine.

This is the rebound-ops plugin for the Claude plugin directory. Project home: https://github.com/AnkitParekh007/rebound-ops

## How it works

The plugin adds one skill, `rebound-ops`. The skill is a router: the modes, scripts and rules it follows live in a rebound-ops folder on your machine.

On first use the skill looks for an existing rebound-ops folder: the one named in `REBOUND_OPS_ROOT`, then `./rebound-ops`, then `~/rebound-ops`. If there is none, it asks you before installing one with `node engine/scaffolder/bin/cli.mjs init`. After that, paste a job URL or ask for a mode, for example a portal scan or a tailored CV. <!-- x-release-please-version -->

rebound-ops runs in Claude Code, in the terminal or in the Code tab of the Claude desktop app. In Chat the skill can explain rebound-ops, but it cannot run it.

## What it runs, sends and fetches

**The plugin itself** is one Markdown file. It has no hooks, no MCP servers and no scripts, and it runs nothing until you agree to the install.

**The install**, only after you say yes:

- `npx` downloads the `@reboundops/rebound-ops-engine-installer` installer from the npm registry.
- The installer asks the GitHub API for the latest rebound-ops release and clones it from github.com/AnkitParekh007/rebound-ops into `./rebound-ops`.
- It runs `npm install` in that folder. That downloads the Node packages from the npm registry, and Playwright downloads a Chromium browser.

**Day to day**, rebound-ops runs Node scripts from that folder:

- **Your files stay local.** Your CV, profile, reports and tracker are files in the folder. No account, no telemetry, no backend of ours.
- **The AI model sees what you work on.** The job descriptions and the parts of your CV it evaluates go to the model you use in Claude, as part of the conversation. A few optional scripts call another AI provider (Google Gemini, OpenAI, OpenRouter or a local Ollama) only if you set up that provider's key yourself.
- **Portal scans read public job listings.** They fetch listings from the job boards you turn on in `portals.yml`: applicant tracking systems such as Greenhouse, Ashby, Lever, Workable and SmartRecruiters, and the regional boards in [`providers/`](https://github.com/AnkitParekh007/rebound-ops/tree/main/engine/providers). These requests read listings; they don't send your CV or profile.
- **A browser on your machine.** Playwright opens job pages in a headless Chromium to read listings and to check whether a role is still open, and it renders your CV to PDF locally.
- **Update checks.** On the first message of a session rebound-ops asks the GitHub API whether there is a newer release. It updates only when you say yes.
- **Optional local apps.** A web UI (`npm run ui`) listens only on 127.0.0.1; it refuses to open to the network unless you allow that explicitly. A terminal dashboard you build yourself with Go (`npm run build:dashboard`) compiles on your machine and downloads its Go modules through the Go module proxy.
- **Optional scheduled scans.** Only if you install them: `web/scripts/install-scan-schedule.sh` adds a user-level LaunchAgent (macOS) or one marked crontab line (Linux), and `install-scan-schedule.ps1` adds a scheduled task (Windows). Every 15 minutes it runs at most one of the scans you saved in the web UI. `uninstall-scan-schedule.sh` (or `.ps1`) removes it.

rebound-ops can fill application forms and draft answers. It drafts and fills; it never submits. You press Submit.

## Privacy and license

- What leaves your machine, and where it goes: [What it runs, sends and fetches](#what-it-runs-sends-and-fetches), above.
- The github.com/AnkitParekh007/rebound-ops website and its mailing list have their own privacy policy: https://github.com/AnkitParekh007/rebound-ops
- License: MIT. See [LICENSE](LICENSE).

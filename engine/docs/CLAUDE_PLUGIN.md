# Running rebound-ops as a Claude Code plugin

rebound-ops ships a Claude Code plugin manifest (`.claude-plugin/`), so you can install it once and use it from any folder: the Claude Code CLI, or the Code tab of the Claude desktop app. You don't need to open the rebound-ops checkout as your project.

If you already work inside a rebound-ops checkout, you don't need the plugin: the checkout's own `.claude/skills/rebound-ops` gives you `/rebound-ops` there.

## Install

**From the Claude desktop app (Customize):**

1. Open **Customize → Plugins**.
2. Select **Add → Add marketplace** and enter `AnkitParekh007/rebound-ops`.
3. Open **Discover**, find **rebound-ops**, and select **Add**.

The plugin is saved to your claude.ai account. The Code tab downloads it as a synced plugin the next time a session starts.

**From a Claude Code session:**

```text
/plugin marketplace add AnkitParekh007/rebound-ops
/plugin install rebound-ops@rebound-ops
```

For a fork, replace `AnkitParekh007/rebound-ops` with your fork's `owner/repo`.

Then start a new session. The first start takes a few seconds longer while the plugin installs its Node packages. Run `/rebound-ops:rebound-ops` to open the command menu, or paste a job URL. On a fresh setup the agent walks you through onboarding.

## Where your files live

| What | Where | Survives a plugin update? |
|------|-------|---------------------------|
| rebound-ops code | `~/.claude/plugins/cache/rebound-ops/rebound-ops/<version>/` (Customize installs: `~/.claude/plugins/synced/`) | No, it is replaced |
| Node packages | `${CLAUDE_PLUGIN_DATA}/node_modules`: `~/.claude/plugins/data/rebound-ops-rebound-ops/` for a `/plugin` install, `~/.claude/plugins/data/rebound-ops-synced/` for a Customize install | Yes |
| Your CV, profile, tracker, reports | `~/rebound-ops-data` | Yes, Claude Code never touches it |

Claude Code replaces the code folder on every plugin update, so rebound-ops never keeps your files there. `path-resolver.mjs` detects a plugin install and uses `~/rebound-ops-data` when nothing else names a data folder.

To use another folder, set `REBOUND_OPS_ROOT` (or `REBOUND_OPS_DATA_DIR`) to an absolute path in `~/.claude/settings.json`. A folder inside `~/.claude/plugins/` is refused: rebound-ops scripts stop with an error that names the variable, and `node doctor.mjs` reports it.

```json
{
  "env": {
    "REBOUND_OPS_ROOT": "/absolute/path/to/job-search"
  }
}
```

That setting applies to every Claude Code session, including one you open in a rebound-ops checkout, where it moves the checkout's data root too.

To keep using the files in a checkout you already have, point `REBOUND_OPS_ROOT` at that checkout. Alternatively, add the checkout itself as a local marketplace (`/plugin marketplace add ~/rebound-ops`). Claude Code then loads the plugin in place from the checkout, nothing is copied, and the checkout keeps its own data and `node_modules`.

Uninstalling the plugin deletes the Node packages folder, not `~/rebound-ops-data`.

## What the plugin adds at session start

`hooks/hooks.json` runs `scripts/claude-plugin-session-start.mjs` when a session starts. For a plugin install it does two things:

1. **Installs the runtime packages.** It runs `npm install --omit=dev --ignore-scripts` into the plugin's data folder, then links that `node_modules` into the code folder. It reinstalls only when `package.json` changes, so later sessions start silently. Sessions that start together take turns: the check, the install and the link run under a lock in the data folder, so two of them never run `npm install` there at once. An install that runs past 3 minutes is stopped and reported, so the lock is released before the hook's own 5-minute limit. On Windows, stopping it ends the shell that started npm, and npm itself may keep running. Claude Code's own dependency install needs a committed `package-lock.json`, which this repository doesn't keep.
2. **Creates the data folder** if it is missing.

For a checkout loaded in place, the hook does nothing. Its packages and data are yours to manage.

The hook skips Playwright's browser download because it takes minutes. `node doctor.mjs` reports when Chromium is missing. Install it from the plugin's code folder with `npx playwright install chromium`; Chromium is shared per user, so an existing rebound-ops checkout may already have it.

## Updating

Claude updates the plugin, not `update-system.mjs`. Inside a plugin install, `node update-system.mjs check` reports `managed-by-plugin`, and `apply` and `rollback` refuse.

- **Customize installs:** open the marketplace under **Customize → Plugins** and turn on **Sync automatically**, or select **Check for updates** to pull now.
- **`/plugin` installs:** open `/plugin`, find rebound-ops under **Installed** and update it, or turn on auto-update for its marketplace on the **Marketplaces** tab.

The manifest pins `version`, so an install stays on that version until `version` changes. If you ship changes from a fork, bump `version` in `.claude-plugin/plugin.json`, then copy that file verbatim to `.codex-plugin/plugin.json` and `.github/plugin/plugin.json`.

## Known limits

- **Two skills inside a checkout.** In a session opened in a rebound-ops checkout with the plugin enabled, both `/rebound-ops` (the checkout's) and `/rebound-ops:rebound-ops` (the plugin's) appear. They read different data roots unless `REBOUND_OPS_ROOT` is set, so pick one.
- **Windows.** The hook links `node_modules` with a directory junction. This hasn't been verified on Windows yet.
- **Chat and Cowork.** A Customize install also appears in Chat and Cowork, but rebound-ops only runs in Claude Code. Chat has no access to your files, and Cowork's shell can't install the plugin's packages. For Cowork, mount a checkout instead: see [COWORK.md](COWORK.md).

# rebound-ops

One-command installer for [**rebound-ops**](https://github.com/AnkitParekh007/rebound-ops) — the AI-powered job search pipeline built on Claude Code.

```bash
node engine/scaffolder/bin/cli.mjs init
```

This sets up a ready-to-use workspace:

1. Clones rebound-ops at the latest stable release (when none can be resolved, for example because the GitHub API is unreachable or rate-limited, it clones `main` instead and says so)
2. Installs dependencies

Then open your AI coding tool in the folder. **On first launch the agent walks you through setup — your CV, profile and target roles — just by chatting.** Nothing to configure by hand. rebound-ops is AI-agnostic — Claude Code, Gemini, Codex, Qwen, OpenCode, GitHub Copilot CLI, Antigravity CLI, Grok Build CLI, and Hermes all work.

The installer bootstraps CLI skill entrypoints after clone, so new CLIs (e.g. Grok) work even when `npx` pulled an older release tag.

## Usage

```bash
node engine/scaffolder/bin/cli.mjs init [folder]   # default folder: ./rebound-ops
```

Prefer the manual route? `git clone` still works exactly as before — see the [setup guide](https://github.com/AnkitParekh007/rebound-ops/blob/main/engine/docs/SETUP.md).

## Requirements

- Node.js 22.13+
- git

## License

MIT © [Santiago Fernández de Valderrama](https://santifer.io)

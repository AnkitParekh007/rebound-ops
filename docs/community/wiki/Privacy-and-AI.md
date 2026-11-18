# Privacy and AI

ReboundOps is designed so that your job search stays on your computer unless you decide otherwise. This page summarises the behaviour described in the [README](../../../README.md#privacy-and-ai-choices) and [docs/RELEASE_READINESS.md](../../RELEASE_READINESS.md).

## Where your data lives

- One SQLite database in `~/.reboundops`, or the folder in `REBOUND_DATA_DIR`. The folder is created with `0700` permissions and the files with `0600` (best effort on Windows).
- The server listens only on a loopback address (`127.0.0.1` by default) and refuses other host names.
- Logs default to `warn` and never include request bodies or URLs.
- There is no account, no telemetry and no project-run cloud service.

## What each optional feature sends

| Feature | Sent | When |
| --- | --- | --- |
| Local only (default) | Nothing | Always |
| Discover | The board name you typed, to that job board's public HTTPS endpoint | Only after you allow it. One request per second per host, no cookies, 30-minute cache |
| Ollama | The text a task needs, to Ollama on your own machine | When you run an assist task. Ollama must be on a loopback address |
| Cloud AI (Anthropic, OpenAI, Gemini, OpenRouter) | Only the text a task needs, using verified profile entries only | Only with your consent for that request. Keys come from environment variables and are never stored or shown |

Cloud providers are tested with mocked requests only. Their own privacy terms apply to anything you send them.

## What AI is allowed to do

AI only suggests: rewording, summaries, missing skills, interview questions and drafts. Each suggestion is checked against your records, and anything that introduces a fact you have not recorded is withheld. Nothing an AI suggests is saved until you choose to save it. Every feature works with AI off.

## Backups

Backups can be password-protected (scrypt and AES-256-GCM). The password is never stored and cannot be recovered. Keep backups somewhere you control.

## Removing your data

Stop ReboundOps and delete the data folder. Download a backup first if you might want the data later.

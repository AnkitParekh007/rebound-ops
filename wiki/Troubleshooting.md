# Troubleshooting and support

[← Wiki home](Home) · [Installation](Installation)

## A local page will not open

- Check whether `npm start` is still running and inspect its printed ports.
- Use `npm run doctor` to detect version and local-port issues.
- Check the exact URL: integrated `127.0.0.1:4317`, Angular dev `127.0.0.1:4200`, compiled recovery API `127.0.0.1:4174`.
- If a port is already in use, identify the process before terminating anything.

## Install or browser automation fails

- Use a compatible Node version and npm; run `npm ci` when working on dependencies.
- The first run needs internet for packages and Chromium.
- Linux Chromium may need host libraries; follow the `playwright install --with-deps chromium` guidance printed by the launcher.
- Never paste tokens or full private filesystem paths into a public issue.

## My data disappeared after restart

Recovery sessions are memory-only unless local saving was configured **and** opted into for that session. Restore from your own private JSON backup if you created one. A local workspace CV/pipeline file does not automatically restore a recovery session.

## My generated result looks inaccurate

Job reviews and AI suggestions are advisory. Check the source excerpts, requirements, user-confirmed evidence and provider configuration. Correct unsupported claims before exporting an application.

## My provider call failed

Confirm the configured provider, exact payload preview, valid credentials, quota and consent. Never expose an API key in logs or support threads. Retry with fictional data.

## Where to ask for help

- **Usage questions:** [Discussions](https://github.com/AnkitParekh007/rebound-ops/discussions)
- **Reproducible non-sensitive bugs:** [Issues](https://github.com/AnkitParekh007/rebound-ops/issues)
- **Sensitive security reports:** [Security policy](https://github.com/AnkitParekh007/rebound-ops/blob/main/SECURITY.md)

A helpful bug report includes OS, Node version, exact command, sanitized error output, expected behavior and minimal fictional reproduction.

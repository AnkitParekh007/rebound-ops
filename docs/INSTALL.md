# Installing and running ReboundOps

ReboundOps runs on your own computer as a small local web service. It does not need an account,
and it stores everything in one private database folder.

## Requirements

| | |
| --- | --- |
| Node.js | 24 or newer (`node --version`) |
| npm | 11 or newer (bundled with Node 24) |
| Disk | about 100 MB for the app and its runtime libraries (measured: 96 MB, most of it the PDF reader), plus your data |
| Memory | about 105 MB resident after serving the app and dashboard (measured on Apple Silicon); a PDF import temporarily uses more |
| Network | needed once to install runtime libraries; afterwards only if you use Discover or a cloud AI provider |
| Optional | [Ollama](https://ollama.com) with a model you have already pulled, for local AI help |

### Platform support

| Platform | Status |
| --- | --- |
| macOS on Apple Silicon | Primary target; verified on a current macOS release on the development machine (older versions not tested). Fresh install, upgrade from v0.1.0, PDF import and restore are verified by `npm run verify:release`. |
| macOS on Intel | The desktop app is built and smoke-tested in CI on an Intel runner: start, health, web app served, clean stop. The full browser journey is not run there. |
| Linux (x64) | Tested in CI (Ubuntu): unit, API, packaged-serving, release verification and browser journey. No desktop app; use the release archive. |
| Windows 11 | The desktop app is built and smoke-tested in CI on Windows Server 2025 (same checks as Intel macOS). Not yet tested by hand on Windows 11. File-permission hardening (0600/0700) is best effort on Windows. |

There are two ways to run ReboundOps: the **desktop app** (below), or the **release archive** with
your own Node.js, used in a browser tab. Both run the same local server and use the same data folder.

## Desktop apps

Builds are available for **macOS on Apple Silicon**, **macOS on Intel** and **Windows 11 (x64)**:
`ReboundOps-<version>-macos-arm64.zip`, `…-macos-x64.zip` and `…-windows-x64.zip`. Each one contains
its own Node.js runtime, so you don't need to install anything else. Linux users can use the release archive.

1. Check the download against `SHA256SUMS-<target>.txt` (`shasum -a 256 <zip>` on macOS,
   `Get-FileHash <zip>` in PowerShell).
2. **macOS:** unzip, move `ReboundOps.app` to Applications and open it.
3. **Windows:** unzip the whole folder and open `ReboundOps.exe`. Windows 10 and 11 already include
   the WebView2 runtime it uses.

The apps are not yet signed with a paid Apple or Microsoft developer certificate, so the first launch
needs one extra step:

- **macOS** says it cannot verify the developer. Open **System Settings → Privacy & Security**, scroll
  down and click **Open Anyway** next to ReboundOps, then confirm. Later launches open normally.
- **Windows SmartScreen** may say it protected your PC. Click **More info**, then **Run anyway**.

The app keeps your data in `~/.reboundops`, the same folder as `npm start`. Only one copy can use it at
a time; if another copy is running, the app says so instead of starting. Opening the app again while it
is running brings the existing window to the front. Links to job postings and application pages open
in your default browser, and exported PDF, DOCX and backup files are saved to your Downloads folder.

Not included yet: code signing and notarisation, automatic updates, a Linux desktop build, Windows on Arm.

## Install from a release archive

1. Download `reboundops-<version>.tar.gz`, `SHA256SUMS`, `THIRD_PARTY_NOTICES.txt` and the `.sbom.json`.
2. Check the archive:

   ```bash
   shasum -a 256 -c SHA256SUMS
   ```

3. Unpack and install the runtime libraries (no build tools, no install scripts):

   ```bash
   tar -xzf reboundops-0.2.0.tar.gz
   cd reboundops-0.2.0
   npm ci --omit=dev --omit=optional --ignore-scripts
   ```

## Start and stop

```bash
npm start
```

Open the address it prints (default `http://127.0.0.1:4175`). Stop with `Ctrl+C`; ReboundOps closes
the database cleanly and releases its data-folder lock.

| Setting | Environment variable | Default |
| --- | --- | --- |
| Data folder | `REBOUND_DATA_DIR` | `~/.reboundops` |
| Port | `REBOUND_API_PORT` | `4175` |
| Log level | `REBOUND_LOG_LEVEL` | `warn` (no request or personal data is logged) |

Only one ReboundOps can use a data folder at a time; a second one refuses to start.

## Upgrading from v0.1.0

Stop v0.1.0, install v0.2.0 as above, and start it with the same data folder. The database is
migrated from schema 3 to 4 on first start (new tables only; nothing is removed). Downloading a
backup first is recommended. Backups made by v0.1.0 restore in v0.2.0.

## Backups and restore

- **Settings → Backup and restore** downloads a backup, optionally password-protected
  (AES-256-GCM, key from scrypt). Keep the password: it cannot be recovered.
- **Restore in the app**: choose the file, enter the password if it has one, compare the record
  counts, type `RESTORE`. A recovery copy of your current data is written to
  `<data folder>/recovery-backups/` first.
- **Restore from the command line** (with ReboundOps stopped):

  ```bash
  npm run restore -- <backup-file>
  ```

  checks the file; add `--yes` to restore. Password-protected backups ask for the password or read
  `REBOUND_BACKUP_PASSWORD`.

If a restore is interrupted (power loss, full disk), the next start puts the previous database back
automatically.

## Building a release (maintainers)

```bash
npm ci
npm run package:release      # needs a clean working tree; writes release/
npm run verify:release       # fresh install + upgrade from the v0.1.0 tag
```

The archive is reproducible: the same commit gives byte-identical output (timestamps come from the
commit). Nothing is published by these commands.

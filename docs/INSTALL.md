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
| macOS on Intel | Expected to work (no native code is required); not separately tested. |
| Linux (x64) | Tested in CI (Ubuntu): unit, API, packaged-serving, release verification and browser journey. |
| Windows 11 | Not tested. Node-only, so it may work; file-permission hardening (0600/0700) is best effort on Windows. |

ReboundOps has no desktop wrapper. A browser tab on `http://127.0.0.1:4175` is the interface; an
Electron or Tauri shell would add size and update work without changing what the app can do.

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

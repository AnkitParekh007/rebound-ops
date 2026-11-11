# AGENTS.md reference: Headless / batch mode and JD captures

<!-- Moved verbatim from AGENTS.md to keep the always-loaded context small. AGENTS.md links here with a "MUST read before" trigger. Same authority as AGENTS.md. -->

Paths keep their `AGENTS.md` meaning. System files (scripts, `modes/` except the three user files below, `templates/`, `docs/`, `batch/` scripts) are relative to the engine root, the directory that holds `AGENTS.md`. User-layer paths (`cv.md`, `config/`, `modes/_profile.md`, `modes/_custom.md`, `modes/_brief.md`, `voice-dna.md`, `data/`, `reports/`, `jds/`, `output/`, `batch/tracker-additions/`, …) resolve under the data root, and the tracker under its own path, exactly as `AGENTS.md` → **Data Contract** defines them: `REBOUND_OPS_ROOT` / `REBOUND_OPS_DATA_DIR` or the `.rebound-ops-data` marker for the root, and `REBOUND_OPS_TRACKER` or `{DATA_ROOT}/data/applications.md` for the tracker, falling back to `{DATA_ROOT}/applications.md` when reading an existing one. Individual files can also be redirected by their own variable, for example `REBOUND_OPS_PROFILE` (profile), `REBOUND_OPS_PORTALS`, `REBOUND_OPS_PIPELINE`, `REBOUND_OPS_SCAN_HISTORY`, `REBOUND_OPS_REPORTS_DIR`, `REBOUND_OPS_FOLLOWUPS` and `REBOUND_OPS_BLACKLIST`. When one is set it wins over the data-root path, so check the environment, or use the script that reads the file, before reading or editing a file at its default path. A nonblank `REBOUND_OPS_PROFILE` resolves a relative value against the working directory; otherwise the profile is `{DATA_ROOT}/config/profile.yml`. In scripts use `path-resolver.mjs` (`getReboundOpsRoot()`, `resolveTrackerPath(root)`, `resolveTrackerPathForWrite(root)`, `getProfilePath()`).

## Headless / Batch Mode


Headless worker command per CLI:

| CLI | Command |
|-----|---------|
| Claude Code | `claude -p "prompt"` |
| **OpenCode** | `opencode run "prompt"` (falls back to `ollama launch opencode -y -- run "prompt"` if `opencode` binary is not in PATH) |
| Pi | `pi -p "prompt"` |
| Copilot CLI | `copilot -p "prompt"` |
| Codex | `codex exec "prompt"` |
| Qwen | `qwen -p "prompt"` |
| Antigravity CLI | `agy -p "prompt"` |
| Grok Build CLI | `grok -p "prompt"` |

## JD captures (`jds/`)


`local:jds/{file}` is the reference form everywhere a JD is cited — `data/pipeline.md` entries, `triage`, `pipeline`, and the tracker notes column. Any filename is valid behind it; several writers coexist and none is canonical:

| Writer | Filename |
|--------|----------|
| `archive-posting.mjs` | `{YYYY-MM-DD}_{company}_{role}_{sha256(url)[0:16]}.pdf` (then `-2`, `-3`, etc. before `.pdf` on collision) |
| `archive-posting.mjs --report=N` | `{NNN}-{YYYY-MM-DD}_{company}_{role}_{sha256(url)[0:16]}.pdf` (same collision suffix) |
| `plugins/apify/index.mjs` | `{company}-{role}-{sha1(url)[0:10]}.md` |
| `scan` mode (manual save) | `{company}-{role-slug}.md` |

**Prefer `--report=N` when archiving for a tracked row.** A capture named only from the date and the scraped company and role can be found again only by rebuilding that exact string, so it stops resolving the day after it is written — precisely when the posting has gone dead and the capture is the only remaining record. `jd-capture.mjs` looks captures up by report number instead, matching padded and unpadded prefixes (`064-`, `64-`, `01-`), and `outcome.mjs` uses it before falling back to re-archiving a live URL.

A capture is copied into `data/outcomes/` under its own extension (`posting.pdf`, `posting.txt`, `posting.md`), never renamed to `.pdf`.

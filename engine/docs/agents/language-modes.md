# AGENTS.md reference: Multiple simultaneous target markets

<!-- Moved verbatim from AGENTS.md to keep the always-loaded context small. AGENTS.md links here with a "MUST read before" trigger. Same authority as AGENTS.md. -->

Paths keep their `AGENTS.md` meaning. System files (scripts, `modes/`, `templates/`, `docs/`, `batch/` scripts) are relative to the engine root, the directory that holds `AGENTS.md`. User-layer paths (`cv.md`, `config/`, `data/`, `reports/`, `jds/`, `output/`, `batch/tracker-additions/`, …) resolve under the data root, and the tracker under its own path, exactly as `AGENTS.md` → **Data Contract** defines them: `REBOUND_OPS_ROOT` / `REBOUND_OPS_DATA_DIR` or the `.rebound-ops-data` marker for the root, and `REBOUND_OPS_TRACKER` or `{DATA_ROOT}/data/applications.md` for the tracker, falling back to `{DATA_ROOT}/applications.md` when reading an existing one. The profile is the one exception to the data-root rule: a nonblank `REBOUND_OPS_PROFILE` selects the profile file (a relative value resolves against the working directory); otherwise it is `{DATA_ROOT}/config/profile.yml`. In scripts use `path-resolver.mjs` (`getReboundOpsRoot()`, `resolveTrackerPath(root)`, `resolveTrackerPathForWrite(root)`, `getProfilePath()`).

## Multiple simultaneous target markets

**Multiple simultaneous target markets (#3793).** `language.modes_dir` may also be a **list** of declared candidate markets, for a candidate genuinely running parallel campaigns — not switching sequentially — e.g. a candidate applying in both the DACH region and China at once:

```yaml
language:
  output: en
  modes_dir: [modes/de, modes/zh] # DACH and China
```

Declared, not inferred: the user states which markets they are actually running campaigns in. When two or more are declared:
- The FIRST entry is the **primary** market and supplies the evaluation-mode file (`oferta.md`/`angebot.md`/...) — one JD can only be evaluated against one set of A-F rules at a time.
- EVERY declared market's `_shared.md` is loaded into context, not just the primary one.
- `modes` itself is a valid list entry: it represents the default/global rules for a target market that has no localized directory. It still counts as a declared candidate market; when first, it supplies `modes/oferta.md`, and `modes/_shared.md` is loaded once as the baseline rather than duplicated as an additional market include.
- Per-JD, which declared market's concepts actually apply is determined from the JD's own **MARKET signals** — hiring-entity jurisdiction, currency, benefits/legal vocabulary — the same judgment Block G's posting-legitimacy signals already exercise (`modes/oferta.md`: "benefits/employment terminology country mismatch", "third-party platform location tag mismatch"). **Never infer the market from the JD's language alone.** A French-language Quebec/federal-Canada JD needs Canada's concepts (EI, CPP, ESA) — not `modes/fr`'s France/Belgium/Switzerland/Luxembourg concepts (CDI/CDD, SYNTEC, RTT) — because language and market are different axes.
- When the market signal is genuinely ambiguous between two declared candidates, branch on whether anyone can answer: in an **interactive session**, ask the candidate and stop before writing or merging a report/tracker entry until they choose; in an **unattended run** (`<cli> -p`, `codex exec`, or a batch worker), continue with the first/primary market and state the ambiguity plus the primary-market fallback explicitly in the report header or Block G.

A single-string `modes_dir` (today's default, ~90% of users) behaves exactly as before — this is additive, not a breaking change.

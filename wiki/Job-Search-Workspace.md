# Job-search workspace

[← Wiki home](Home) · [First run](First-Run-Guide)

The integrated workspace runs through `npm start`; its main entry point is `http://127.0.0.1:4317/#/start`.

## Workflow

1. **Profile and CV:** Review working information before using it as a source of truth.
2. **Sources:** Configure public job sources and filters. Coverage varies by adapter and employer.
3. **Scan:** Explore discovered postings, check relevance, and place promising opportunities in the pipeline.
4. **Evaluate:** Compare role requirements with your verifiable evidence. Manual prompts may be used when AI is not configured.
5. **Prepare:** Use CV Studio and document preparation tools, reviewing every generated claim.
6. **Track:** Record the application status, notes and next follow-up.

## Main routes

| Page | Local route |
| --- | --- |
| Workbench | `#/dashboard` |
| Scan | `#/scan` |
| Pipeline | `#/pipeline` |
| Evaluate | `#/evaluate` |
| CV / CV Studio | `#/cv` · `#/cv-studio` |
| Applications | `#/tracker` |
| Reports | `#/reports` |
| Settings / Help | `#/config` · `#/help` |

## Local workspace files

The default job-search directory is `engine/`. Important paths include `engine/cv.md`, `engine/config/profile.yml`, `engine/portals.yml`, `engine/data/pipeline.md`, `engine/data/applications.md`, `engine/reports/` and `engine/output/`. Never commit personal working copies or API secrets.

You can configure a different prepared workspace root with `REBOUND_OPS_ROOT`. Recovery session saving is separate (`REBOUNDOPS_DATA_DIR`). Copying a CV into recovery or vice versa is a user-reviewed handoff, not an automatic synchronized state.

See [engine setup](https://github.com/AnkitParekh007/rebound-ops/blob/main/engine/docs/SETUP.md), [workspace manual](https://github.com/AnkitParekh007/rebound-ops/blob/main/workspace/README.md) and [Privacy and data](Privacy-and-Data).

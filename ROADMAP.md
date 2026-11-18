# Roadmap

This roadmap is a statement of intent, not a promise of dates. ReboundOps is maintained by one person, so items move when there is time or when a contributor picks them up. Each item comes from a limitation that is documented in [docs/RELEASE_READINESS.md](docs/RELEASE_READINESS.md) or in the release notes.

## Now: making 0.2 dependable

| Item | Why | Help wanted? |
| --- | --- | --- |
| **Windows 11 testing** | Windows is untested. File-permission hardening is best effort there. | Yes: a test report, or a CI job |
| **Intel macOS testing** | It is expected to work but has not been separately tested. | Yes: run `npm run verify:release` and report |
| **README screenshots** | The README has no screenshots yet. They must use fictional fixture data. | Yes |
| **Wider accessibility checks** | axe checks cover the main views and panels; the application detail page and a populated tracker are not covered yet. | Yes |
| **Community setup** | Discussions, the Wiki, a branch ruleset and Dependabot are prepared but not enabled. | Maintainer |

## Next release

These items are planned in the release notes for the next release:

- **Better PDF layout handling without OCR**, so multi-column resumes merge lines less often. Today a warning is shown.
- **More official sources where documented public APIs exist.** Workday stays out of scope until it offers a documented public API.
- **An optional discovery schedule per provider**, with the same consent, rate limits and caching as manual Discover.
- **An authorised export from the earlier version**, so real data can move through the [neutral import format](docs/IMPORT_FORMAT.md). It will be done as a separate, isolated activity; see [docs/LEGACY_EXPORT_PROCEDURE.md](docs/LEGACY_EXPORT_PROCEDURE.md).

## Later, or still being considered

- **Live verification of the cloud AI providers.** They are tested with mocked requests only. Live checks need the user's own key and consent, so they cannot run in CI.
- **OCR for scanned PDFs**, only if it can run locally, offline and at a reasonable size.
- **Cross-company search.** None of the supported job boards offers it, so it would need a source with a documented API that permits it.
- **Pay comparison across currencies or periods.** Today hourly pay is never converted, which avoids guessing.

## Not planned

These would conflict with the project's principles:

- automatically submitting applications, or marking them *Applied* without you;
- sending emails or messages for you;
- scraping behind logins, bypassing CAPTCHAs or anti-bot measures, or using undocumented private APIs;
- an account system, telemetry or cloud sync run by the project;
- AI features that write facts that are not in your records.

## Proposing something

Open a [feature request](https://github.com/AnkitParekh007/rebound-ops/issues/new?template=feature_request.yml). Explain the problem first and the solution second, and say how it fits the principles above.

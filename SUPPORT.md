# Getting help with ReboundOps

ReboundOps is free, open-source software maintained by one person in their own time. There is no paid support, no service-level agreement, and no hosted version, so your data never reaches the maintainer.

## Before you ask

1. Read [docs/INSTALL.md](docs/INSTALL.md): requirements, starting and stopping, upgrades, backups and restore.
2. Check the [known limitations](README.md#known-limitations). For example, scanned PDFs need OCR, which ReboundOps does not have.
3. Search the [existing issues](https://github.com/AnkitParekh007/rebound-ops/issues?q=is%3Aissue), including closed ones.

## Where to go

| You want to… | Go to |
| --- | --- |
| Ask a question | [Discussions → Q&A](https://github.com/AnkitParekh007/rebound-ops/discussions/categories/q-a) |
| Share an idea, or a platform report | [Discussions → Ideas](https://github.com/AnkitParekh007/rebound-ops/discussions/categories/ideas) or [Platform reports](https://github.com/AnkitParekh007/rebound-ops/discussions/categories/platform-reports) |
| Read the guides and FAQ | [Wiki](https://github.com/AnkitParekh007/rebound-ops/wiki) |
| Report a bug | [Open a bug report](https://github.com/AnkitParekh007/rebound-ops/issues/new?template=bug_report.yml) |
| Suggest a feature | [Open a feature request](https://github.com/AnkitParekh007/rebound-ops/issues/new?template=feature_request.yml) |
| Report a documentation problem | [Open a documentation issue](https://github.com/AnkitParekh007/rebound-ops/issues/new?template=documentation.yml) |
| Report a security vulnerability | Privately, as described in [SECURITY.md](SECURITY.md). Never in a public issue |
| Report a conduct problem | As described in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md#reporting) |

## Protect your privacy when asking

Issues are public. **Never paste your real resume, contact details, job postings you are applying to, database files, backups or API keys.** Reproduce the problem with fictional data, and redact paths that contain your name. The fictional fixtures in `tests/fixtures/` are a good starting point.

Useful details to include:

- ReboundOps version (shown in the release archive name, or `git rev-parse --short HEAD` for a source checkout);
- operating system and version, and `node --version`;
- whether you use Ollama or a cloud provider, or neither;
- the exact steps, and what you expected to happen.

## Response times

Issues are read regularly, but replies may take days. Platform reports (Windows, Intel macOS), reproducible bug reports and pull requests with tests get the fastest attention.

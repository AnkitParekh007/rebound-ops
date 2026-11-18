# Security policy

ReboundOps holds sensitive personal information: resumes, job-search history, contacts and, optionally, AI provider keys in environment variables. Thank you for helping keep it safe.

## Supported versions

ReboundOps is pre-1.0. Security fixes go into the latest release only.

| Version | Supported |
| --- | --- |
| 0.2.x (latest pre-release) | Yes |
| 0.1.x | No. Please upgrade; see [docs/INSTALL.md](docs/INSTALL.md) |

## Reporting a vulnerability

**Please do not open a public issue, discussion or pull request for a vulnerability.**

Report it privately through GitHub: open the repository's **Security** tab, choose **Report a vulnerability**, and fill in the form. The report is visible only to you and the maintainer.

> If the **Report a vulnerability** button is missing, private vulnerability reporting has not been enabled yet. In that case, open a public issue that says only that you have a security report and asks for a private contact. Do not include any details.

Please include:

- the affected version or commit, and your platform;
- what an attacker could do, and under which conditions;
- steps to reproduce, using **fictional data only**;
- any proof of concept, and whether you plan to disclose it publicly, and when.

## What to expect

ReboundOps is maintained by one person in their own time, so these are goals, not guarantees:

- acknowledgement within 7 days;
- a first assessment within 14 days;
- a fix or mitigation in a new release as soon as practical, with credit in the release notes if you want it.

We ask for up to 90 days before public disclosure, and we are happy to coordinate a date with you.

## Scope

In scope:

- the API server (`apps/api`): loopback binding, host, origin and content-type checks, request validation, data-folder permissions and locking;
- handling of untrusted input: job descriptions, resume files (PDF and DOCX), import files and backups;
- backup encryption and restore;
- AI integrations: data minimisation, consent checks, key handling and the grounding filters;
- release integrity: the archive, `SHA256SUMS`, the SBOM and the packaging scripts.

Out of scope:

- vulnerabilities in third-party job boards or AI providers (report those to them);
- attacks that need an attacker who already controls your user account or your machine;
- running ReboundOps on a non-loopback interface, which the server refuses to do by design;
- findings only from automated scanners, without a demonstrated impact.

## Built-in protections

These are described in the [README](README.md#security) and [docs/RELEASE_READINESS.md](docs/RELEASE_READINESS.md): a loopback-only server with a DNS-rebinding defence, origin checks, JSON-only writes, body-size limits, a strict Content-Security-Policy, and backups encrypted with scrypt and AES-256-GCM. Logs never contain request bodies or URLs.

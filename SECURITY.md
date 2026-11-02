# Security policy

## Supported versions

Only the current `main` branch and active review branches receive security fixes during the early pilot. There is no supported public hosted deployment.

## Reporting

Please **do not post unpatched vulnerabilities, sensitive reproduction inputs, private session data or secrets in a public issue**. Use GitHub's private vulnerability reporting option if it is enabled for this repository; otherwise contact a maintainer privately through an established channel.

We cannot guarantee a response time while ReboundOps is maintained by volunteers.

## Current boundaries

- The Fastify API is designed for localhost, not an internet-facing deployment.
- There is no authentication or disk encryption.
- Session data lives only in process memory unless a user explicitly downloads a JSON backup.
- The optional AI provider is disabled by default; users must preview and consent to any request.
- Pasted job requirements and participant claims are untrusted text.
- Do not upload passwords, proprietary employer records, health information or private application correspondence.

Please include: affected commit/version, minimal synthetic reproduction, expected vs actual behavior, and any suggested fix. Avoid sending real participant information.

# Reliability hardening and release-candidate checks

**Status:** Engineering reliability work, not a public release or independent security certification.

## Cross-browser CI

Playwright runs the synthetic end-to-end suite and automated axe checks in Chromium, Firefox and WebKit on GitHub-hosted Ubuntu. This tests multiple browser engines but does **not** certify physical devices, screen readers or native operating systems. Node 24 is the CI runtime; the API binds to 127.0.0.1.

The browser matrix is in playwright.config.ts. On a supported machine, run the following commands:

~~~sh
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
npm run audit:release
~~~

CI limits worker concurrency to reduce resource contention.

## Local API request boundary

- Reject Host headers not addressed to localhost or 127.0.0.1 with an optional port, to reduce DNS rebinding exposure.
- Reject browser origins outside the localhost Angular and API origin allowlist.
- Refuse browser requests marked with Sec-Fetch-Site: cross-site.
- Retain a 128 KiB API body limit, optimistic session revisions and disabled-by-default AI.
- Session IDs are unguessable local references, **not authentication**. Same-machine processes can access a local listener. Do not expose the API via a proxy, tunnel or public host.

Regression tests use Fastify request injection to check allowed and disallowed headers.

## Local disk integrity

- Source records use a versioned JSON envelope with validated references and the explicit disk-consent flag.
- Before updates, opting out or deleting a saved session, the current file must match the in-memory snapshot; modified or missing files block destructive writes.
- An unknown file or symlink occupying the target path blocks opt-in. Reads avoid following symlinks where OS support is available.
- On Unix-like systems, insecure file permissions prevent loading, and new saved files use mode 0600 in a directory restricted to 0700.
- Disk I/O failures are returned as LOCAL_STORAGE_UNAVAILABLE without leaking filesystem paths; in-memory state remains unchanged.
- Temporary-file flush and atomic rename are retained. Directory fsync is best-effort.

**Limits:** This is a single-process localhost store, with no cross-process lock or encryption. An external write exactly between validation and rename can still race. These controls cannot protect against a malicious local administrator, copied backups, unsupported filesystems or a sudden power failure.

## Public-repository hygiene check

The release audit examines tracked paths for common credential and session-export filenames, obvious private-key signatures, and required privacy/security/license documentation. A passing result is **not** a full secret scan, dependency review or vulnerability audit.

No real participant data or provider credentials are included in these tests.

## Gates that remain open

- There is no committed npm dependency lockfile, so fully deterministic installs are not claimed.
- Independent dependency and license review, Windows/macOS testing, human screen-reader testing and accessibility observations remain incomplete.
- No external participant study or actual real-world action outcomes have occurred.
- Paid AI compatibility, privacy terms and budget approval have not been verified.
- There is no authenticated public-hosting model; do **not** treat localhost safeguards as sufficient to deploy on the internet.
- Public beta requires owner approval after research and privacy gates.

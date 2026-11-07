# Third-party notices

This repository is primarily MIT-licensed ReboundOps software. See the root [LICENSE](LICENSE), [workspace/LICENSE](workspace/LICENSE) and [engine/LICENSE](engine/LICENSE).

## npm and build dependencies

Runtime and development packages pulled through npm carry their own licenses. The locked inventory, advisory review and license flags are maintained in [docs/dependency-security-review.md](docs/dependency-security-review.md). Before any public redistribution of compiled bundles or archives, retain the applicable upstream license texts for packaged third-party code (including Angular-generated third-party notices when present).

Notable categories called out by the automated inventory:

- **MPL-2.0** development/test packages such as `axe-core` / `@axe-core/playwright` and `lightningcss` platform variants.
- **CC-BY-4.0** `caniuse-lite` (development/build metadata).
- Broadly permissive licenses (MIT, ISC, BSD, Apache-2.0 and similar) for most other locked packages.

Package-declared `license` fields are metadata, not a substitute for reading upstream license files when redistributing.

## Optional AI and job-board providers

Optional Anthropic, OpenAI, Gemini, OpenRouter and job-board integrations are configured by the operator. Their terms of service, privacy policies and billing rules are separate from this MIT license and are not reproduced here.

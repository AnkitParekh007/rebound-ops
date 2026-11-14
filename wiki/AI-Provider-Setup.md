# Optional AI provider setup

[← Wiki home](Home) · [Privacy and data](Privacy-and-Data)

**You can start ReboundOps without an AI key.** The guided recovery workflow does not require sending data to a provider.

## Recovery app

The [AI provider documentation](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/ai-provider.md) describes an optional provider adapter for selected job-target reviews. The recovery app is off by default. Its documented opt-in mechanism requires provider configuration, a local payload preview, and explicit per-request consent before a provider call. Suggested changes are never automatically applied to user evidence.

Do not assume that configuring the recovery API automatically configures the workspace's other AI tools. Consult each interface's settings and provider documentation.

## Before enabling any external provider

- Read exactly which fields the request includes; **confirmed claims can still be personal data**.
- Check the provider's terms, cost controls and data-handling policies.
- Store API keys only in private environment configuration, never in Git or screenshots.
- Use synthetic data for initial tests.
- Independently review every generated claim and document.
- Keep provider calls disabled if you need a fully offline workflow.

**Security note:** A "local-first" interface is not the same as guaranteed offline operation. Job discovery, initial installs and optional providers may use the network.

More: [AI provider guide](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/ai-provider.md) · [AI evaluation](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/ai-evaluation.md) · [Privacy policy](https://github.com/AnkitParekh007/rebound-ops/blob/main/docs/privacy.md).

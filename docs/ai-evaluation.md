# AI provider evaluation and launch gate (fictional inputs only)

## Scope

The ReboundOps Anthropic adapter is **disabled by default**. We can validate its request construction, schema validation, consent and error handling using a local mock without a paid API key. A real provider compatibility test has **not** been completed and requires an API key, a budget, and explicit permission.

## Evaluated cases using synthetic text

| Case | Input / risk | Expected invariant |
|---|---|---|
| A | Confirmed achievement and one requirement | Only the participant-confirmed claim may leave the machine after consent |
| B | Private location, financial urgency, priorities and source labels | Excluded from the AI-bound payload |
| C | Requirement says "ignore all previous instructions" | Treated as untrusted requirement text, never a policy override |
| D | AI returns invented evidence or requirement UUID | Discard the entire suggestion as invalid |
| E | Model returns plausible JSON with an unsupported status/evidence pair | Reject cross-reference inconsistency |
| F | Payload changes after its SHA-256 preview | Refuse stale digest or revision |
| G | Provider raises an error with sensitive text | Return a generic error without raw output |
| H | Repeated requests / cost exposure | Ten attempts maximum per local API process, with no automatic retries |
| I | Model usage metadata | Expose only aggregate input/output token counts, not prompt text |
| J | Nonconsensual, missing or false consent | Reject before invoking the provider |

Implemented automated tests cover cases A–J. They do **not** show that a real AI provider will produce useful suggestions, resist every prompt injection or avoid causing inaccurate career inferences.

## What still needs owner approval

- A dedicated provider key set **only** in the local API environment, never in GitHub.
- A defined maximum test budget and provider terms/privacy review.
- Permission to run a handful of paid calls using fictional examples.
- Review of outputs for factual caution, source IDs, usefulness and failure handling.
- Explicit participant consent before any real private data is sent.

## Manual live evaluation protocol (not executed)

1. Confirm the budget and enable the provider only in a private local terminal.
2. Start with fictional examples including an unsupported achievement, conflicting claims and an embedded instruction attack.
3. Inspect the displayed JSON; verify location/notes/source text are absent.
4. Give consent for **one** candidate at a time.
5. Capture *only* status, token usage, latency and an anonymized validity verdict, not raw profiles or API keys.
6. Compare each model finding with participant-confirmed evidence and job requirements; record unsupported/invented suggestions.
7. Disable the provider immediately after the test, calculate billed costs from the actual provider dashboard, and publish only aggregated fictional evaluation results.

Until this gate is complete, production participant usage of AI should remain disabled even if the code is merged. No monetary ceiling is guaranteed by the in-process request count alone.

# Frequently asked questions

### Does ReboundOps apply to jobs for me?

No. It never submits applications or sends messages. It prepares drafts and gives you the official application link. You apply yourself, then confirm *Applied* in the tracker.

### Do I need an AI subscription or API key?

No. Every feature works with AI off. AI is optional: local through Ollama, or an opt-in cloud provider with your own key and per-request consent.

### Will it make my resume sound better by adding things?

No. Tailored drafts use only facts you have marked as verified. Gaps stay blank or appear as `[[placeholders]]`, and AI suggestions that add facts are withheld.

### Which job boards can Discover search?

Public company boards on Greenhouse, Lever, Ashby and Workable, one company at a time. There is no cross-company search, and Workday is not supported because it has no documented public API. The Workable integration uses the public feed behind Workable-hosted careers pages, which could change.

### Can it read my scanned PDF resume?

Not yet. PDF import reads selectable text only; there is no OCR. When a PDF has no text layer, ReboundOps tells you, keeps the original file, and lets you type or paste the text.

### What does the fit score mean?

It is a transparent 0–5 rubric (`fit-2026.2`) covering role, required skills, experience, location, seniority and published pay, with the evidence for each part. Eligibility is reported separately as *confirmed*, *unconfirmed* or *ineligible*. Missing information is not treated as a disqualifier.

### Does it work on Windows?

It has not been tested on Windows. It is Node-only, so it may work, but file-permission hardening is best effort there. Reports are welcome; see [Contributing](../../../CONTRIBUTING.md).

### How do I upgrade from v0.1.0?

Back up, stop v0.1.0, install v0.2.0, and start it with the same data folder. The database migrates in place. See [Installation](../../INSTALL.md#upgrading-from-v010).

### Where is my data, and how do I back it up?

In `~/.reboundops`, unless you set `REBOUND_DATA_DIR`. Use **Settings → Backup and restore** to download a backup, optionally password-protected.

### Is there a hosted or mobile version?

No. ReboundOps runs on your own computer, and the interface is a browser tab on `127.0.0.1`.

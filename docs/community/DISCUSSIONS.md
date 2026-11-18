# GitHub Discussions: review draft

**Status: draft. Discussions is off on the repository (checked 2026-11-18). Nothing has been enabled or posted.**

## Why enable it

Issues should stay for actionable bugs and tasks. Questions ("does it work with …?"), workflow tips and early ideas need somewhere to go that isn't the issue tracker. Enable Discussions only when you can check it about once a week. An unanswered forum is worse than none.

## Categories

GitHub creates six default categories when Discussions is enabled. Edit them in **Discussions → Categories** (there is no public API for managing categories):

| Category | Format | Who can post | Purpose | Change from the default |
| --- | --- | --- | --- | --- |
| 📣 Announcements | Announcement | Maintainers | Releases, roadmap updates, calls for testers | keep |
| 🙏 Q&A | Question / Answer | Everyone | Install and usage questions; answers can be marked | keep |
| 💡 Ideas | Open-ended | Everyone | Feature ideas before they become issues | keep |
| 🧪 Platform reports | Open-ended | Everyone | "It works / doesn't work on Windows 11, Intel macOS, distro X" | **new** (rename *Polls*, or create it) |
| 🙌 Show and tell | Open-ended | Everyone | How you use ReboundOps, templates and workflows, with fictional data | keep |
| 💬 General | Open-ended | Everyone | Everything else | keep |

After enabling, add `Ask a question → Discussions (Q&A)` to [SUPPORT.md](../../SUPPORT.md) (there is a placeholder comment) and a contact link in `.github/ISSUE_TEMPLATE/config.yml`:

```yaml
  - name: Ask a question
    url: https://github.com/AnkitParekh007/rebound-ops/discussions/categories/q-a
    about: Usage and install questions go to Discussions, not issues.
```

## Participation guidelines

Pin this as the first post in **General**.

> **Welcome to ReboundOps Discussions**
>
> This is the place for questions, ideas and sharing how you use ReboundOps. A few ground rules:
>
> 1. **Never post real personal data.** No resumes, contact details, salary history, immigration details, job postings you are actively applying to, database files, backups or API keys. Use fictional examples. The fixtures in `tests/fixtures/` show the style.
> 2. **Bugs go to issues.** If something is broken and you can reproduce it, please [open a bug report](https://github.com/AnkitParekh007/rebound-ops/issues/new?template=bug_report.yml).
> 3. **Security problems are private.** Follow [SECURITY.md](https://github.com/AnkitParekh007/rebound-ops/blob/main/SECURITY.md). Never post them here.
> 4. **Be kind.** Many people here are in the middle of a stressful job search. The [Code of Conduct](https://github.com/AnkitParekh007/rebound-ops/blob/main/CODE_OF_CONDUCT.md) applies.
> 5. **No recruiting, job ads or paid services.** This forum is about the software.
> 6. **Mark answers.** In Q&A, mark the reply that solved your question so others can find it.
>
> ReboundOps is maintained by one person, so replies can take a few days.

## Five opening posts

### 1. Announcements: "ReboundOps 0.2.0 is out (pre-release)"

> ReboundOps 0.2.0 is published as a pre-release: https://github.com/AnkitParekh007/rebound-ops/releases/tag/v0.2.0
>
> ReboundOps is a local-first job search assistant. It runs on your own computer, needs no account, and works fully without AI.
>
> New in 0.2.0:
> - PDF resume import, read locally (selectable text only, no OCR)
> - Discover: look up one company's public board on Greenhouse, Lever, Ashby or Workable, after you consent
> - Fit rubric `fit-2026.2`, with per-skill years, seniority and published pay
> - Password-protected backups and in-app restore
> - Contacts and reminders with 30-day undo, interview notes, follow-up templates and CSV export
> - Optional local AI through Ollama, with grounded assist tasks
>
> Known limitations: cloud AI providers are tested with mocks only, there is no OCR, the Workable feed is unofficial, and Windows is untested.
>
> Upgrading from 0.1.0? Back up first, then follow docs/INSTALL.md. The database migrates in place.
>
> Questions go to Q&A; bugs go to issues.

### 2. Platform reports: "Call for testers: Windows 11 and Intel macOS"

> ReboundOps is tested on Apple Silicon macOS and in CI on Ubuntu, but **not on Windows 11 or Intel Macs**. If you have one, a short report would help a lot.
>
> 1. Install Node.js 24 or newer.
> 2. Install the v0.2.0 release archive as described in docs/INSTALL.md, or clone the repository and run `npm ci && npm test`.
> 3. Start it with `npm start` and walk through onboarding using **fictional** data (for example `tests/fixtures/resumes/jordan-fictional.txt`).
> 4. Reply with: your OS version, `node --version`, what worked, what didn't, and any terminal errors with personal paths removed.
>
> On Windows, note anything odd about the data folder or its permissions; hardening there is best effort.

### 3. Q&A: "How does ReboundOps decide a fit score?"

> A worked explanation that can be linked from issues.
>
> The fit score is a transparent 0–5 rubric (`fit-2026.2`). It looks at role, required skills, experience (including per-skill years you enter), location, seniority and published pay, and shows the evidence for each part along with its confidence. You can adjust the weights.
>
> Eligibility is separate: *confirmed*, *unconfirmed* or *ineligible*. Missing information about you (for example, you haven't said whether you need sponsorship) makes a result *unconfirmed*, not *ineligible*. Only a real disqualifier does that: a stated requirement that your saved facts show you do not meet.
>
> Assessments are recomputed when you view them and never stored, so a rubric update applies straight away.
>
> *(Mark this as the answer.)*

### 4. Ideas: "Which official job sources should come next?"

> Discover currently supports public company boards on Greenhouse, Lever, Ashby and Workable. The roadmap says "more official sources where documented public APIs exist".
>
> Which source would help your search most? Please link to its **public, documented** API or feed. Sources that need logins, scraping, or bypassing anti-bot measures are out of scope. Workday is not supported because it has no documented public API.

### 5. Show and tell: "Share your follow-up templates (fictional examples)"

> ReboundOps 0.2.0 lets you write your own follow-up templates. They are never sent automatically: you copy the text or open it in your own mail app.
>
> Share a template that works for you: after an interview, checking in on an application, or thanking a referrer. Please use placeholders and fictional names, never real recruiters or companies you are talking to.

## Posting the drafts (after approval)

Enable Discussions, set up the categories in the UI, then look up the IDs:

```bash
gh api graphql -f query='query { repository(owner: "AnkitParekh007", name: "rebound-ops") { id discussionCategories(first: 20) { nodes { id name } } } }'
```

Save each post body as a Markdown file outside the repository, then create the discussion:

```bash
gh api graphql \
  -f query='mutation($repo: ID!, $cat: ID!, $title: String!, $body: String!) { createDiscussion(input: {repositoryId: $repo, categoryId: $cat, title: $title, body: $body}) { discussion { url } } }' \
  -f repo=<REPOSITORY_ID> -f cat=<CATEGORY_ID> \
  -f title="ReboundOps 0.2.0 is out (pre-release)" \
  -F body=@announcement.md
```

Pinning is done in the UI (**⋯ → Pin discussion**).

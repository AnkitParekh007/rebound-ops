# ReboundOps GitHub Discussions — community launch kit

> **Status:** Publication-ready drafts. These are *not* published GitHub Discussions. A repository maintainer must enable Discussions under **Settings → General → Features → Discussions** (if it is not already enabled), configure categories, then post the topics. Avoid posting duplicates of existing threads.

## Recommended categories

- **Announcements** — founder updates and releases (maintainer-led)
- **General** — introductions, user stories and constructive conversation
- **Ideas** — proposals and prioritization
- **Q&A** — setup and usage help
- **Show and tell** — user workflows, extensions, and demos
- **Polls** — optional; use only if available

## 1. Announcement: Welcome to ReboundOps — let's build a better way to navigate career transitions

**Category:** Announcements (pin this)

Hi, I'm Ankit, the founder, creator and lead maintainer of **ReboundOps**.

I started ReboundOps because a job search after a layoff or career change shouldn't feel like another full-time job filled with disconnected spreadsheets, inflated resume claims, and generic AI advice.

ReboundOps is an **MIT-licensed, local-first career recovery and job-search workspace** for software professionals. It brings together:

- Guided career recovery and practical seven-day planning
- Evidence-backed achievement review and job-requirement comparisons
- Public job-source discovery and application tracking
- CV preparation, interview practice and follow-up planning
- Local data controls and optional AI assistance

**Start here:** [Website](https://rebound-ops.org/) · [Source](https://github.com/AnkitParekh007/rebound-ops) · [Screenshots](https://rebound-ops.org/screenshots/) · [Local setup](https://github.com/AnkitParekh007/rebound-ops#quick-start)

We're still in a **local developer preview**: Linux/macOS are the primary launch scope, native Windows needs further acceptance, and some AI or export capabilities require additional setup. ReboundOps does not automatically submit job applications or promise hiring outcomes.

**I'd love to hear from you:**
1. What's the hardest part of your job search today?
2. What would make this tool useful in your own workflow?
3. Which capability would you like to see improved first?

Please share feedback respectfully, without posting private resumes, access tokens, or sensitive personal information. Contributors and first-time open-source participants are welcome.

— Ankit

## 2. General: Introduce yourself and your career-search workflow

**Category:** General (pin if helpful)

Welcome! Whether you're job searching, recovering from a layoff, contributing to open source, or helping others find their next opportunity, you're invited.

Tell us as much as you're comfortable sharing:
- Your engineering or professional focus (optional)
- The job-search task that consumes the most time
- The tools or workflow you use today
- One thing ReboundOps could simplify

Please **do not** share private contact details, personal identity documents, complete resumes, credentials or confidential employer materials here.

## 3. Ideas: Which capability should we prioritize next?

**Category:** Ideas

We're shaping the next steps of ReboundOps around real user needs. Which of these directions would help you most?

1. Easier first-run installation and onboarding
2. Better job-source discovery and filtering
3. Clearer requirement-to-evidence job reviews
4. Stronger CV Studio and application document workflows
5. More useful interview preparation and tracking
6. Desktop packaging for macOS and Windows
7. Something else — describe it below

Please explain your use case, the current friction, and what success would look like. Desktop packaging is a **planned direction**, not an already shipped native app. We will use discussion to inform priorities; proposals are not commitments.

## 4. Q&A: Getting started with ReboundOps locally

**Category:** Q&A

Want to try ReboundOps? Start with the [Quick start](https://github.com/AnkitParekh007/rebound-ops#quick-start).

Recommended: Node.js 24.15+ and npm. Clone the repo and run:

```bash
git clone https://github.com/AnkitParekh007/rebound-ops.git
cd rebound-ops
npm start
```

Then follow the local app's startup instructions and explore the fictional example without an AI key.

**Need help?** Reply with your OS, Node version, the command you ran, the exact error (with secrets removed), and what you expected to happen. For reproducible bugs, please open a [GitHub issue](https://github.com/AnkitParekh007/rebound-ops/issues) so it can be tracked.

Current preview targets Linux/macOS; native Windows is experimental and requires acceptance testing. First-run dependency/browser downloads require network access.

## 5. Show and tell: Share your privacy-first job-search workflow

**Category:** Show and tell

How are you organizing your job search without losing control of your data?

Share a redacted example of your workflow:
- How you shortlist and research opportunities
- How you validate claims before tailoring a CV
- How you track applications and follow-ups
- Where ReboundOps saves time or still creates friction

Screenshots and walkthroughs are welcome, but **redact all personal information, employer-confidential data, application tokens and API keys** first. We especially value reproducible feedback and suggestions for improving accessible workflows.

## Moderation and launch checklist

- [ ] Enable Discussions in repository settings (maintainer action)
- [ ] Confirm categories, create missing ones, and set up Announcements as maintainer-led
- [ ] Review existing threads to avoid duplicates
- [ ] Publish the five drafts above in their matching categories
- [ ] Pin the welcome announcement (and introductions if useful)
- [ ] Reply to early feedback, route bugs to Issues and track selected ideas in the roadmap
- [ ] Add a Discussions link to the public README **after** Discussions is enabled
- [ ] Keep moderation respectful and remove spam, doxxing and exposed credentials

**Community principle:** Helpful discussion, truthful product claims, privacy and constructive criticism. Do not promise jobs, automated applications or unreleased features.

## Automated publishing (manual GitHub Actions trigger)

1. Confirm these five categories exist in **Settings → Discussions**: Announcements, General, Ideas, Q&A, and Show and tell. Category spelling is matched case-insensitively; missing categories stop the workflow before creating anything.
2. Open **Actions → Publish ReboundOps Discussions → Run workflow** and select branch **main**.
3. First run with **action=preview**. Review existing titles, duplicate detection, and proposed posts in the workflow summary.
4. When ready, run again with **action=publish** and enter **PUBLISH** exactly in the confirmation field.
5. Open the discussion URLs listed in the workflow summary. Pin the founder's welcome announcement manually.

The workflow uses the GitHub Actions job token with only `contents: read` and `discussions: write`; it does not require a personal access token or API key. It does not run on push, PR creation, or a schedule. Existing discussions with matching titles are skipped. If publication partially fails, rerunning the workflow skips already-created topics.

**Safety:** Only launch the five numbered topics from this document; review copy changes before publishing. Edits to a previously published thread are not applied automatically. The publisher cannot create or pin categories. The workflow requires `main` and an explicit confirmation to publish.

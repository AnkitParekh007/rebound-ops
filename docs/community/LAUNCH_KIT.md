# Launch kit: review drafts

**Status: drafts only. Nothing has been posted anywhere.** Each piece needs the owner's approval, and the owner posts it from their own accounts.

## Ground rules for every channel

1. **Disclose that you made it.** Every post says "I built this", or the platform's equivalent.
2. **No vote or engagement manipulation.** Don't ask for upvotes, don't coordinate voting rings, and don't use alternate accounts. Ask for *feedback*, not stars.
3. **Only claims the docs support.** Use the facts in [Claims you can make](#claims-you-can-make). No outcome claims (interviews, offers), no user counts, no testimonials.
4. **Say the limitations up front.** It's a pre-release, cloud AI is tested with mocks only, there is no OCR, and Windows is untested.
5. **Fictional data in every screenshot and video.** Use `tests/fixtures/`. Never show your own job search.
6. **Read each community's current rules on the day you post**, and skip a community where self-promotion isn't allowed.
7. **Space it out.** One or two channels a day, and answer every reply for the first 48 hours. Don't post to many subreddits at once.

## Claims you can make

- Open source (MIT), local-first, no account. Data is in one SQLite database on your machine.
- Works fully without AI. Optional Ollama (local) or an opt-in cloud provider (Anthropic, OpenAI, Gemini, OpenRouter) with per-request consent.
- Imports resumes from PDF (selectable text), DOCX, txt, md or pasted text, and you review the facts before use.
- Discover looks up one company's public board on Greenhouse, Lever, Ashby or Workable, after you consent.
- An explainable 0–5 fit score, with eligibility shown separately (confirmed, unconfirmed or ineligible).
- Tailored resume and cover letter from verified facts only. ATS-friendly PDF and DOCX, re-read after export.
- Never applies or sends anything for you; *Applied* is set only by you.
- Password-protected backups, in-app restore, CSV export.
- v0.2.0 is a pre-release, built by CI with an SBOM and checksums.

**Don't say:** "AI-powered job hunting", "auto-apply", "beats the ATS", "get more interviews", "works on Windows", "searches all jobs", "secure" without qualification, or any number about users or results.

Links: the repository (`https://github.com/AnkitParekh007/rebound-ops`) and the release (`https://github.com/AnkitParekh007/rebound-ops/releases/tag/v0.2.0`). Add the website once the domain is confirmed.

## 1. GitHub announcement

Use the Announcements post in [DISCUSSIONS.md](DISCUSSIONS.md#1-announcements-reboundops-020-is-out-pre-release). The release notes for v0.2.0 are already published.

## 2. Product Hunt

Product Hunt's guidelines ask makers not to solicit upvotes. Launch only once there are screenshots of fictional data (issue 2) and the website domain is live.

- **Name:** ReboundOps
- **Tagline (53/60 characters):** Run your job search on your own computer, AI optional
- **Description (≤260 characters):**
  > Open-source, local-first job search assistant. Assess fit with an explainable score, tailor resumes from facts you've verified, and track applications and follow-ups. No account, no cloud. It never applies for you. MIT, pre-release.
- **Topics:** Open Source, Productivity, Privacy, Career (check what's available on the day)
- **Maker's first comment:**
  > Hi, I'm the maker. I built ReboundOps because job-search tools wanted my whole history on their servers, and AI writing tools kept "improving" my resume with things I hadn't done.
  >
  > ReboundOps runs on your own machine. Drafts use only facts you've marked as verified, the fit score shows its evidence, and you're always the one who applies. AI is optional: local through Ollama, or a cloud provider only if you consent to each request.
  >
  > It's a 0.2 pre-release. Windows is untested, there's no OCR for scanned PDFs, and the cloud AI paths are tested with mocks only. I'd really value feedback on install friction and on whether the fit explanations make sense to you.

## 3. LinkedIn

> I've released ReboundOps 0.2, an open-source job search assistant that runs entirely on your own computer.
>
> Why I built it: a job search creates a lot of personal data (postings, tailored resumes, screening answers, recruiter notes), and most tools want it all on their servers. Many AI tools will also cheerfully add skills you don't have.
>
> What ReboundOps does differently:
> • Your data stays in one local database. No account.
> • Drafts use only facts you've verified. Gaps stay visible as placeholders.
> • The fit score (0–5) shows its evidence, and eligibility is reported separately.
> • It never applies or sends anything for you.
> • AI is optional (local Ollama, or a cloud provider with your consent).
>
> It's a pre-release with honest limitations: no OCR, Windows untested, and cloud AI tested with mocks only. If you try it, I'd like to hear what was confusing.
>
> https://github.com/AnkitParekh007/rebound-ops
>
> #opensource #privacy #jobsearch

## 4. X thread

1. I built ReboundOps: an open-source job search assistant that runs on your own computer. No account, no cloud, AI optional. v0.2 pre-release is out. 🧵 https://github.com/AnkitParekh007/rebound-ops
2. The idea: your job search is personal data. Postings, tailored resumes, screening answers and recruiter notes all live in one SQLite file on your machine, nowhere else.
3. It never invents things about you. Drafts use only facts you've marked verified, and AI suggestions that add facts are withheld. Gaps stay visible as [[placeholders]].
4. The fit score is 0–5 and explainable: role, skills, experience, location, seniority, pay, each with its evidence. Eligibility is separate: confirmed, unconfirmed or ineligible.
5. It doesn't apply for you. You use the official link and confirm "Applied" yourself. Follow-up drafts are never sent automatically.
6. Honest limits: pre-release, no OCR, Windows untested, cloud AI tested with mocks only. Feedback welcome, especially on install. MIT licensed.

## 5. Reddit (rule-aware)

Reddit's site-wide guidance on self-promotion and each subreddit's rules change. Check the sidebar and pinned posts on the day, disclose that you're the author, stay to answer comments, and post to **one subreddit at a time**.

| Community | Fit | Note |
| --- | --- | --- |
| r/opensource | good | Lead with the licence and the architecture, not marketing |
| r/selfhosted | check rules | It is local software rather than a server you host. Post only if the rules accept local-first apps, and say so plainly |
| r/privacy | check rules | Many privacy subs don't allow project promotion. Read the rules first, or skip it |
| r/angular, r/node | possibly | Only as a technical write-up (zoneless Angular, `node:sqlite`, native TS stripping), and only where showcase posts are allowed |
| r/cscareerquestions, r/jobs, r/jobsearchhacks | **don't post** | These typically ban self-promotion. Don't work around it |

**r/opensource draft**

> **Title:** I built ReboundOps, an MIT-licensed, local-first job search assistant (AI optional)
>
> I'm the author. ReboundOps is an Angular and Fastify app that runs on 127.0.0.1 and stores everything in one SQLite database (`node:sqlite`). There's no account and no telemetry.
>
> What it does: import a resume and verify the facts, paste a job or look up one company's public board (Greenhouse, Lever, Ashby, Workable) after consent, get an explainable 0–5 fit score with separate eligibility, tailor a resume and cover letter from verified facts only, export PDF or DOCX, and track applications and follow-ups. It never applies or sends anything for you.
>
> AI is optional: Ollama locally, or a cloud provider with per-request consent, and any output that adds facts is withheld.
>
> It's a 0.2 pre-release. No OCR, Windows untested, cloud AI tested with mocks only. CI runs lint, typecheck, unit and integration tests, a reproducible release build and Playwright E2E. Contributions are welcome; there are good-first issues for accessibility tests and platform reports.
>
> Repo: https://github.com/AnkitParekh007/rebound-ops. I'd love critique of the architecture or the threat model.

**r/selfhosted variant (only if the rules allow it):** the same body, opening with "This isn't a server you host; it's a local app on 127.0.0.1. Posting because the sub has asked for local-first tools before. Mods, remove it if it's off-topic."

## 6. Dev.to article

**Title:** Building a job search assistant that refuses to make things up

**Tags:** `opensource`, `typescript`, `angular`, `privacy`

**Outline**

1. **The problem.** Job-search data is personal, and AI drafting tools invent experience. State the two goals: local-first, and grounded.
2. **Architecture in one picture.** Use the runtime diagram from `docs/ARCHITECTURE.md`: a loopback Fastify server, an Angular SPA, and `node:sqlite`. Explain why there is no Electron (size, and update work that changes nothing for the user).
3. **Grounding as a rule, not a prompt.** Extraction keeps the source text for each field. Drafts use only verified facts, and AI output is checked against the records and withheld if it adds facts. Include a short, generic code sketch of the idea, not copied from elsewhere.
4. **An explainable score.** Why it's a rubric with evidence instead of a single model "match %". Why eligibility is separate, and why missing information isn't a disqualifier.
5. **Consent and politeness for network calls.** One board, consent first, an allow-list, one request per second, `Retry-After`, a cache. Why Workday isn't supported.
6. **Trust in releases.** Reproducible archive, SBOM, checksums, a strict licence and secret audit in CI, and an upgrade test against the real previous release.
7. **What's missing.** OCR, Windows, live cloud-AI verification. Invite contributors.
8. **Links:** the repository, the release and CONTRIBUTING.

## 7. YouTube walkthrough (8–10 minutes)

Record with a temporary data folder (`REBOUND_DATA_DIR=$(mktemp -d) npm start`) and the fictional fixtures only.

| Time | Segment |
| --- | --- |
| 0:00 | What it is, in one sentence. Show the README banner and state the limitations |
| 0:45 | Install from the release: checksum, `npm ci --omit=dev`, `npm start` |
| 2:00 | Onboarding: choose Local only and show there is no account |
| 2:45 | Import the fictional resume and verify facts. Unverified facts aren't used |
| 4:00 | Add a fictional posting. Show the evidence highlights and the *unverified* label |
| 5:00 | Assessment: walk through the rubric, then the eligibility states |
| 6:00 | Tailor the resume and cover letter. Show a placeholder, then export PDF and DOCX |
| 7:00 | Tracker: confirm *Applied* yourself, add a reminder, draft a follow-up (not sent) |
| 8:00 | Backup with a password, and where the data lives |
| 8:45 | Optional: Ollama assist, showing a suggestion being withheld |
| 9:30 | How to contribute; the good-first issues |

Captions should name every limitation that comes up. Don't use background music that needs a licence you don't have.

## 8. Contributor call

> **Help wanted: ReboundOps, a local-first job search assistant (TypeScript, Angular, Fastify)**
>
> ReboundOps is MIT-licensed and small enough to understand in an afternoon. Good places to start:
>
> - **Accessibility:** add axe checks for two views (good first issue).
> - **Platform reports:** run the tests on Windows 11 or an Intel Mac and report what happens.
> - **Docs:** capture README screenshots from fictional fixture data.
> - **Harder:** keep multi-column PDF resumes in reading order without OCR; add an opt-in discovery schedule.
>
> Every issue lists the files, acceptance criteria and the commands to verify the change. Setup is `npm ci` on Node 24 or newer. See CONTRIBUTING.md.

## 9. Feedback process

1. **Intake:** bugs through the issue forms (auto-labelled `needs-triage`), questions and ideas through Discussions once it's enabled, security reports through private advisories only.
2. **Triage weekly:** label each `needs-triage` issue, ask for a fictional reproduction if needed, and close duplicates with a link.
3. **Close the loop:** when feedback leads to a change, reference the issue in the PR and the CHANGELOG, and thank the reporter (with their permission).
4. **Track launch feedback** in a single pinned Discussion, "What confused you?". Turn recurring themes into documentation issues.
5. **Measure only what's public and honest:** issues opened and closed, PRs from new contributors, and platform reports received. Don't track users.

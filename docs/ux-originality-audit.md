# ReboundOps UX originality audit (baseline)

Historical baseline: the primary dashboard has since been replaced by the ReboundOps search workbench. See [originality remediation](originality-remediation.md) for the current implementation. The observations below remain the original baseline.

> **Method:** heuristic evaluation by one designer-engineer walking through the product as a
> recently laid-off job seeker (synthetic persona). **No participants were tested and no usability
> scores were measured.** Facts below come from screenshots and live sessions; inferences are marked.

## What was inspected

| Source | Detail |
|---|---|
| Supplied screenshots | `ReboundOps-screens-2026-11-07.zip` — 47 light + 47 dark full-page captures, every image opened on two contact sheets (filename order). |
| Own baseline captures | 9 views × 4 widths (1440, 768, 390, 320) × 2 themes = 72 images, fictional "Use fictional demo" data, `main` @ `78ca92c`. Kept in `docs/ux-review/before/` (light 1440/390 subset committed). |
| Live checks | `http://127.0.0.1:4317` with the ReboundOps API on `127.0.0.1:4174`; `sessionStorage` read after the recovery flow; horizontal-overflow measured per page. |
| Reference (to avoid copying) | `https://cvstart.org/#screenshots` (landing page text and the "One tab instead of ten" product tour), plus the workspace layout already present in this repo. |

**Measured facts from the baseline run**

- After the recovery flow, `sessionStorage['reboundops:handoff']` contained the full intake draft: role, priorities, location, possible targets and the achievement text — although `rebound-state.js` describes a "non-sensitive handoff summary".
- The plan screen overflows horizontally at 320 px (light and dark).
- At 390 px the "No LLM key set" banner fills roughly the top third of every first screen, including the recovery screens that need no AI.

## Reference similarity (beyond colour)

| Dimension | Baseline ReboundOps workspace | Reference (cvstart / upstream UI) | Similarity |
|---|---|---|---|
| Information architecture | Dashboard + 7 collapsible tool groups (Sourcing, Decision, Application, Networking, Analytics, Growth, Setup); Recovery added as one item | Same grouped command-center sidebar | **Near-identical** |
| Home | "Command Center" title, hero with Scan now / Auto-pipeline, status funnel, stat tiles | Same "Command Center" composition in the product tour | **Near-identical** |
| Global chrome | Search bar, Doctor, Open Scan, AI-key warning bar above everything | Same top bar and the same red key warning | **Near-identical** |
| Components | Bordered cards, pill chips, tight CRM tables, empty-state cards with example rows | Same | **Near-identical** |
| Typography | Inter throughout, 13–15 px body, dense labels | Inter | **Identical** |
| Recovery screens | Three equal-weight cards stacked above a checklist; added by this project | No equivalent | Distinct content, generic presentation |
| Tone | Tool-first ("Scan", "Evaluate", counts, scores) | Tool-first ("135 sources", "AI fit score") | Same |

Conclusion: apart from colour and the two recovery screens, the visible product **is** the upstream workspace. The recovery idea is present but not the default experience.

## Findings per view

Persona questions: **What is this? / Why am I doing this? / What do I click? / Can I trust it?**

### 1. Start (`#/start`) — `01-start.png`

| Aspect | Observation (fact unless marked) |
|---|---|
| First reaction | A large logo, a headline, a disclaimer box, then five goal options **and** eight form fields on one screen. "What do I click?" — goal, form or demo are competing. |
| Cognitive load | All fields visible at once, including optional targets and achievements (inferred: high for someone in a stressful moment). |
| Behaviour | Choosing "I already know my target" **navigates away immediately** to the dashboard — surprising, no confirmation (code: `recovery.js` goal `change` handler). |
| Trust/privacy | Privacy copy says answers go "only to the ReboundOps API … memory-only" — **inaccurate**: the draft is also written to `sessionStorage`. |
| Mobile | 390 px: the key banner and the 280 px logo push the question below the fold. |
| Similarity | Card + form composition uses existing workspace components. |
| Severity / remedy | **P0** — progressive 4-step flow (goal → essentials → optional → review), explicit Continue for "I know my target", accurate one-sentence privacy note, no draft in storage. Files: `workspace/public/js/views/recovery.js`, `workspace/public/js/lib/rebound-state.js`. **Check:** step 1 shows only the question and five choices; `sessionStorage` holds no intake text. |

### 2. Recovery directions (`#/recovery`, no plan) — `02-recovery-directions.png`

| Aspect | Observation |
|---|---|
| First reaction | "First get clarity" headline, then three equally weighted text-dense cards. The next *decision* is not stated in a sentence. |
| Copy | Developer labels shown to users: "Internal name: Return", urgency printed as the enum `"soon"`. |
| Hierarchy | Target, missing proof, uncertainty and suggested test all expanded on every card — a wall of text (inferred). |
| Mobile | Cards stack; the plan section is three screens down. |
| Severity / remedy | **P0** — Recovery Home with a short snapshot and one stated decision; a separate Direction Canvas where each hypothesis can be expanded; human copy only. Files: `recovery.js`, `css`. **Check:** no "Internal name"/enum text in the DOM of journey screens. |

### 3. Plan (`#/recovery`, plan chosen) — `03-plan.png`

| Aspect | Observation |
|---|---|
| First reaction | The plan sits below the three cards; all five tasks have equal weight. "What do I do now?" is not answered at a glance. |
| Copy | "Planned 200 of 240 min budget", "Session revision 1" — debug-style numbers in primary UI. |
| Behaviour | Switching direction silently replaces the plan and clears completed steps (API `selectRoute` rebuilds the plan) — no warning. |
| Mobile | Horizontal overflow at 320 px (measured). |
| Severity / remedy | **P0** — "Your next useful step" first (title, time, why it matters from the route's own open question), full week collapsed, human time copy ("About 3h 20m planned within your 4h"), confirmation before switching with the number of completed steps that will be cleared. **Check:** next step is the first heading after the snapshot; switching asks first; no overflow at 320. |

### 4. Workspace home (`#/dashboard`) — `04-dashboard.png`

| Aspect | Observation |
|---|---|
| First reaction | "Command Center" with Scan now / Auto-pipeline, empty status funnel, stat tiles; first message is a warning that the profile is a template. Recovery appears only as a thin strip. |
| Relationship to plan | Display-only strip; no purposeful way to carry the chosen direction into job search. |
| Severity / remedy | **P0** (handoff) / **P1** (home redesign) — add "Find opportunities for this direction" with a consent screen showing exactly what is used; quiet next-step panel on tool screens. Dashboard composition is a P1 redesign. |

### 5. Scan / Pipeline / Tracker / Reports — `05`–`08`

| Aspect | Observation |
|---|---|
| Empty states | Honest empty states, but framed as tools ("Vacancy search", "ATS adapters") rather than as steps toward the chosen direction. |
| Trust | Scores (0–5) are presented as fit numbers; acceptable inside tools if never shown as hiring predictions. |
| Severity / remedy | **P1** — "Opportunity Lens" framing. P0 keeps these tools intact and reachable under Tools. |

### 6. Settings (`#/config`) — `09-config.png`

Settings are tool-centric and correct for AI setup; the AI-key warning belongs here and on AI actions, not as a global first message. **P0**: hide the key banner on journey screens (it remains on tool screens). **P1**: no redesign.

### Navigation (all screens)

The upstream multi-group sidebar is the first thing users see on every page. **P0**: journey-first navigation (My next step, Explore directions, Find opportunities, Applications, My evidence) with every existing tool kept under a collapsed "Tools & settings" section; a bottom bar on mobile; deep links unchanged.

## Ranked top findings

| # | Finding | Severity | Files |
|---|---|---|---|
| 1 | Intake draft (role, priorities, achievement text) persisted to `sessionStorage` despite "non-sensitive" claim; privacy copy inaccurate | P0 | `recovery.js`, `rebound-state.js` |
| 2 | Visible product IA, chrome and home are the upstream command center; recovery is a side item | P0 | `index.html`, `app.js`, `reboundops.css` |
| 3 | First screen shows goal + 8 fields + demo + disclaimer at once | P0 | `recovery.js` |
| 4 | "I already know my target" redirects without confirmation | P0 | `recovery.js` |
| 5 | No single next action; plan buried below three dense cards | P0 | `recovery.js` |
| 6 | Route switch silently discards completed steps | P0 | `recovery.js` |
| 7 | Developer labels in UI (Internal name, Session revision, enum urgency, minute budget numbers) | P0 | `recovery.js` |
| 8 | AI-key warning is the first message on recovery screens that need no AI | P0 | `app.js`, `reboundops.css` |
| 9 | Plan overflows horizontally at 320 px | P0 | `reboundops.css` |
| 10 | No intentional handoff from direction to job search; strip is display-only | P0 | `recovery.js`, router |

## Acceptance checks used for "after"

- Step 1 of start shows one question and five choices; Back/Skip exist on later steps.
- `sessionStorage` contains only a session reference and goal key — no intake text (automated browser test).
- Journey screens contain no "Internal name", "revision" or raw enum text.
- The next useful step is visible above the fold at 1440 and 390 px.
- Switching direction with completed steps asks for confirmation.
- No horizontal overflow at 320/390/768/1440 on journey screens (automated).
- The handoff screen lists exactly the value used and requires Continue.

# ReboundOps journey design system

The recovery journey (`#/start`, `#/recovery`, `#/directions`, `#/opportunities`,
`#/evidence`) uses its own design language, implemented in
[`workspace/public/css/journey.css`](../workspace/public/css/journey.css) with brand colour
tokens from [`workspace/public/css/reboundops.css`](../workspace/public/css/reboundops.css).
The job-search tools retain their existing components; the journey styling described
here does not imply that every tool screen has been redesigned.

## Principles

1. **One decision or one action per view.** A page answers "what do I do now?" before anything else.
2. **Hypotheses, not predictions.** Directions show what is unknown next to what to try; no fit scores on recovery screens.
3. **Calm and editorial, not a command center.** Serif display voice for "what's next", generous whitespace, rules instead of card walls, no stat tiles.
4. **Honest states.** Offline, ended sessions and empty evidence say what happened and offer a way on.
5. **Privacy in plain words.** One sentence plus an optional detail disclosure; never repeated on every card.

## Tokens

### Colour (resolve per theme)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--rj-brand` → `--rb-orange` | `#E8541F` | `#F26A2E` | Logo, icons, stepping stones, rules. **Not for text on white** (3.7:1). |
| `--rj-accent` → `--cv3-accent` | `#C2410C` | `#F26A2E` | Primary buttons, links, focus ring, wordmark "Ops" text |
| `--rj-accent-ink` | `#FFFFFF` | `#220B08` | Text on the primary button (5.2:1 / 6.1:1) |
| `--rj-ink` → `--hof` | `#1C1412` | `#F4F0ED` | Body text (18.1:1 / 16.7:1) |
| `--rj-muted` → `--foggy-strong` | `#57504B` | `#CEC6C1` | Secondary text (≥7.9:1 / ≥10:1) |
| `--rj-line` → `--slate` | `#E7E4E2` | `#2E2927` | Rules and borders (decorative) |
| input border `--cv3-input-line` | `#948B85` | `#6E6560` | Form controls (≥3.1:1, WCAG 1.4.11) |
| `--rj-surface` → `--paper` | `#FFFFFF` | `#121010` | Page background — plain, no tint |

Semantic colours stay distinct from the brand: success uses the green `--kazan-text`,
warnings the amber `--cv3-warn`, errors `--rausch-text`.

### Type

| Token | Value | Use |
|---|---|---|
| `--rj-font-display` | Fraunces 500/600 | Page titles, next-step titles, direction names, evidence quotes |
| `--rj-font-body` | Atkinson Hyperlegible 400/700 | Everything else |
| `--rj-t-h1` | `clamp(30px, 4.4vw, 48px)` | One per view |
| `--rj-t-h2` | `clamp(24px, 2.6vw, 30px)` | The next step / the decision |
| `--rj-t-h3` | 21px | Direction names, section titles |
| `--rj-t-lead` | 19px | Ledes, goal labels |
| `--rj-t-body` | 17px | Body (≥16px requirement) |
| `--rj-t-small` | 15px | Hints, metadata (never below 14px) |
| `--rj-measure` | 62ch | Maximum line length |

Both fonts are licensed under the SIL Open Font License and loaded from Google Fonts, which the
workspace CSP already allows.

### Space, shape, focus, motion

- Space scale `--rj-s1`…`--rj-s8`: 4, 8, 12, 16, 24, 32, 48, 72 px.
- Radii: `--rj-radius` 14px (choices, dialogs), `--rj-radius-s` 10px (inputs); buttons are pills.
- Touch targets ≥ 44px (buttons 48px).
- Focus: `--rj-focus` = surface gap + 2px accent ring on every interactive element.
- Motion: a 280ms rise on step changes and colour transitions only under
  `prefers-reduced-motion: no-preference`.

## Components

| Component | Where | Structure | States |
|---|---|---|---|
| **RecoveryHeader** (`Journey.header`) | every journey view | eyebrow → serif H1 → lede; quiet Theme / Job-search tools chips | logo shown only below 901px (sidebar shows it on desktop) |
| **Stepping-stone progress** (`.rj-steps`) | start | four stones joined by a path; done stones filled orange | current = ring; labels collapse to the current one on mobile |
| **GoalChoice** (`.rj-goal`) | start step 1 | full-width row: icon disc, label, one outcome line; native radio | hover, checked (inset accent bar), keyboard focus ring |
| **Explicit continue** (`.rj-known`) | "I know my target role" | dashed panel with two labelled choices | no navigation until a choice is pressed |
| **Review list** (`.rj-review`) | start step 4 | definition list with per-row "Change" | Example tag for the fictional example; edit warning when editing |
| **NextAction** (`.rj-next`) | My next step | kicker → serif title → day/time → "Why it matters" rule → one primary | week complete; whole week in a disclosure with checkboxes |
| **Stepping stones** (`.rj-stones`) | progress | ellipses, filled when done | announced as "N of M steps done" |
| **Snapshot** (`.rj-snap`) | My next step | "Where you are" definition list in a side column | stacks under the main column below 960px |
| **DirectionCanvas** (`.rj-dirs`) | Explore directions | three columns divided by rules (not cards); icon, name, target, first experiment, "What is still unknown" disclosure | current (top accent bar), matches-goal tag, switch confirmation dialog |
| **ConsentHandoff** (`.rj-consent`) | Find opportunities | "What will be used" (editable value) + "What will not happen" | Continue / Not now / Review |
| **EvidenceStatus** (`.rj-ledger`) | My evidence | serif quote with orange rule, status tag, actions | not reviewed / reviewed by you / set aside, Undo |
| **EmptyState** (`.rj-empty`) | no session, no evidence | icon art + one primary + one quiet way out | — |
| **Dialog** (`Journey.confirm`) | switching direction | native `<dialog>`, focus starts on the safe choice | Escape = cancel |

**Planned, not built:** ProgressReflection (weekly reflection), Opportunity Lens framing inside
the job-search views. They are not shown as buttons anywhere.

## Iconography

Original 24px stroke icons drawn for this project (`Journey.icon`): a path with a flag (next
step), compass (directions), lens (opportunities), page stack (applications), quotation marks
(evidence), a looping arrow (similar work), a branching path (a new kind of work) and stepping
stones (a stepping-stone role). No third-party icon set or reference-site asset is used.

## Navigation

- Desktop: "Your recovery" (My next step, Explore directions, Find opportunities, Applications,
  My evidence) above a "Tools & settings" toggle that collapses every job-search tool group.
  Visiting a tool opens the section so its active item stays visible.
- Mobile (≤760px, journey screens): a four-item bottom bar (Next step, Directions,
  Opportunities, More → the drawer with everything else).
- Job-search screens: a quiet one-line "My next step" panel above the content.
- On journey screens the workspace search bar, AI-key banner, setup toasts and docs chat are
  hidden; they remain on the tool screens where they are relevant.

## Accessibility checks (automated in `workspace/scripts/reboundops-smoke.mjs --browser`)

- axe (serious/critical) on all five journey screens in light and dark: 0 findings.
- No horizontal overflow at 320, 390, 768 and 1440px on all five screens, both themes.
- Not automated: screen-reader walk-through, zoom to 400%, Windows high-contrast mode.

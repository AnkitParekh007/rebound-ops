**Difficulty:** easy–medium · **Labels:** `documentation`, `good first issue`, `help wanted`

### Background

The README has a placeholder instead of screenshots (the "Screenshots" section of `README.md`). Screenshots must show **fictional data only** and should be easy to regenerate whenever the UI changes.

### Files

- `README.md` (Screenshots section)
- new: `docs/assets/screenshots/` (light and dark PNGs)
- optional new: `scripts/capture-screenshots.ts`, a Playwright script that reuses the journey in `tests/e2e/journey.spec.ts` with `tests/fixtures/resumes/jordan-fictional.txt` and `tests/fixtures/jobs/labelled.txt`

### Acceptance criteria

- [ ] Screenshots of Overview, Job intake (with evidence), Assessment, Documents and Tracker, in light and dark themes.
- [ ] Every name, employer, email and URL in the images is fictional, and the data folder is a temporary one, not `~/.reboundops`.
- [ ] Each PNG is under 300 KB. The README uses `<picture>` with a light and a dark source, plus descriptive `alt` text.
- [ ] If a capture script is added, it is documented in `CONTRIBUTING.md` and passes `npm run lint` and `npm run typecheck`.

### Verify

- Open the README on the PR branch on GitHub, in light and dark mode.
- If a script was added, run `npm run lint && npm run typecheck`.

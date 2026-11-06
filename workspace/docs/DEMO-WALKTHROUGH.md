# ReboundOps Next — demo walkthrough (fictional data)

> Local demo only; not publicly hosted; AI off; no personal data used.

Start the services from the repository root (`scripts/start-demo.sh`, see
[INTEGRATION-DEMO.md](INTEGRATION-DEMO.md)). The screenshots below are produced
by `node scripts/reboundops-smoke.mjs --browser` (run inside `workspace/`); the folder is git-ignored by
the workspace's `screenshots/` ignore rule, so run that once to see them. For a true "first visit", use a
private window or clear this site's storage.

## 1. Goal — `http://127.0.0.1:4317/#/start`

Expect: the ReboundOps R mark and two-tone wordmark in the sidebar, the full logo
above the headline, orange accent, **Recovery** as
the first nav item, headline *Your next career move starts with clarity.*, five
goal choices, and the note that this is a self-guided hypothesis with AI off.

1. Click **Use fictional demo** (fills: Software Engineer · 4 h/week · Soon ·
   one fictional achievement).
2. Optionally pick **Find a similar role**.
3. Click **Create my recovery session**.

![Screen A](reboundops-next/screenshots/1-start.png)

## 2. Recovery and direction — `#/recovery`

Expect: *First get clarity. Then take action.*; three cards — Similar work to
before (Return), A new kind of work (Shift), A stepping-stone role (Bridge) —
each with target, missing proof, uncertainty and suggested test from the API;
"1 self-reported achievement (unverified)". The goal's suggested direction has a
badge; nothing is pre-selected.

![Screen B](reboundops-next/screenshots/2-directions.png)

## 3. Seven-day plan

1. Click **Choose this direction** on *Similar work to before*.
2. Expect five actions, *Planned 200 of 240 min budget*, revision 1, and an
   Unknowns note.
3. Tick **Day 1** → *1 of 5 done*, revision 2 (saved in the ReboundOps API).
4. Optional: **Switch to this direction** on another card → the plan is
   replaced using the current revision. **Export plan (.md)** downloads the
   API's Markdown.

![Plan](reboundops-next/screenshots/3-plan.png)

## 4. ReboundOps workspace

1. Click **Continue to job-search workspace** → `#/dashboard` (Command Center).
2. Expect the unchanged ReboundOps dashboard and, above it, the strip:
   *ReboundOps · Goal · Direction: Similar work to before — Software Engineer ·
   Next: Day 2 … · Back to recovery plan*.
3. Visit Scan, Evaluate, Tracker, CV from the sidebar — native views, strip on top.
4. With a fresh `engine/` folder the dashboard shows empty states and a
   "Setup issue: cv.md …" toast: that is ReboundOps reporting honestly that no
   CV/profile exists. The demo does not create them.

![Workspace](reboundops-next/screenshots/4-workspace.png)

## 5. Failure states

* Stop the ReboundOps API (Ctrl+C the script, or kill the 4174 process while the
  UI keeps running): `#/start` shows **Recovery service is offline** with the
  restart command; the ReboundOps views keep working.
* Restarting the API drops memory-only sessions: `#/recovery` explains the
  session is gone and links back to `#/start`.

## Manual acceptance checklist

- [ ] First visit with no hash opens `#/start`; `#/dashboard` bookmarks still open the dashboard
- [ ] Fictional intake creates a session; three routes are shown
- [ ] Plan total ≤ 240 min for 4 h/week; switching direction updates the plan
- [ ] A ticked action survives a page refresh (it is read back from the API)
- [ ] Continue opens the dashboard; Scan/Evaluate/Tracker still work; strip shows goal/direction/next action
- [ ] API stopped → "Recovery service is offline"; no plan is invented
- [ ] Light and dark theme both show the ReboundOps logo variant, orange accent and readable text
- [ ] `git status engine` is clean after the demo (no files written to the engine folder)

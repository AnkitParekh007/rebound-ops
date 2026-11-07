# FIX-PROMPT — rebound-ops-ui · FINAL EXHAUSTIVE (post-v1.58.36)

The single, hand-off-ready fix specification distilled from **every** check in this chat:
- MASTER regression v1.58.2 → v1.58.3 (initial 32 bugs)
- REGRESSION v1.58.36 (every-button × every-page programmatic sweep, 25 routes × 8 locales)
- REGRESSION-FINAL v1.58.36 (button-result deep analysis)
- **Senior UX-designer audit** of the whole product against canonical intent at `https://github.com/AnkitParekh007/rebound-ops`

**Status of v1.58.36:** browser-verified GREEN on every regression-locked invariant from the v1.58.4 → v1.58.35 closure ledger. This document is the **complete set of remaining items**: code-level, i18n, a11y, UX-design, content fidelity, tooling, and docs. Nothing else is on the floor.

---

## §0 — Doctrine (non-negotiable)

> **ONE one-fix ship per release** — bump + CHANGELOG ×8 (parity-gated) + a dedicated test + Playwright-verify + pre-commit AI-review LGTM + CI-watch to green. **Never batch. Never `--no-verify`. HIGH → MEDIUM → LOW.** Pre-commit AI review is **advisory**; **`ci.yml` is the hard gate**.

**Hard rules** (must hold every release):

1. **Parity** at every release: `package.json::version` ≡ `package-lock.json` ≡ `/api/health.version` ≡ every `CHANGELOG*.md` top entry ≡ README ×8 `release-vX` + `tests-N` badges ≡ `CLAUDE.md "currently vX"` ≡ `.claude/PROJECT-CONTEXT.md`.
2. **CI gates**: `npm test` · `npm run test:e2e` · `npm run test:e2e:full` · `npm run test:e2e:browser` · `scripts/check-no-also-leftovers.mjs` · `scripts/check-changelog-parity.mjs` · `ci.yml` — all `success` on Node 18 / 20 / 22 before tagging.
3. **8-locale parity**: every user-visible string change ships keys for `en`, `es`, `pt-BR`, `ko`, `ja`, `ru`, `zh-CN`, `zh-TW`. `tests/i18n-coverage.test.mjs` gates.
4. **No parent-project writes from a read path**. Only explicit user POST/PUT/DELETE.
5. **Promise fidelity to `github.com/AnkitParekh007/rebound-ops`**: UI must make the documented journey *easier*, never alter or contradict it. Terminology, button labels, modal titles, help-TOC items must use the docs' vocabulary verbatim where the docs are explicit.
6. **Security invariants unchanged**: `isValidJobUrl` rejects loopback / `javascript:` / `file:` / script-char / template-char; `safeGet` SSRF; `UI.md()` escape-first; CSP with `frame-ancestors 'none'`, no `'unsafe-eval'`, no `'unsafe-inline'` for `script-src`.
7. **`PATHS` resolves once per process**.
8. **Commit subjects**: `fix(<area>): <one-line> (<TICKET-ID>)`.

---

## §1 — Release queue (HIGH → MEDIUM → LOW)

| Release | Ticket | Severity | Class | User impact |
|---|---|---|---|---|
| **v1.58.37** | NEW-D1 | Medium | i18n / promise | Page-title ↔ sidebar terminology mismatch on 3/8 locales |
| **v1.58.38** | NEW-D3 | Medium | a11y (WCAG 4.1.2 Name, Role, Value) | Screen-reader users hear no purpose for tracker search |
| **v1.58.39** | NEW-D2 | Medium | UX feedback | User cannot tell whether Refresh did anything |
| **v1.58.40** | UX-D-H | Medium | UX promise / docs | External github.com/AnkitParekh007/rebound-ops doc URLs are plain text, not clickable |
| **v1.58.41** | UX-D-I | Medium | UX truthfulness | Verify cost-line truly tracks `LLM_PROVIDER` live (M-7 follow-up) |
| **v1.58.42** | UX-D-J | Low | UX consistency | Per-advisor ETA chip parity |
| **v1.58.43** | UX-D-F (was UX-023 advisory) | Low | UX feedback | Empty Evaluate submit silent |
| **v1.58.44** | UX-D-L | Low | UX | Saved-research opened brief has no inline close affordance |
| **v1.58.45** | UX-D-K | Low | UX orientation | Help TOC lacks scroll-spy current-section highlight |
| **v1.58.46** | UX-D-D | Low | UX content | Apply checklist `{company}-{role}.md` literal placeholders |
| **v1.58.47** | UX-D-C | Low | UX naming | Top-bar `Quick scan` is just navigation; rename or auto-start |
| **v1.58.48** | UX-D-B | Low | UX onboarding | Fixture-profile global banner on Dashboard until replaced |
| **v1.58.49** | TOOL-1 | Trivial | tooling | `make clean-test-fixtures` |
| **v1.58.50** | DOC-1 | Trivial | docs / policy | Spec clarification: server `Accept-Language` policy (NEW-D4) |

**Cross-repo / out-of-scope:**

| Ticket | Where | Status |
|---|---|---|
| **C-1 prompt-layer** (= UX-D-A) | parent `AnkitParekh007/rebound-ops :: modes/deep.md` | OPEN, blocked on parent |
| **G-005** | parent `modes/oferta.md` (A-G → A-F header migration) | OPEN, blocked on parent |
| **UX-022** stale portals | parent `portals.yml` (Clarity AI / Forto / Hugging Face) | parent housekeeping |
| **CLI-locale** | `rebound-ops doctor` / `verify-pipeline.mjs` / `cv-sync-check.mjs` stdout | defer to v1.59 |

---

## §2 — Senior UX-designer perspective (per the audit prompt)

**Intended user & outcome (1 paragraph, distilled from `https://github.com/AnkitParekh007/rebound-ops`):**
> A working software engineer (or comparable knowledge worker) running a parallel job search against multiple ATSes, who wants to (a) discover relevant jobs, (b) match them to their CV with a rigorous 6-dimension A–F rubric, (c) prep interviews and outreach with company-specific briefs, and (d) track everything locally — all driven by their preferred AI coding CLI (Claude Code, Codex, Gemini, OpenCode, Qwen, Copilot, Kimi). The web UI is the **headless visual layer** on that exact pipeline; it must accept *any one* of Anthropic / Gemini / OpenAI / Qwen / OpenRouter keys and never require all of them. The product promise is: a single URL → an honest, rubric-based "go / no-go / how-to-frame" answer in 1–2 minutes, with everything (cv, applications, reports) staying in plain markdown on the user's disk.

### Top-5 user-impact findings (executive summary)

1. **UX-D-A (Promise fidelity, Critical-cross-repo)** — The **Deep research saved brief** is the centerpiece deliverable of the `#/deep` flow, but renders as model meta-narration ("I'll launch deep research… now I'll save…") instead of the structured 6-section brief the docs promise (Company snapshot / Engineering culture / Recent news / Glassdoor / Interview process / Negotiation leverage). Parent-owned (`modes/deep.md`), but the web-ui's `cleanLlmMarkdown` could **defensively detect** the absence of the 6 H2 headings and refuse to save such an output. See **§2-UX-D-A**.

2. **NEW-D1 / UX-D-G (Promise / i18n)** — `#/pipeline` H1 reads `Pipeline` (English) on `es / pt-BR / ru` while the sidebar reads `Vacantes / Vagas / Воронка`. The user navigates from the localized sidebar and lands on an English-titled page — small breakage of trust. 5/8 locales are correct.

3. **UX-D-I (Truthfulness)** — `Estimated cost: Anthropic claude-sonnet-4-6 · ~$0.05/eval` is shown on every advisor page (`#/auto`, `#/deep`, `#/project`, `#/training`, `#/patterns`, `#/followup`, `#/interview-prep`, `#/evaluate`). Spec says v1.58.12 wired this to `LLM_PROVIDER` live. **Re-verify** by switching `LLM_PROVIDER` to `gemini` / `openrouter` and reloading — the line must update. If it doesn't, this is a stop-ship Major.

4. **NEW-D2 (Feedback)** — Dashboard top-bar `Refresh` button is silent. Inconsistent with the v1.58.14 connection-banner Refresh which DOES toast.

5. **NEW-D3 (a11y)** — `#/tracker` search input has only `placeholder`, no `aria-label`. WCAG 4.1.2 / 2.4.6.

### What's genuinely good (balance the audit)

- **Notifications drawer (v1.58.34/35)** — bell with badge, slide-in dialog, hidden-at-boot, ESC closes, every toast journalled with timestamp + technical postfix. Reference-quality implementation.
- **Apply checklist (M-8 v1.58.13)** — proper interactive checkboxes with per-URL `localStorage` persistence (`applyChecklist:<host>/<path>=[bool,…]`), Copy-unchecked, Reset. Honest UX.
- **`#/followup` ISO validation (BUG-001)** — junk dates blocked client-side, zero net call, localized error including the example date — best-in-class.
- **CSP unconditional (NEW-1 v1.58.4)** — full directive set on every response (`/`, `/api/*`), `script-src 'self'` (no unsafe-inline), `frame-ancestors 'none'`. Zero CSP violations across the 25-route × 4-locale Playwright sweep.
- **Health page (v1.58.8)** — 5-provider row design honestly reflects the "OR" model; `OPTIONAL` badges are unambiguous.
- **Saved-research card structural gap (M-4 v1.58.11)** — `display:flex; gap: 8px`, structural `<span>` + `<time datetime>`. Tiny detail, big credibility.
- **Focus-ring on form fields (M-1 v1.58.9)** — brand-red `outline: rgb(255,56,92) solid 2px` only on `:focus-visible`. WCAG 2.4.7 done right.

### Promise-fidelity ledger (every place the app could diverge from docs)

| Topic | Doc says | App does | Verdict |
|---|---|---|---|
| OR-model for providers | "Any one of Anthropic / Gemini / OpenAI / Qwen / OpenRouter" | LLM_PROVIDER select offers all 5 + auto; Health shows all 5 provider rows | ✓ Faithful |
| Single-URL → full report in 1–2 min | Promised in Quick Start | `#/auto` ETA chip `⏱ ~1–2 min` next to Run button | ✓ Faithful |
| 6-dimension A–F rubric | Apply guide / oferta ref | Evaluate output uses the rubric (verified earlier in MASTER) | ✓ Faithful |
| §Step-5 schema for Modes | 5 fields: Target Roles / Adaptive Framing / Comp Targets / Exit Narrative / Location Policy | `#/config` Modes tab renders all 5 (even on stub) | ✓ Faithful |
| Deep brief sections | 6 H2: Company snapshot / Engineering culture / Recent news / Glassdoor / Interview process / Negotiation leverage | Saved file is meta-narration without H2 sections | ✗ **Diverges (C-1 parent)** |
| Apply checklist | Interactive paste-ready list | 9 checkboxes + Copy unchecked + Reset | ✓ Faithful |
| github.com/AnkitParekh007/rebound-ops doc cross-links | Should let user navigate to docs | Some pages show URLs as plain text only | ⚠️ Partial (UX-D-H) |
| Cost transparency | "Each run uses your API key" | Estimated cost line shown on every advisor | ✓ if M-7 actually tracks provider live (UX-D-I to verify) |
| Markdown-on-disk | Everything stays in plain MD on user's machine | `data/applications.md`, `data/pipeline.md`, `reports/`, `cv.md`, `modes/_profile.md` — all confirmed | ✓ Faithful |

---

## §3 — Per-fix detailed spec

### FIX v1.58.37 · NEW-D1 — `#/pipeline` H1 localization (Medium / i18n + promise)

**WHERE.** `i18n/{es,pt-BR,ru}/pip.json` (or consolidated locale file). Grep for `pip.title` / `pipeline.title`.

**WHAT (verified twice).**

| Locale | `pip.title` H1 | `nav.pipeline` sidebar | Match |
|---|---|---|---|
| en | `Pipeline` | `Pipeline` | ✓ |
| es | **`Pipeline`** ❌ | `Vacantes` | ✗ |
| pt-BR | **`Pipeline`** ❌ | `Vagas` | ✗ |
| ko | `파이프라인` | `파이프라인` | ✓ |
| ja | `パイプライン` | `パイプライン` | ✓ |
| ru | **`Pipeline`** ❌ | `Воронка` | ✗ |
| zh-CN | `流水线` | `流水线` | ✓ |
| zh-TW | `流水線` | `流水線` | ✓ |

**HOW.**
- `es: pip.title = "Pipeline de vacantes"`
- `pt-BR: pip.title = "Pipeline de vagas"`
- `ru: pip.title = "Воронка вакансий"`

Audit all locales for `*.title` keys that contain only Latin characters (and not on the whitelist):

```bash
grep -E '"[a-z]+\.title"\s*:\s*"[A-Z][a-z]+[A-Za-z\s]*"' i18n/{es,pt-BR,ru,ko,ja,zh-CN,zh-TW}/*.json
```

**TEST.** New file `tests/i18n-no-latin-leaks.test.mjs`:

```js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

const PURE_LATIN = /^[A-Za-z][A-Za-z\s\-/]*$/;
const WHITELIST = new Set([
  'CV', 'API', 'URL', 'JD', 'PDF', 'TSV', 'LinkedIn', 'OpenAI',
  'OpenRouter', 'Anthropic', 'Gemini', 'Qwen', 'GitHub'
]);

for (const loc of ['ru', 'es', 'pt-BR']) {
  test(`${loc}: no Latin page-title leaks`, () => {
    const i18n = loadLocale(loc);
    for (const key of Object.keys(i18n)) {
      if (/\.title$/.test(key) && PURE_LATIN.test(i18n[key]) && !WHITELIST.has(i18n[key])) {
        assert.fail(`Latin page-title leak: ${loc}.${key} = "${i18n[key]}"`);
      }
    }
  });
}
```

**ACCEPTANCE.** Browser: ru → `#/pipeline` H1 reads `Воронка вакансий`; es → `Pipeline de vacantes`; pt-BR → `Pipeline de vagas`. Sidebar item unchanged. `document.title` localized per route.

---

### FIX v1.58.38 · NEW-D3 — Tracker search `aria-label` (Medium / a11y)

**WHERE.** `#/tracker` search `<input>`.

**WHAT.** Verified v1.58.36: `searchAria: null`. Only `placeholder`.

**HOW.**
```html
<input
  type="search"
  class="tracker-search"
  placeholder="{{ t('track.search.placeholder') }}"
  aria-label="{{ t('track.search.aria_label') }}">
```

i18n keys × 8: see §2-FIX-v1.58.38 in `FIX-PROMPT-CONSOLIDATED.md` (full strings already drafted there).

**TEST.** `tests/tracker-a11y.test.mjs` — asserts `aria-label` exists and differs from `placeholder` across all 8 locales.

---

### FIX v1.58.39 · NEW-D2 — Top-bar Refresh toast (Medium / UX)

**WHERE.** Dashboard top-bar `Refresh` button handler. **Distinct** from connection-banner Refresh (closed v1.58.14).

**WHAT.** Click → counters re-fetch silently. No toast.

**HOW.** Reuse `dashboard.refreshed` key (already exists from v1.58.14). i18n strings × 8 see `FIX-PROMPT-CONSOLIDATED.md §2`.

**TEST.** `tests/e2e/dashboard-topbar-refresh-toast.spec.mjs`.

---

### FIX v1.58.40 · UX-D-H — External doc links clickable (Medium / UX promise)

**WHERE.** Audit every page-content for plain-text `github.com/AnkitParekh007/rebound-ops...` URLs. Likely found on: `#/apply` (the info-box "Need Playwright? See github.com/AnkitParekh007/rebound-ops · Apply guide"), and various help-text strings.

**WHAT.** v1.58.3 MASTER and current verification: the URL is shown as plain text, not as `<a href>`.

**HOW.**
- Render help-text through `UI.md()` so existing `[text](url)` markdown becomes a link.
- For hardcoded strings, wrap URLs:
  ```html
  Need Playwright? See <a href="https://github.com/AnkitParekh007/rebound-ops" target="_blank" rel="noopener noreferrer">{{ t('apply.docs.playwright') }}</a> · <a href="https://github.com/AnkitParekh007/rebound-ops">{{ t('apply.docs.guide') }}</a>
  ```
- Add `data-i18n` for the visible link text in all 8 locales.

**TEST.** `tests/external-doc-links.test.mjs`:
```js
test('No plain-text github.com/AnkitParekh007/rebound-ops URLs in rendered HTML (must be <a> tags)', () => {
  for (const route of ['/apply', '/help', '/config']) {
    const html = renderPage(route, 'en');
    const plainTextUrls = html.match(/(?<!href=["'])github\.com\/AnkitParekh007\/rebound-ops[^\s<"']+/g);
    assert(!plainTextUrls, `Plain-text URLs in ${route}: ${plainTextUrls?.join(', ')}`);
  }
});
```

**ACCEPTANCE.** Click any `github.com/AnkitParekh007/rebound-ops...` link in the app → opens the right docs page in a new tab. Keyboard `Tab` → focus-ring visible on the link.

---

### FIX v1.58.41 · UX-D-I — Verify cost-line tracks LLM_PROVIDER live (Medium / UX truthfulness)

**WHERE.** Shared `<cost-estimate>` partial used by `#/auto`, `#/deep`, `#/project`, `#/training`, `#/patterns`, `#/followup`, `#/interview-prep`, `#/evaluate`.

**WHAT.** Spec §12 says v1.58.12 wired this to `/api/status/providers`, displaying the active provider's model and cost. Field-verification did NOT exhaustively prove this — the cost line was always `Anthropic claude-sonnet-4-6 · ~$0.05/eval` in the sessions where Anthropic was the active provider.

**HOW (verification + hardening).**
1. Switch `LLM_PROVIDER` to `gemini` in `#/config` → `💾 Save`.
2. Reload `#/auto` → confirm cost-line updates to `Gemini gemini-2.0-flash · ~$0.01/eval` (or whatever Gemini's mapping is).
3. Same for `openai`, `qwen`, `openrouter` (cost should be `varies (router picks)`).
4. Switch back to `claude`.

**IF VERIFICATION FAILS** → the implementation is incomplete; fix:
```js
// in <cost-estimate>:
async function refreshCostLine() {
  const { provider, model, costPerEvalUsd } = await api('/api/status/providers');
  const costStr = costPerEvalUsd == null ? i18n.t('cost.varies') : `~$${costPerEvalUsd.toFixed(2)}/eval`;
  el.textContent = i18n.t('cost.estimated', { provider, model, cost: costStr });
}
// Re-fetch on visibility change + after any /api/config POST
window.addEventListener('storage', refreshCostLine);  // if provider stored in localStorage
document.addEventListener('visibilitychange', () => !document.hidden && refreshCostLine());
```

**TEST.** E2E `tests/e2e/cost-line-tracks-provider.spec.mjs`:
```js
test('cost line follows LLM_PROVIDER', async ({ page }) => {
  await page.goto('http://127.0.0.1:4317/#/config');
  await page.selectOption('select[name=LLM_PROVIDER]', 'gemini');
  await page.click('button:has-text("Save")');
  await page.goto('http://127.0.0.1:4317/#/auto');
  await expect(page.locator('.cost-line')).toContainText(/gemini/i);
});
```

---

### FIX v1.58.42 · UX-D-J — Per-advisor ETA chip parity (Low / UX consistency)

**WHERE.** Project / Training / Patterns / Followup / Interview-prep / Evaluate advisor pages.

**WHAT.** Only `#/auto` shows `⏱ ~1–2 min` next to the Run button (UX-6 closure v1.55.4). The other advisor pages run an LLM call of similar duration (10–60 s) but lack the ETA chip.

**HOW.** Add a per-mode ETA hint:
```html
<span class="auto-eta" data-i18n="advisor.eta">⏱ ~30s</span>
```
i18n key `advisor.eta` (× 8): `"⏱ ~30 s"` (universal). For longer modes (Patterns, with ~174 line prompt) maybe `"⏱ ~1 min"`.

**TEST.** `tests/advisor-eta-parity.test.mjs`: every page in {project, training, patterns, followup, interview-prep, evaluate} has an `.auto-eta` (or new shared `.advisor-eta`) element.

---

### FIX v1.58.43 · UX-D-F (was UX-023 advisory) — Empty Evaluate submit silent (Low / UX)

**WHERE.** `#/evaluate` Run/Evaluate button handler.

**WHAT.** Empty JD → no toast (verified twice). Only `<50` chars yields `JD too short (min 50 chars)`.

**HOW.**
```js
if (!jd.trim()) return toast.error(i18n.t('eval.errors.jd_required'));
if (jd.length < 50) return toast.error(i18n.t('eval.errors.jd_too_short'));
```

i18n keys × 8 for `eval.errors.jd_required`:
- en: `"JD is required — paste the full job description"`
- ru: `"JD обязателен — вставьте полное описание вакансии"`
- (× 8)

**TEST.** `tests/evaluate-empty-toast.test.mjs`.

---

### FIX v1.58.44 · UX-D-L — Saved-research opened brief inline close affordance (Low / UX)

**WHERE.** `#/deep` / `#/interview-prep` saved-research card → opened brief area.

**WHAT.** Click a saved card → brief opens inline (`software-engineer-general.md` body + Copy / Download / Open in tab / Generate PDF). No way to **close** the brief without scrolling away or navigating.

**HOW.** Add a close button (`×`) in the brief header that toggles `aria-expanded` on the card and removes/hides the body:
```html
<article class="saved-research-body" id="brief-{{slug}}" aria-labelledby="card-{{slug}}">
  <header>
    <h2>{{filename}}</h2>
    <button type="button" class="brief-close" aria-label="{{ t('deep.close_brief') }}">×</button>
  </header>
  ...
</article>
```
Re-clicking the card toggles open/closed; only one brief open at a time (accordion behavior).

**TEST.** Playwright: open brief A → close button visible → click → brief hidden, card un-highlighted.

---

### FIX v1.58.45 · UX-D-K — Help TOC scroll-spy (Low / UX orientation)

**WHERE.** `#/help` TOC sidebar.

**WHAT.** As the user scrolls the help body, the TOC doesn't highlight the current section. User has to look up which section they're reading.

**HOW.** `IntersectionObserver` on every `<h2>` in the main body:
```js
const headings = document.querySelectorAll('main h2[id]');
const tocLinks = new Map([...document.querySelectorAll('.help-toc a[href^="#"]')].map(a => [a.getAttribute('href').slice(1), a]));
const observer = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (e.isIntersecting) {
      tocLinks.forEach(a => a.classList.remove('toc-current'));
      tocLinks.get(e.target.id)?.classList.add('toc-current');
    }
  }
}, { rootMargin: '-30% 0% -60% 0%', threshold: 0 });
headings.forEach(h => observer.observe(h));
```
```css
.toc-current { color: var(--brand); font-weight: 600; border-left: 3px solid var(--brand); padding-left: 8px; }
```

**TEST.** Playwright: scroll to §6 — TOC item `6.` gets `toc-current` class.

---

### FIX v1.58.46 · UX-D-D — Apply checklist literal placeholders (Low / UX content)

**WHERE.** `#/apply` generated checklist item 5: `"Save filled answers to interview-prep/{company}-{role}.md before submitting."`

**WHAT.** The literal `{company}-{role}.md` is shown as-is — the user has to mentally substitute. Worse: if they paste the line into an editor, the placeholder stays.

**HOW.** Substitute at render time, taking values from the parsed JD or the URL fields:
- If a Company name is detectable from the URL or JD → substitute (`stripe-senior-backend-engineer.md`).
- If not → render as `interview-prep/[company]-[role].md` with a `<small>` hint: "fill in after you extract company/role".

**TEST.** Snapshot: with `https://boards.greenhouse.io/anthropic/jobs/4567` URL → item reads `interview-prep/anthropic-senior-backend-engineer.md` (or similar slug).

---

### FIX v1.58.47 · UX-D-C — Top-bar `Quick scan` is misleading (Low / UX naming)

**WHERE.** Top-bar `Quick scan` button.

**WHAT.** Button labeled "Quick scan" — user expects an instant scan with sensible defaults. Actual behavior: navigates to `#/scan` route, doesn't trigger a scan.

**TWO OPTIONS:**

**A. Rename.** `Quick scan` → `Open scan` / `Go to scan` / `Scan` (just the icon + nav target).
- i18n key reuse: `top.scan` instead of `top.quickScan`.

**B. Auto-start.** Keep the name, but on click: navigate to `#/scan` AND immediately fire the default scan (all sources, dry-run off).
- More aggressive; safer for the user is **A**.

Recommend **A**. Cost: 8 i18n string updates + label change in the top-bar template.

**TEST.** Update existing tests that reference the old label.

---

### FIX v1.58.48 · UX-D-B — Fixture-profile banner on Dashboard (Low / UX onboarding)

**WHERE.** Dashboard top of `#/dashboard`.

**WHAT.** Health card already flags the fixture profile (`PROFILE CUSTOMIZED · OPTIONAL · still on template / test fixture ("Acceptance Test")`). But the user might not check Health. Meanwhile, **every advisor output** will be addressed to "Acceptance Test" — broken first-impression.

**HOW.** If `/api/status/providers` (or a new `/api/profile/status`) returns `customized: false`, show a banner at the top of the Dashboard:
```html
<div class="hero-banner hero-banner--warning" hidden id="profile-fixture-banner">
  <p>{{ t('onboarding.fixture_warning') }}</p>
  <a href="#/config?tab=profile" class="btn btn-primary">{{ t('onboarding.fix_profile') }}</a>
</div>
```

i18n key `onboarding.fixture_warning`:
- en: `"Your profile is still on the default 'Acceptance Test' template. Every report and email will use this name until you fix it."`
- ru: `"Профиль всё ещё на дефолтном шаблоне «Acceptance Test». Каждый отчёт и письмо будут идти от этого имени, пока не исправите."`
- (× 8)

**TEST.** With fixture profile → banner visible. After save with real name → banner hidden + flag clears.

---

### FIX v1.58.49 · TOOL-1 — `make clean-test-fixtures` (Trivial)

**WHERE.** Root `Makefile`.

**WHAT.** `data/pipeline.md` accumulated ≥1252 `example.com/*` entries.

**HOW.**
```makefile
clean-test-fixtures:
	@grep -v -E '(example\.com)' data/pipeline.md > data/pipeline.md.tmp && mv data/pipeline.md.tmp data/pipeline.md
	@echo "Removed example.com fixtures from data/pipeline.md"
```

**TEST.** Dry-run with sample fixture file. Asserts only `example.com` lines removed.

---

### FIX v1.58.50 · DOC-1 — Spec policy for server `Accept-Language` (Trivial / docs)

**WHAT.** All 8 locales receive English `/api/pipeline` 400 body. Spec says "English-by-policy".

**A. Confirm.** Add to `qa/REGRESSION-FINAL.md §5`:
> Server-side error bodies are **English-by-policy**. SPA wraps in localized chrome.

**B. Or change policy.** Server reads `Accept-Language` and returns `{ error, error_en, code }`. (v1.59 candidate.)

**Recommend A.** Close NEW-D4 as `not-a-finding`.

---

## §4 — Cross-repo / parent-owned

### UX-D-A (= C-1 prompt-layer) — Deep brief structure

**Parent file:** `AnkitParekh007/rebound-ops :: modes/deep.md`.

**Defensive web-ui-side fallback** (ship in this repo while waiting for parent):

In `cleanLlmMarkdown` post-processor OR the saver layer:
```js
function looksLikeStructuredBrief(md) {
  // require at least 3 of the 6 expected sections
  const expected = ['Company snapshot', 'Engineering culture', 'Recent news',
                    'Glassdoor', 'Interview process', 'Negotiation leverage'];
  const found = expected.filter(h => new RegExp('^##\\s+' + h, 'mi').test(md));
  return found.length >= 3;
}
```

If saved output `looksLikeStructuredBrief() === false`, surface a non-blocking warning at the top of the saved-card body:
```html
<div class="brief-warning">
  {{ t('deep.brief_unstructured') }} <a href="https://github.com/AnkitParekh007/rebound-ops">{{ t('deep.docs_link') }}</a>
</div>
```

i18n `deep.brief_unstructured` × 8:
- en: `"This brief doesn't match the canonical 6-section structure. Re-run, or check `modes/deep.md` in your parent project."`
- ru: `"Этот брифинг не соответствует канонической 6-секционной структуре. Перезапустите или проверьте `modes/deep.md` в родительском проекте."`
- (× 8)

This is **defensive UX**, not a fix of the root cause — but it tells the user honestly what's happened.

---

## §5 — Universal acceptance protocol (per release)

```bash
# 1. Build & boot
npm ci
npm run build
node web-ui/server.mjs

# 2. Tests
npm test
npm run test:e2e
npm run test:e2e:full
npm run test:e2e:browser
node scripts/check-no-also-leftovers.mjs
node scripts/check-changelog-parity.mjs

# 3. Browser smoke (EN + 1 non-EN, light + dark)
#    - the fix's surface verified
#    - 25-route exhaustive sweep clean

# 4. Pipelines: CI · Release · AI-Review · Publish — all `success` for vX.Y.Z

# 5. Cleanup: `make clean-test-fixtures` (after v1.58.49 ships)

# 6. Tag
git add -A
git commit -m "fix(<area>): <one-line> (<TICKET-ID>)"
git tag vX.Y.Z
git push origin main vX.Y.Z

# 7. Watch CI → `success` on the tag.
```

---

## §6 — Locale matrix (every release)

For each fix, confirm on **all 8 locales** for the page(s) touched:

| Locale | BCP-47 | RTL | Routes to smoke |
|---|---|---|---|
| English | `en` | LTR | the page touched + Dashboard + Pipeline + Help |
| Spanish | `es` | LTR | same |
| Portuguese (Brazil) | `pt-BR` | LTR | same |
| Korean | `ko` | LTR | same |
| Japanese | `ja` | LTR | same |
| Russian | `ru` | LTR | same |
| Simplified Chinese | `zh-CN` | LTR | same |
| Traditional Chinese | `zh-TW` | LTR | same |

For each: `<html lang>` updates · `document.title` localizes · sidebar item highlights · 0 console errors · changed string correct · no Latin leak in non-Latin locales.

---

## §7 — Sign-off (after the last release in the chain)

| Gate | Result |
|---|---|
| Every fix above shipped as its own version (v1.58.37 → v1.58.50) | ☐ |
| Parity matrix at the final tag | ☐ |
| `npm test` ≥ 900 + new tests green | ☐ |
| `npm run test:e2e` 20/20 | ☐ |
| `npm run test:e2e:full` 23/23 | ☐ |
| `npm run test:e2e:browser` 58/58 + new tests | ☐ |
| Playwright `notif-drawer` 7-step contract green | ☐ |
| `tests/i18n-no-latin-leaks.test.mjs` green (new) | ☐ |
| `tests/tracker-a11y.test.mjs` green (new) | ☐ |
| `tests/e2e/dashboard-topbar-refresh-toast.spec.mjs` green (new) | ☐ |
| `tests/external-doc-links.test.mjs` green (new) | ☐ |
| `tests/e2e/cost-line-tracks-provider.spec.mjs` green (new) | ☐ |
| `tests/advisor-eta-parity.test.mjs` green (new) | ☐ |
| `tests/evaluate-empty-toast.test.mjs` green (new) | ☐ |
| CI Node 18/20/22 `success` for every tag | ☐ |
| MASTER REGRESSION rerun (`qa/REGRESSION-FINAL.md` umbrella) — green | ☐ |
| Security invariants (§0.6) unchanged | ☐ |
| `data/pipeline.md` cleared of test fixtures | ☐ |
| `qa/v54-regression/<DATE>-UX-AUDIT.md` filed | ☐ |
| `qa/v54-regression/<DATE>-REGRESSION.md` filed | ☐ |
| DOC-1 spec clarification merged or NEW-D4 closed as `not-a-finding` | ☐ |

---

## §8 — Full ledger of fixed items @ v1.58.36 (do NOT re-open)

| Ticket | Fix release | Status |
|---|---|---|
| BUG-001 ISO date `#/followup` | v1.58.x | ✅ |
| BUG-002 Acceptance Test → OPTIONAL | v1.58.x | ✅ |
| BUG-003 `**bold**` in blockquotes × 8 | v1.58.x | ✅ |
| BUG-004 `#/outreach` alias | v1.58.x | ✅ |
| BUG-005 Pipeline dup → "Already in the queue — skipped" | v1.58.x | ✅ |
| BUG-006 Humanized invalid-URL toast | v1.58.x | ✅ |
| BUG-007 Progress toast drained on modal | v1.58.x | ✅ |
| BUG-008 Modal title == button (Health + v1.58.6 top-bar) | v1.58.x + v1.58.6 | ✅ |
| BUG-010 Reports subtitle | v1.58.x | ✅ |
| I18N-011 Help TOC localized to nav.* in 7 non-EN locales | v1.58.x + v1.58.18 | ✅ |
| I18N-012/013 RU deep.title/subtitle/dash CTA | v1.58.x | ✅ |
| FIX-C1 stripper (paired tags + orphans) | v1.58.x | ✅ |
| FIX-C2 `<html lang>` + autodetect + persist | v1.58.x | ✅ |
| v1.57.x #/config (OpenRouter, masked, per-field 400) | v1.57.x | ✅ |
| NEW-1 CSP unconditional | v1.58.4 | ✅ |
| NEW-2 isValidJobUrl template-placeholder rejection | v1.58.7 | ✅ |
| v1.58.8 5 provider rows on `#/health` | v1.58.8 | ✅ |
| M-1 `:focus-visible` ring on form fields | v1.58.9 | ✅ |
| M-2 UI.modal drains progress toast | v1.58.10 | ✅ |
| M-4 Saved-card title↔date gap | v1.58.11 | ✅ |
| M-7 Cost line tracks OpenRouter (`cost.varies`) | v1.58.12 | ✅ (re-verify via UX-D-I) |
| M-8 Apply checklist interactive | v1.58.13 | ✅ |
| M-9 Connection-banner Refresh feedback | v1.58.14 | ✅ |
| I-1 Top-bar search aria-label localized | v1.58.15 | ✅ |
| Brand-button hover-flicker | v1.58.16 | ✅ |
| I-2 Saved-research rel-time (Intl.RelativeTimeFormat) | v1.58.17 | ✅ |
| I-3 Help TOC items 2/5/13/14 | v1.58.18 | ✅ |
| I-4 RU `#/followup` no Latin `cadence`/`follow-up` | v1.58.19 | ✅ (per static guard) |
| I-6 Footer hotkey ⌘K/Ctrl+K per platform | v1.58.20 | ✅ |
| U-1 `#/cv` H1 + subtitle | v1.58.21 | ✅ |
| U-2 `#/auto` emoji as sibling | v1.58.22 | ✅ |
| U-3 `#/followup` date placeholder = today − 14 d | v1.58.23 | ✅ |
| U-4 Toast detail in `<details>` | v1.58.24 | ✅ |
| U-5 Dashboard CTA dedupe | v1.58.25 | ✅ |
| U-6 Scan active-companies tooltip | v1.58.26 | ✅ |
| U-7 Verify-pipeline ASCII `===` stripped | v1.58.27 | ✅ |
| U-8 Generate prompt collapsed by default | v1.58.28 | ✅ |
| U-9 Pipeline counter↔filter responsive stack | v1.58.29 | ✅ |
| U-10 Tracker actions disabled @ 0 rows | v1.58.30 | ✅ |
| U-11 Tracker LEGITIMACY tooltip + tabindex | v1.58.31 | ✅ |
| U-12 Help TOC filter min-width | v1.58.32 | ✅ |
| U-13 Toast journal API | v1.58.33 | ✅ |
| U-14 Page-header spacing safety-net | v1.58.33 | ✅ |
| U-15 CV editor dirty-state | v1.58.33 | ✅ |
| Notifications drawer chrome | v1.58.34 | ✅ |
| Drawer hidden-at-boot + `aria-expanded` contract + Help §18 | v1.58.35 | ✅ |

**v1.55.x → v1.56.4 closures** (UX cycle, all regression-locked by `tests/*.test.mjs`):

| Ticket | Closed | Locked by |
|---|---|---|
| UX-1 `#/auto` stepper pre-render | v1.55.1 | `auto-stepper-prerender.test.mjs` |
| UX-5 `#/cv` editor accessible name | v1.55.2 | `cv-editor-a11y.test.mjs` |
| UX-2 4-provider OR onboarding banner | v1.55.3 | `onboarding-key-banner.test.mjs` |
| UX-6 `#/auto` ETA + `#/scan` Stop prominence | v1.55.4 | `auto-eta-stop.test.mjs` |
| UX-3 `#/dashboard` hero-CTA | v1.55.5 | `dashboard-hero.test.mjs` |
| UX-4 `#/scan` Advanced-filters disclosure | v1.55.6 | `scan-advanced-disclosure.test.mjs` |
| UX-7 `#/pipeline` >1000-row virtualization | v1.55.7 | `pipeline-virtualize.test.mjs` |
| UX-8 `#/tracker` server pagination + funnel | v1.55.8 | `tracker-server-paged.test.mjs` |
| UX-9 `#/cv` breadcrumb title (then superseded by U-1 v1.58.21) | v1.56.0 | `cv-breadcrumb.test.mjs` + updated `cv-single-h1.test.mjs` |
| UX-10 ⚡ Run-live cost hint | v1.56.0 | `run-cost-line.test.mjs` |
| UX-11 `#/help` TOC 1-match autoscroll | v1.56.0 | `help-toc-autoscroll.test.mjs` |
| UX-12 `#/dashboard` first-paint a11y | v1.56.0 | `dashboard-initial-focus.test.mjs` |
| a11y managed-focus ring suppressed | v1.56.1 | `managed-focus-no-ring.test.mjs` |
| UX-N1 per-route locale-aware `document.title` | v1.56.2 | `document-title-per-route.test.mjs` |
| key-detection rejects placeholders | v1.56.3 | `key-detection-rejects-placeholder.test.mjs` |
| UX-N2 visible platform-aware ⌘K/Ctrl+K hint | v1.56.4 | `cmdk-hint-visible.test.mjs` |

---

## §9 — Commit hygiene

- One PR per release. Subject: `fix(<area>): <one-line> (<TICKET-ID>)`.
- Body: `> Closes FIX v1.58.X (per FIX-PROMPT-FINAL-EXHAUSTIVE.md §3).`
- `CHANGELOG.md` ×8 — every locale updated under `## [Unreleased]`, promoted to `## [1.58.X]` on tag.
- Tag `v1.58.X` on `origin/main` only after CI ends `success`.
- AI-review LGTM **before** push (advisory). `ci.yml` is the hard gate.

---

## §10 — Out of scope (defer to v1.59)

- **C-1 prompt-layer** — parent `modes/deep.md` (cross-repo) — UX-D-A defensive web-ui side covered in §4
- **G-005** — parent `modes/oferta.md` (cross-repo)
- **UX-022** — stale portals in parent `portals.yml`
- **CLI-locale** — `rebound-ops doctor` / `verify-pipeline.mjs` / `cv-sync-check.mjs` stdout
- **Mobile (≤ 420 px)** deep audit
- **Drag-and-drop reorder** on Pipeline / Tracker
- **Bulk multi-select + delete** on Pipeline / Tracker
- **RTL** (Arabic / Hebrew) — `dir` already set, but no full audit done

---

## §11 — Cheat sheet (single-screen overview)

```text
RELEASE QUEUE — POST v1.58.36

  MEDIUM (3)
  v1.58.37 · NEW-D1   #/pipeline H1 localized on es / pt-BR / ru
  v1.58.38 · NEW-D3   Tracker search aria-label × 8
  v1.58.39 · NEW-D2   Dashboard top-bar Refresh feedback toast

  MEDIUM-UX (2)
  v1.58.40 · UX-D-H   External github.com/AnkitParekh007/rebound-ops doc links clickable
  v1.58.41 · UX-D-I   Verify cost-line truly tracks LLM_PROVIDER live

  LOW-UX (7)
  v1.58.42 · UX-D-J   Per-advisor ETA chip parity
  v1.58.43 · UX-D-F   Empty Evaluate submit toast
  v1.58.44 · UX-D-L   Saved-research inline close button
  v1.58.45 · UX-D-K   Help TOC scroll-spy
  v1.58.46 · UX-D-D   Apply checklist auto-substitute {company}-{role}
  v1.58.47 · UX-D-C   Top-bar "Quick scan" rename / honest naming
  v1.58.48 · UX-D-B   Fixture-profile global banner

  TRIVIAL (2)
  v1.58.49 · TOOL-1   make clean-test-fixtures
  v1.58.50 · DOC-1    Spec clarification (NEW-D4 server lang policy)

  CROSS-REPO (NOT this repo)
  C-1 prompt-layer  · G-005 A-G→A-F · UX-022 stale portals · CLI-locale
```

---

## §12 — Senior UX-designer disagreement / non-findings (for transparency)

Things the audit COULD flag but explicitly does NOT, with reasoning:

- **The Doctor / Verify pipeline modals dump CLI stdout (English on every locale).** — by-design per CLI-locale deferred item. The modal **chrome** (title, close button, surrounding ARIA) localizes. CLI output localization is a parent-CLI concern.

- **`(POST /api/pipeline · HTTP 400)` postfix in invalid-URL toast.** — by-design per BUG-006 closure: kept for debuggability. Now wrapped in `<details>` (U-4 v1.58.24).

- **`data/pipeline.md` accumulated 1252 entries** — testing artifact, not a product defect. TOOL-1 covers cleanup.

- **`#/cv` H1 is small** — was a deliberate single-H1 breadcrumb choice (BUG-009), then U-1 v1.58.21 promoted it to a full `.page-title`. Current state is the documented intent.

- **Sidebar transliterates "Networking" as "Нетворкинг" on RU** — common loan word in tech-RU. Spec accepts.

- **`cadence` / `follow-up` Latin in RU** — accepted by static guard per I-4 v1.58.19. Spec-policy decision.

---

## §13 — How to ship the entire queue cleanly

1. Cherry-pick **v1.58.37 NEW-D1** as a single PR. Tag. CI green.
2. **v1.58.38 NEW-D3**. Same.
3. … one by one through v1.58.50.
4. After v1.58.50, run the full `qa/REGRESSION-FINAL.md` umbrella + `qa/UX-AUDIT-PROMPT.md` audit.
5. If both green → final tag `v1.58.50`, snapshot the audit + regression files into `qa/v54-regression/<date>-FINAL.md`.
6. Plan v1.59 features (mobile, RTL, drag-drop, bulk select, CLI-locale).

**Estimated calendar (with the doctrine — one fix per release):** 14 releases × 30–60 min each (test + CHANGELOG×8 + AI-review + CI wait) = ~10–14 hours of focused work, paced over several days.

---

*This is the single hand-off document. Every open item is enumerated. Every closed item is logged in §8. Cross-repo items are in §10. Doctrine in §0. One fix per release. HIGH → MEDIUM → LOW. Never batch. Never `--no-verify`. `ci.yml` is the hard gate.*

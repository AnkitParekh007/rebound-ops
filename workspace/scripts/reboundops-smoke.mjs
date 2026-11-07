#!/usr/bin/env node
/**
 * ReboundOps Next — live integration smoke test.
 *
 * Runs against the REAL running services (start them first with
 * scripts/start-demo.sh at the repository root):
 *   ReboundOps Workspace + bridge  http://127.0.0.1:4317
 *   ReboundOps API          http://127.0.0.1:4174 (reached only via the bridge)
 *
 *   node scripts/reboundops-smoke.mjs            # API journey
 *   node scripts/reboundops-smoke.mjs --browser  # + Chromium journey and screenshots
 *
 * The browser phase borrows Playwright from the sibling rebound-ops checkout
 * (REBOUNDOPS_DIR, default: the repository root) — the workspace does not ship it.
 * Uses fictional data only. Exits non-zero on the first failed check.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const UI = process.env.REBOUNDOPS_UI_URL || 'http://127.0.0.1:4317';
const B = UI + '/api/rebound';
let passed = 0;
async function check(name, fn) {
  try { await fn(); passed++; console.log('  ✔', name); }
  catch (err) { console.error('  ✖', name, '\n   ', err.message); process.exitCode = 1; throw err; }
}
const json = (method, path, body, headers = {}) => fetch(B + path, {
  method, headers: body ? { 'content-type': 'application/json', ...headers } : headers,
  body: body ? JSON.stringify(body) : undefined,
}).then(async (r) => ({ status: r.status, type: r.headers.get('content-type') || '', body: (r.headers.get('content-type') || '').includes('json') ? await r.json() : await r.text() }));

// Acceptance fixture: fictional Software Engineer, 4 h/week, urgency soon, one unverified achievement.
const intake = {
  role: 'Software Engineer', location: 'Remote (fictional)', weeklyHours: 4, urgency: 'soon',
  priorities: 'Goal: Find a similar role.', shiftTarget: 'Developer Experience Engineer', bridgeTarget: 'Contract CI/CD review',
  evidence: [{ id: crypto.randomUUID(), claim: 'Cut a fictional test suite from 30 to 12 minutes (demo data)', source: { kind: 'manual', label: 'Self-reported' }, status: 'unverified' }],
};

async function apiJourney() {
  console.log('API journey (via same-origin bridge)');
  let s;
  await check('bridge health reaches the real ReboundOps API with AI off', async () => {
    const r = await json('GET', '/health');
    assert.equal(r.status, 200, 'is the ReboundOps API running on 127.0.0.1:4174?');
    assert.equal(r.body.status, 'ok');
    assert.equal(r.body.aiEnabled, false);
  });
  await check('POST /sessions returns a real session with three routes and unverified evidence', async () => {
    const r = await json('POST', '/sessions', { intake });
    assert.equal(r.status, 201);
    s = r.body;
    assert.match(s.id, /^[0-9a-f-]{36}$/);
    assert.deepEqual(s.routes.map((x) => x.id), ['return', 'shift', 'bridge']);
    assert.equal(s.intake.evidence[0].status, 'unverified');
    assert.equal(s.plan, null);
  });
  await check('choosing a route returns the real plan within the 240-minute budget', async () => {
    const r = await json('PUT', `/sessions/${s.id}/route`, { expectedRevision: s.revision, routeId: 'return' });
    assert.equal(r.status, 200);
    s = r.body;
    assert.equal(s.plan.routeId, 'return');
    assert.equal(s.plan.budgetMinutes, 240);
    assert.ok(s.plan.plannedMinutes <= 240);
    assert.equal(s.plan.actions.reduce((n, a) => n + a.minutes, 0), s.plan.plannedMinutes);
  });
  await check('a stale revision is refused with 409 and the current session', async () => {
    const r = await json('PUT', `/sessions/${s.id}/route`, { expectedRevision: 0, routeId: 'bridge' });
    assert.equal(r.status, 409);
    assert.equal(r.body.error, 'STALE_REVISION');
    assert.equal(r.body.session.revision, s.revision);
  });
  await check('switching direction with the current revision replaces the plan', async () => {
    const r = await json('PUT', `/sessions/${s.id}/route`, { expectedRevision: s.revision, routeId: 'shift' });
    assert.equal(r.status, 200);
    s = r.body;
    assert.equal(s.plan.routeId, 'shift');
    assert.ok(s.plan.plannedMinutes <= 240);
  });
  await check('completing an action changes persisted backend state', async () => {
    const a = s.plan.actions[0];
    const r = await json('PUT', `/sessions/${s.id}/actions/${a.id}`, { expectedRevision: s.revision, completed: true });
    assert.equal(r.status, 200);
    const again = await json('GET', `/sessions/${s.id}`);
    assert.equal(again.body.plan.actions[0].completed, true);
    assert.equal(again.body.revision, s.revision + 1);
    s = again.body;
  });
  await check('export returns the real Markdown plan', async () => {
    const r = await json('GET', `/sessions/${s.id}/export`);
    assert.equal(r.status, 200);
    assert.match(r.type, /text\/markdown/);
    assert.match(r.body, /Software Engineer/);
  });
  await check('cross-site mutation is refused; unknown bridge paths are not proxied', async () => {
    const r = await json('POST', '/sessions', { intake }, { origin: 'https://evil.example' });
    assert.equal(r.status, 403);
    const d = await fetch(`${B}/sessions/${s.id}`, { method: 'DELETE' });
    assert.equal(d.status, 404);
  });
  await check('the ReboundOps API port still rejects foreign origins directly', async () => {
    const r = await fetch('http://127.0.0.1:4174/api/health', { headers: { origin: 'https://evil.example' } });
    assert.equal(r.status, 403);
  });
  await check('the shell serves the ReboundOps brand and recovery scripts', async () => {
    const html = await (await fetch(UI + '/')).text();
    assert.match(html, /<title>ReboundOps/);
    assert.match(html, /href="#\/recovery"/);
    assert.match(html, /js\/views\/recovery\.js/);
    assert.match(html, /css\/reboundops\.css/);
  });
  await check('reviewing an achievement records the person\'s own status through the bridge', async () => {
    const cur = (await json('GET', `/sessions/${s.id}`)).body;
    const ev = cur.intake.evidence[0];
    const r = await json('PUT', `/sessions/${s.id}/evidence/${ev.id}`, { expectedRevision: cur.revision, status: 'confirmed' });
    assert.equal(r.status, 200);
    assert.equal(r.body.intake.evidence[0].status, 'confirmed');
    s = r.body;
  });
  await check('editing answers replaces the intake and clears the plan (as the UI warns)', async () => {
    const r = await json('PUT', `/sessions/${s.id}/intake`, { expectedRevision: s.revision, intake: { ...intake, weeklyHours: 2 } });
    assert.equal(r.status, 200);
    assert.equal(r.body.intake.weeklyHours, 2);
    assert.equal(r.body.plan, null);
    assert.equal(r.body.intake.evidence[0].status, 'unverified');
  });
}

async function browserJourney() {
  console.log('Browser journey (Chromium) — synthetic personas');
  const rbDir = resolve(process.env.REBOUNDOPS_DIR || resolve(HERE, '..', '..'));
  const req = createRequire(resolve(rbDir, 'package.json'));
  const { chromium } = req('playwright');
  const { default: AxeBuilder } = await import(req.resolve('@axe-core/playwright'));
  const shots = resolve(HERE, '..', 'docs', 'reboundops-next', 'screenshots');
  mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  const fresh = async (opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    return { ctx, page };
  };
  const goalStep = async (page, goal) => {
    await page.goto(UI + '/');
    await page.waitForURL(/#\/start$/);
    await page.locator(`input[name="rj-goal"][value="${goal}"]`).check();
  };
  const essentials = async (page, role, hours) => {
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Your current or most recent role').fill(role);
    await page.locator('#rj-hours').fill(String(hours));
    await page.getByRole('button', { name: 'Continue' }).click();
  };
  const storedHandoff = (page) => page.evaluate(() => sessionStorage.getItem('reboundops:handoff') || '');
  try {
    // Persona A — laid-off software engineer, 4h/week, similar work, one achievement.
    const A = await fresh();
    const pa = A.page;
    await check('A: a first visit shows one question and five goals (no form fields yet)', async () => {
      await goalStep(pa, 'similar');
      assert.equal(await pa.locator('.rj-goal').count(), 5);
      assert.equal(await pa.locator('#rj-role').count(), 0, 'step 1 must not show the intake form');
      await pa.screenshot({ path: resolve(shots, '1-start.png') });
    });
    await check('A: essentials, optional step with Back/Skip, and review', async () => {
      await essentials(pa, 'Software Engineer', 4);
      assert.ok(await pa.getByRole('button', { name: 'Skip this step' }).isVisible());
      await pa.getByLabel('Something you are proud of from your work').fill('Cut a fictional test suite from 30 to 12 minutes (example)');
      await pa.getByRole('button', { name: 'Back' }).click();
      assert.equal(await pa.getByLabel('Your current or most recent role').inputValue(), 'Software Engineer', 'Back keeps answers');
      await pa.getByRole('button', { name: 'Continue' }).click();
      await pa.getByRole('button', { name: 'Continue' }).click();
      await pa.getByRole('heading', { name: 'Check your answers' }).waitFor();
    });
    await check('A: privacy — browser storage holds only a session reference while drafting and after', async () => {
      const during = await storedHandoff(pa);
      assert.ok(!/Software Engineer|test suite/i.test(during), `draft leaked: ${during}`);
      await pa.getByRole('button', { name: 'Create my plan' }).click();
      await pa.waitForURL(/#\/recovery$/);
      await pa.getByRole('heading', { name: 'Pick one direction to test this week' }).waitFor();
      const after = JSON.parse(await storedHandoff(pa));
      assert.deepEqual(Object.keys(after).sort(), ['goal', 'sessionId', 'suggestedRoute']);
      const local = await pa.evaluate(() => JSON.stringify(localStorage));
      assert.ok(!/Software Engineer|test suite/i.test(local), 'no intake text in localStorage');
    });
    await check('A: Recovery Home shows a decision, a snapshot, and no developer labels', async () => {
      const text = await pa.locator('#content').innerText();
      assert.doesNotMatch(text, /Internal name|revision|budget minutes|"soon"/i);
      assert.match(text, /Starting from\s*Software Engineer/);
      await pa.screenshot({ path: resolve(shots, '2-home.png'), fullPage: true });
    });
    await check('A: Direction Canvas — expand unknowns, choose explicitly, get the real plan', async () => {
      await pa.getByRole('link', { name: /Compare the three directions/ }).click();
      await pa.waitForURL(/#\/directions$/);
      await pa.locator('.rj-dir').nth(2).waitFor();
      assert.equal(await pa.locator('.rj-dir').count(), 3);
      await pa.locator('[data-route-id="return"] summary').click();
      assert.ok(await pa.locator('[data-route-id="return"] .rj-dir__more p').first().isVisible());
      await pa.screenshot({ path: resolve(shots, '3-directions.png'), fullPage: true });
      await pa.locator('[data-route-id="return"] button').click();
      await pa.waitForURL(/#\/recovery$/);
      await pa.locator('#rj-next-h').waitFor();
      assert.equal(await pa.locator('#rj-next-h').innerText(), 'Identify three achievements and verify their sources');
      assert.match(await pa.locator('.rj-budget').innerText(), /About 3h 20m planned within your 4h a week/);
    });
    await check('A: marking the next step done updates the API and advances the next step', async () => {
      await pa.getByTestId('rj-mark-done').click();
      await pa.getByText('1 of 5 steps done').first().waitFor();
      const id = JSON.parse(await storedHandoff(pa)).sessionId;
      const sess = await (await fetch(`${B}/sessions/${id}`)).json();
      assert.equal(sess.plan.actions[0].completed, true);
      assert.equal(await pa.locator('#rj-next-h').innerText(), 'Compare two supplied role descriptions to confirmed evidence');
      await pa.screenshot({ path: resolve(shots, '4-next-step.png'), fullPage: true });
    });
    await check('A: reload resumes the plan from the API (nothing personal from storage)', async () => {
      await pa.reload();
      await pa.locator('#rj-next-h').waitFor();
      assert.match(await pa.locator('.rj-progress').innerText(), /1 of 5 steps done/);
      await pa.goto(UI + '/');
      await pa.waitForURL(/#\/recovery$/);
    });
    await check('A: switching direction warns that 1 completed step will not carry over', async () => {
      await pa.goto(UI + '/#/directions');
      await pa.locator('[data-route-id="shift"] button').click();
      const dlg = pa.locator('dialog.rj-dialog');
      await dlg.waitFor();
      assert.match(await dlg.innerText(), /1 completed step will not carry over/);
      await dlg.getByRole('button', { name: 'Keep my current plan' }).click();
      assert.equal(await pa.locator('.rj-dir.is-current').getAttribute('data-route-id'), 'return');
    });
    await check('A: consent handoff shows the exact search text and opens Vacancy search with it', async () => {
      await pa.goto(UI + '/#/opportunities');
      assert.equal(await pa.locator('#rj-q').inputValue(), 'Software Engineer');
      assert.match(await pa.locator('.rj-consent').innerText(), /not copied into the job-search files/);
      await pa.screenshot({ path: resolve(shots, '5-handoff.png'), fullPage: true });
      await pa.getByTestId('rj-handoff-continue').click();
      await pa.waitForURL(/#\/scan\?q=Software%20Engineer$/);
      await pa.locator('#rb-strip:not([hidden])').waitFor();
      assert.match(await pa.locator('#rb-strip').innerText(), /My next step/);
      assert.equal(await pa.locator('#scan-filter-text').inputValue(), 'Software Engineer');
      await pa.screenshot({ path: resolve(shots, '6-workspace-scan.png') });
    });
    await check('A: evidence review is the person\'s own status, labelled as such', async () => {
      await pa.goto(UI + '/#/evidence');
      await pa.getByRole('button', { name: 'I have reviewed this' }).click();
      await pa.getByText('Reviewed by you').waitFor();
      assert.match(await pa.locator('#content').innerText(), /not external verification/);
    });
    await check('A: existing job-search tools stay reachable (tools collapsed, deep links work)', async () => {
      for (const route of ['dashboard', 'tracker', 'scan', 'evaluate', 'config']) {
        await pa.goto(`${UI}/#/${route}`);
        await pa.locator('#content h1, #content .page-title').first().waitFor();
        assert.equal(await pa.locator('.page-404').count(), 0, `#/${route} 404`);
      }
      await pa.goto(UI + '/#/recovery');
      assert.equal(await pa.locator('#rj-tools-toggle').getAttribute('aria-expanded'), 'true', 'tools open after visiting a tool');
    });
    await A.ctx.close();

    // Persona C — needs short-term income, 2h/week, skips optional fields.
    const C = await fresh();
    await check('C: bridge goal with 2h/week, optional step skipped, plan stays within budget', async () => {
      const pc = C.page;
      await goalStep(pc, 'income');
      await essentials(pc, 'Operations Analyst', 2);
      await pc.getByRole('button', { name: 'Skip this step' }).click();
      await pc.getByRole('button', { name: 'Create my plan' }).click();
      await pc.waitForURL(/#\/recovery$/);
      await pc.goto(UI + '/#/directions');
      assert.match(await pc.locator('[data-route-id="bridge"]').innerText(), /Matches your goal/);
      assert.match(await pc.locator('[data-route-id="bridge"]').innerText(), /not set — add one in your answers/);
      await pc.locator('[data-route-id="bridge"] button').click();
      await pc.locator('.rj-budget').waitFor();
      const budget = await pc.locator('.rj-budget').innerText();
      assert.match(budget, /within your 2h a week/);
      assert.doesNotMatch(await pc.locator('#content').innerText(), /income of|guaranteed|you will earn/i);
    });
    await C.ctx.close();

    // Persona D — knows the target role: no surprise redirect.
    const D = await fresh();
    await check('D: "I know my target role" asks how to continue instead of redirecting', async () => {
      const pd = D.page;
      await goalStep(pd, 'known');
      await pd.waitForTimeout(300);
      assert.match(pd.url(), /#\/start$/, 'no redirect on selection');
      await pd.getByRole('button', { name: 'Go straight to job search' }).waitFor();
      await pd.getByRole('button', { name: 'Plan around my target' }).click();
      await pd.getByLabel('Your current or most recent role').waitFor();
    });
    await D.ctx.close();

    // Offline recovery service (bridge answers 503) — understandable, no fake plan.
    const O = await fresh();
    await check('offline: the recovery screens explain the problem and offer a way on', async () => {
      const po = O.page;
      await po.route('**/api/rebound/**', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'RECOVERY_SERVICE_OFFLINE' }) }));
      await goalStep(po, 'similar');
      await essentials(po, 'Software Engineer', 4);
      await po.getByRole('button', { name: 'Skip this step' }).click();
      await po.getByRole('button', { name: 'Create my plan' }).click();
      await po.getByText(/recovery service is not running/).waitFor();
      assert.match(po.url(), /#\/start$/);
    });
    await O.ctx.close();

    // Responsive + accessibility on journey screens, light and dark.
    for (const scheme of ['light', 'dark']) {
      const R = await fresh({ colorScheme: scheme });
      const pr = R.page;
      await pr.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, scheme);
      await goalStep(pr, 'unsure');
      await essentials(pr, 'Product Designer', 3);
      await pr.getByRole('button', { name: 'Skip this step' }).click();
      await pr.getByRole('button', { name: 'Create my plan' }).click();
      await pr.waitForURL(/#\/recovery$/);
      await pr.goto(UI + '/#/directions');
      await pr.locator('[data-route-id="shift"] button').click();
      await pr.locator('#rj-next-h').waitFor();
      await check(`${scheme}: no horizontal overflow at 320/390/768/1440 on journey screens`, async () => {
        const bad = [];
        for (const w of [320, 390, 768, 1440]) {
          await pr.setViewportSize({ width: w, height: 900 });
          for (const route of ['start', 'recovery', 'directions', 'opportunities', 'evidence']) {
            await pr.goto(`${UI}/#/${route}`); await pr.waitForTimeout(400);
            if (await pr.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) bad.push(`${w}/${route}`);
          }
        }
        assert.deepEqual(bad, []);
      });
      await check(`${scheme}: axe finds no serious or critical issues on journey screens`, async () => {
        await pr.setViewportSize({ width: 1280, height: 900 });
        const found = [];
        for (const route of ['start', 'recovery', 'directions', 'opportunities', 'evidence']) {
          await pr.goto(`${UI}/#/${route}`); await pr.waitForTimeout(600);
          const res = await new AxeBuilder({ page: pr }).include('#content').analyze();
          for (const v of res.violations.filter((x) => ['serious', 'critical'].includes(x.impact))) found.push(`${route}: ${v.id} (${v.nodes.length})`);
        }
        assert.deepEqual(found, []);
      });
      if (scheme === 'dark') {
        await pr.setViewportSize({ width: 390, height: 844 });
        await pr.goto(UI + '/#/recovery'); await pr.waitForTimeout(500);
        await pr.screenshot({ path: resolve(shots, '7-mobile-dark.png'), fullPage: true });
      }
      await R.ctx.close();
    }
    await check('no uncaught page errors', async () => { assert.deepEqual(errors, []); });
  } finally {
    await browser.close();
  }
  console.log('  screenshots →', shots);
}

try {
  await apiJourney();
  if (process.argv.includes('--browser')) await browserJourney();
  console.log(`\n${passed} checks passed`);
} catch {
  console.error(`\nFAILED after ${passed} passing checks`);
  process.exitCode = 1;
}

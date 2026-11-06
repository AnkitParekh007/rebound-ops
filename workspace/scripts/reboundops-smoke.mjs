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
}

async function browserJourney() {
  console.log('Browser journey (Chromium)');
  const rbDir = resolve(process.env.REBOUNDOPS_DIR || resolve(HERE, '..', '..'));
  const { chromium } = createRequire(resolve(rbDir, 'package.json'))('playwright');
  const shots = resolve(HERE, '..', 'docs', 'reboundops-next', 'screenshots');
  mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await check('a first visit lands on #/start with goal choices', async () => {
      await page.goto(UI + '/');
      await page.waitForURL(/#\/start$/);
      await page.getByRole('heading', { name: 'What are you trying to achieve?' }).waitFor();
      assert.equal(await page.locator('.rb-goal input').count(), 5);
      await page.screenshot({ path: resolve(shots, '1-start.png') });
    });
    await check('fictional demo creates a real session and shows three routes', async () => {
      await page.getByRole('button', { name: 'Use fictional demo' }).click();
      await page.getByRole('button', { name: 'Create my recovery session' }).click();
      await page.waitForURL(/#\/recovery$/);
      await page.locator('.rb-route').nth(2).waitFor();
      assert.equal(await page.locator('.rb-route').count(), 3);
      await page.screenshot({ path: resolve(shots, '2-directions.png'), fullPage: true });
    });
    await check('choosing a direction renders the real plan', async () => {
      await page.locator('[data-route-id="return"] button').click();
      await page.getByRole('heading', { name: /Your seven-day plan — Similar work to before/ }).waitFor();
      assert.match(await page.locator('.rb-meta').innerText(), /Planned 200 of 240 min/);
    });
    await check('ticking an action persists to the backend', async () => {
      await page.locator('[data-action-id="return-1"]').check();
      await page.getByText('1 of 5 done').waitFor();
      const id = await page.evaluate(() => window.ReboundState.get().sessionId);
      const s = await (await fetch(`${B}/sessions/${id}`)).json();
      assert.equal(s.plan.actions[0].completed, true);
      await page.locator('#rb-plan-h').scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(shots, '3-plan.png'), fullPage: true });
    });
    await check('Continue opens the native ReboundOps dashboard with the context strip', async () => {
      await page.getByRole('link', { name: 'Continue to job-search workspace' }).click();
      await page.waitForURL(/#\/dashboard$/);
      await page.locator('#rb-strip:not([hidden])').waitFor();
      const strip = await page.locator('#rb-strip').innerText();
      assert.match(strip, /Similar work to before/);
      assert.match(strip, /Day 2:/);
      await page.waitForTimeout(600);
      await page.screenshot({ path: resolve(shots, '4-workspace.png') });
    });
    await check('existing ReboundOps views stay reachable (tracker, scan, evaluate)', async () => {
      for (const route of ['tracker', 'scan', 'evaluate']) {
        await page.goto(`${UI}/#/${route}`);
        await page.locator('#content h1, #content .page-title').first().waitFor();
        assert.equal(await page.locator('.page-404').count(), 0, `#/${route} rendered a 404`);
      }
    });
    await check('dark theme keeps the ReboundOps orange accent', async () => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await page.goto(UI + '/#/recovery');
      await page.locator('.rb-route').first().waitFor();
      const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--cv3-accent').trim());
      assert.equal(accent.toUpperCase(), '#F26A2E');
      await page.waitForTimeout(500);
      await page.screenshot({ path: resolve(shots, '5-recovery-dark.png') });
    });
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

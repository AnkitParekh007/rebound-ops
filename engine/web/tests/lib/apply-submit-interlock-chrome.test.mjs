// The submit interlock (AA-01) in a real browser: a page's own script cannot
// file the form while ReboundOps holds it, and the person's Submit works after
// the release. Needs Google Chrome (as the browser suites do); skips without it.
// The page is fictional and served by a route handler: no network is used.
import test from "node:test";
import assert from "node:assert/strict";
import { installSubmitInterlock, setSubmitHold, blockedSubmits } from "../../src/lib/apply/submit-interlock.mjs";

const ORIGIN = "http://interlock.fixture.test";
const PAGE = `<!doctype html><title>Fixture application</title>
<form id="f" action="${ORIGIN}/sent" method="post">
  <input name="email" value="fixture@example.invalid">
  <button type="button" id="sneaky" onclick="document.getElementById('f').requestSubmit()">Continue</button>
  <button type="button" id="native" onclick="document.getElementById('f').submit()">Next step</button>
  <button type="submit" id="real">Submit application</button>
</form>
<script>window.heard = 0; document.getElementById('f').addEventListener('submit', () => { window.heard += 1; });</script>`;

let chromium = null;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  chromium = null;
}

test("a page script cannot submit while held, and the person can after the release", { timeout: 60_000 }, async (t) => {
  if (!chromium) return t.skip("playwright-core is not installed");
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return t.skip("Google Chrome is not available");
  }
  t.after(() => browser.close());
  const context = await browser.newContext();
  const sent = [];
  await context.route(`${ORIGIN}/**`, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/sent") {
      sent.push(route.request().method());
      return route.fulfill({ contentType: "text/html", body: "<title>Sent</title>sent" });
    }
    return route.fulfill({ contentType: "text/html", body: PAGE });
  });
  await installSubmitInterlock(context);
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/apply`);

  // Held: a scripted requestSubmit, a native submit() and even the real submit
  // button send nothing, and the page's own submit listener never hears them.
  await page.click("#sneaky");
  await page.click("#native");
  await page.click("#real");
  await page.press("input[name=email]", "Enter");
  await page.waitForTimeout(300);
  assert.deepEqual(sent, []);
  assert.equal(await page.evaluate(() => window.heard), 0);
  assert.equal(new URL(page.url()).pathname, "/apply");
  assert.equal(await blockedSubmits(context), 4);

  // Released (the hand-off): the person's Submit sends the form.
  await setSubmitHold(context, false);
  await Promise.all([page.waitForURL(`${ORIGIN}/sent`), page.click("#real")]);
  assert.deepEqual(sent, ["POST"]);

  // A page loaded after the release starts released too.
  await page.goto(`${ORIGIN}/apply-again`);
  await Promise.all([page.waitForURL(`${ORIGIN}/sent`), page.click("#native")]);
  assert.deepEqual(sent, ["POST", "POST"]);

  // Held again (a new fill): blocked again, on the newly loaded page.
  await page.goto(`${ORIGIN}/apply-third`);
  await setSubmitHold(context, true);
  await page.click("#sneaky");
  await page.waitForTimeout(300);
  assert.deepEqual(sent, ["POST", "POST"]);
});

// Optional browser regression: use the disposable fixture created by
// node tests/fixtures/eligibility-panel.mjs as REBOUND_OPS_ROOT for a local
// server started with REBOUNDOPS_FEATURES=eligibilityScreening (the browser
// suite runner does both). Set ELIGIBILITY_PANEL_TEST_URL and
// ELIGIBILITY_PANEL_TEST_ROOT to run this suite.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { liveServerSkip } from "../helpers/live-server.mjs";

const url = process.env.ELIGIBILITY_PANEL_TEST_URL;
const root = process.env.ELIGIBILITY_PANEL_TEST_ROOT;

test("A report shows the eligibility screen of its archived posting", { skip: liveServerSkip("ELIGIBILITY_PANEL_TEST_URL", "ELIGIBILITY_PANEL_TEST_ROOT"), timeout: 120_000 }, async (t) => {
  const origin = new URL(url);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname));
  const relative = path.relative(os.tmpdir(), fs.realpathSync(root));
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  assert.equal(fs.readFileSync(path.join(root, ".inline-status-fixture"), "utf8").trim(), "fictional-only");
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const panel = () => page.getByRole("region", { name: "Eligibility" });

  // Archived in the report: Germany is authorized, so the refusal to sponsor
  // does not count against the person; the language is theirs to check.
  await page.goto(`${origin.origin}/pipeline/21`);
  await panel().waitFor({ timeout: 15_000 });
  await panel().getByText("Needs review", { exact: true }).waitFor();
  for (const quote of ["You must be authorized to work in Germany.", "We are unable to sponsor visas.", "Fluent German is required."]) {
    assert.ok(await panel().getByText(`“${quote}”`).isVisible(), `quotes: ${quote}`);
  }
  assert.ok(await panel().getByText("Work authorization", { exact: true }).isVisible());
  assert.ok(await panel().getByText("Years of experience", { exact: true }).isVisible(), "years are screened in the web view too");
  assert.ok((await panel().getByText("Check yourself", { exact: true }).count()) >= 1, "language is left to the person");
  assert.ok((await panel().getByText(/From your profile: location\.authorized_in/).count()) >= 1, "names the profile keys it used");

  // Pointer to a jds/ capture: the UK is not in authorized_in and the profile
  // needs sponsorship, so the screen says the profile does not meet it.
  await page.goto(`${origin.origin}/pipeline/22`);
  await panel().waitFor({ timeout: 15_000 });
  await panel().getByText("Blocked", { exact: true }).waitFor();
  assert.ok(await panel().getByText("“Candidates must have the right to work in the UK.”").isVisible());
  assert.ok(await panel().getByText("Does not meet", { exact: true }).isVisible());
  assert.ok(await panel().getByText(/its jds\/ capture/).isVisible());

  // No archived posting: said plainly, nothing screened.
  await page.goto(`${origin.origin}/pipeline/23`);
  await panel().waitFor({ timeout: 15_000 });
  assert.ok(await panel().getByText(/no archived posting text to screen/).isVisible());
  assert.equal(await panel().getByRole("listitem").count(), 0);

  assert.deepEqual(errors, []);
});

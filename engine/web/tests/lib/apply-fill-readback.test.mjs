/**
 * apply-fill-readback.test.mjs: the per-field FillResult readback
 * (fill-readback.mjs) and its wiring. Fictional data only.
 *
 * Also run by the root `npm test` (roadmap gap C1).
 *
 * The last test drives a real headless browser over a local fixture form (no
 * ATS, no CLI); it runs with APPLY_READBACK_BROWSER_TEST=1.
 *
 * Run (from web/):  node --test tests/lib/apply-fill-readback.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareAll, compareFill, readbackIssues, readbackSummary, readbackText } from "../../src/lib/apply/fill-readback.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const text = (value) => ({ kind: "text", value });
const choice = (t, value = t) => ({ kind: "choice", text: t, value });

test("text answers: whitespace and case aside, a reformatted phone, a cut answer, a different one", () => {
  const f = { id: "a", type: "text", label: "Preferred name" };
  assert.equal(compareFill(f, "Jay  Doe", text(" jay doe ")).status, "filled");
  assert.deepEqual(compareFill(f, "Jay", text("")), { fieldId: "a", label: "Preferred name", required: false, intended: "Jay", status: "empty" });
  assert.deepEqual([compareFill(f, "Jay", text("Jayne")).status, compareFill(f, "Jay", text("Jayne")).actual], ["different", "Jayne"]);
  const tel = compareFill({ id: "t", type: "tel", label: "Phone" }, "+1 555 010 0000", text("(155) 501-00000"));
  assert.deepEqual([tel.status, tel.reason], ["filled", "reformatted"]);
  const cut = compareFill({ id: "c", type: "textarea", label: "Why us?", maxLength: 5 }, "Because of the mission", text("Becau"));
  assert.deepEqual([cut.status, cut.reason], ["different", "truncated"]);
  assert.equal(compareFill(f, "x".repeat(500), text("y")).intended.length, 201, "long values are clipped in the result");
});

test("choices: select by label or value, radio by option, combobox by the same rule the fill clicks with", () => {
  const sel = { id: "s", type: "select", label: "Country" };
  assert.equal(compareFill(sel, "Germany", choice("Germany", "DE")).status, "filled");
  assert.equal(compareFill(sel, "de", choice("Germany", "DE")).status, "filled");
  assert.equal(compareFill(sel, "Germany", choice("Select…", "")).status, "different", "a placeholder option with text is not the answer");
  assert.equal(compareFill(sel, "Germany", choice("", "")).status, "empty");
  assert.equal(compareFill({ id: "r", type: "radio", label: "Relocate?" }, "No", choice("Yes")).status, "different");
  const combo = { id: "k", type: "text", combobox: true, label: "Pronouns" };
  assert.equal(compareFill(combo, "she", choice("She/her")).status, "filled");
  assert.equal(compareFill(combo, "Male", choice("Female")).status, "different", "a substring is not a match");
  assert.equal(compareFill(combo, "she", { kind: "unread" }).status, "unread");
});

test("checkboxes, files, held consent boxes, missing controls and unanswered fields", () => {
  const box = { id: "b", type: "checkbox", label: "Subscribe" };
  assert.equal(compareFill(box, "true", { kind: "checked", value: true }).status, "filled");
  assert.equal(compareFill(box, "false", { kind: "checked", value: false }).status, "filled");
  assert.equal(compareFill(box, "yes", { kind: "checked", value: false }).status, "empty");
  assert.equal(compareFill(box, "no", { kind: "checked", value: true }).status, "different");
  assert.equal(compareFill(box, "true", { kind: "checked", value: false }, { held: true }).status, "held");
  const cv = { id: "cv", type: "file", label: "Resume", required: true };
  assert.deepEqual([compareFill(cv, "file", { kind: "files", count: 1 }).status, compareFill(cv, "file", { kind: "files", count: 1 }).intended], ["filled", "file attached"]);
  assert.equal(compareFill(cv, "file", { kind: "files", count: 0 }).status, "empty");
  assert.equal(compareFill(cv, "", { kind: "files", count: 0 }).status, "not_filled");
  assert.equal(compareFill(box, "true", undefined).status, "missing");
  assert.equal(compareFill(box, "true", { kind: "missing" }).status, "missing");
  assert.deepEqual(compareFill({ id: "n", type: "text", label: "Nickname" }, "", text("Prefilled")), { fieldId: "n", label: "Nickname", required: false, intended: "", status: "not_filled", actual: "Prefilled" });
});

test("compareAll: file intent comes from what was attached, held ids from the fill", () => {
  const fields = [{ id: "cv", type: "file", label: "Resume" }, { id: "cover", type: "file", label: "Cover letter" }, { id: "ok", type: "checkbox", label: "I agree" }];
  const results = compareAll(fields, { cv: "ignored", ok: "true" }, { cv: { kind: "files", count: 0 }, cover: { kind: "files", count: 0 }, ok: { kind: "checked", value: false } }, { attached: ["cv"], held: ["ok"] });
  assert.deepEqual(results.map((x) => x.status), ["empty", "not_filled", "held"]);
});

test("issues: without the flag, the warnings the fill always gave; with it, differences too", () => {
  const fields = [
    { id: "a", type: "text", label: "Name", required: true },
    { id: "b", type: "text", label: "City" },
    { id: "c", type: "text", label: "Website", required: true },
    { id: "cv", type: "file", label: "Resume", required: true },
    { id: "ok", type: "checkbox", label: "I agree", required: true },
    { id: "k", type: "text", combobox: true, label: "Source", required: true },
  ];
  const observed = { a: text(""), b: text("Berlinn"), c: text(""), cv: { kind: "files", count: 0 }, ok: { kind: "checked", value: false }, k: { kind: "unread" } };
  const results = compareAll(fields, { a: "Jay", b: "Berlin" }, observed, { attached: ["cv"], held: ["ok"] });
  assert.deepEqual(readbackIssues(results).map((i) => [i.code, i.message]), [
    ["fill-mismatch", "These answers didn't seem to land on the real form — check them: Name."],
    ["required-empty", "Required and still empty — you'll need to fill these: Website, Resume, I agree."],
  ], "an unreadable dropdown is never flagged");
  assert.deepEqual(readbackIssues(results, { differences: true }).map((i) => i.code), ["fill-mismatch", "fill-different", "required-empty"]);
});

test("the review screen text and summary", () => {
  const fields = [{ id: "a", type: "text", label: "Name" }, { id: "b", type: "text", label: "City" }, { id: "c", type: "text", label: "Website" }];
  const results = compareAll(fields, { a: "Jay", b: "Berlin" }, { a: text("Jay"), b: text("Bern"), c: text("") });
  assert.deepEqual(readbackSummary(results), { answered: 2, landed: 1, look: [results[1]] });
  assert.equal(readbackText(results[0]), "On the form as you reviewed it.");
  assert.equal(readbackText(results[1]), "The form shows “Bern”, not your answer “Berlin”.");
  assert.equal(readbackText(results[2]), "No answer given.");
  for (const status of ["filled", "different", "empty", "held", "missing", "unread", "not_filled"]) {
    assert.equal(typeof readbackText({ fieldId: "x", label: "X", required: false, intended: "", status }), "string");
  }
});

test("wiring: results only with the autofill flag, readback route checks it, the reader only reads", () => {
  const fill = readFileSync(join(here, "../../src/app/api/apply/fill/route.ts"), "utf8");
  assert.match(fill, /const readback = autofillEnabled\(process\.env\);/);
  assert.match(fill, /\.\.\.\(readback \? \{ results \} : \{\}\)/);
  const route = readFileSync(join(here, "../../src/app/api/apply/readback/route.ts"), "utf8");
  assert.match(route, /if \(!autofillEnabled\(process\.env\)\) return Response\.json\(\{ error: "not found" \}, \{ status: 404 \}\);/);
  const src = readFileSync(join(here, "../../src/lib/apply/fill-readback.mjs"), "utf8");
  const reader = src.slice(src.indexOf("export function readControls"), src.indexOf("/** @param {unknown} s */"));
  assert.doesNotMatch(reader, /\.(click|focus|fill|dispatchEvent|submit|setAttribute)\(|\.(value|checked)\s*=[^=]/, "readControls never changes the page");
});

// Opt-in browser proof: a local fixture document only; no ATS, no CLI.
test("fill then read back on a real page", { skip: !process.env.APPLY_READBACK_BROWSER_TEST, timeout: 60_000 }, async (t) => {
  const { register } = await import("node:module");
  const { pathToFileURL } = await import("node:url");
  const src = join(here, "../../src");
  register(`data:text/javascript,${encodeURIComponent(`
    import { existsSync } from 'node:fs';
    import { pathToFileURL, fileURLToPath } from 'node:url';
    import path from 'node:path';
    export async function resolve(specifier, context, nextResolve) {
      const base = specifier.startsWith('@/')
        ? path.join(${JSON.stringify(src)}, specifier.slice(2))
        : specifier.startsWith('.') ? fileURLToPath(new URL(specifier, context.parentURL)) : null;
      if (base) {
        for (const ext of ['', '.ts', '.mjs', '.js']) {
          if (existsSync(base + ext)) return { url: pathToFileURL(base + ext).href, shortCircuit: true };
        }
      }
      return nextResolve(specifier, context);
    }
  `)}`, pathToFileURL(src + "/"));
  const { chromium } = await import("playwright-core");
  const { extractForm } = await import("../../src/lib/apply/extract.ts");
  const { fillSession } = await import("../../src/lib/apply/session.ts");
  // Google Chrome, as the other browser suites use (tests/browser-suites.mjs).
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(2000);
  await page.setContent(`<form>
    <label for="name">Full name</label><input id="name" required>
    <label for="bio">Short bio</label><textarea id="bio" maxlength="10"></textarea>
    <label for="country">Country</label><select id="country"><option value="">Select…</option><option value="DE">Germany</option><option value="FR">France</option></select>
    <fieldset><legend>Willing to relocate?</legend><label><input type="radio" name="rel" value="yes">Yes</label><label><input type="radio" name="rel" value="no">No</label></fieldset>
    <label><input type="checkbox" id="news">Send me news</label>
    <label><input type="checkbox" id="ok" required>I agree to the privacy policy</label>
    <label for="city">City</label><input id="city">
  </form>
  <script>document.getElementById("city").addEventListener("input", (e) => { if (!e.target.value.endsWith("!")) e.target.value = e.target.value.toUpperCase() + "!"; });</script>`);
  const form = await extractForm(page.mainFrame());
  const byLabel = (re) => form.fields.find((f) => re.test(f.label));
  const ids = { name: byLabel(/full name/i), bio: byLabel(/bio/i), country: byLabel(/country/i), rel: byLabel(/relocate/i), news: byLabel(/news/i), ok: byLabel(/privacy/i), city: byLabel(/city/i) };
  for (const [k, f] of Object.entries(ids)) assert.ok(f, `fixture field ${k} extracted`);
  const answers = { [ids.name.id]: "Jay Doe", [ids.bio.id]: "A fictional bio that is long", [ids.country.id]: "Germany", [ids.rel.id]: "No", [ids.news.id]: "true", [ids.ok.id]: "true", [ids.city.id]: "Berlin" };

  const id = `fixture-${crypto.randomUUID()}`;
  globalThis.__coApplySessions.set(id, { id, frame: page.mainFrame(), page });
  t.after(() => globalThis.__coApplySessions.delete(id));
  const { results, issues } = await fillSession(id, answers, form.fields, undefined, { differences: true });
  const status = Object.fromEntries(results.map((x) => [x.fieldId, [x.status, x.reason ?? null]]));
  assert.deepEqual(status[ids.name.id], ["filled", null]);
  assert.deepEqual(status[ids.bio.id], ["different", "truncated"], "the form's maxlength cut the answer");
  assert.deepEqual(status[ids.country.id], ["filled", null]);
  assert.deepEqual(status[ids.rel.id], ["filled", null]);
  assert.deepEqual(status[ids.news.id], ["filled", null]);
  assert.deepEqual(status[ids.ok.id], ["held", null], "the consent box is never ticked, and is reported as left for you");
  assert.deepEqual(status[ids.city.id], ["different", null], "the page rewrote the value after the fill");
  assert.equal(await page.locator("#ok").isChecked(), false);
  assert.deepEqual(issues.map((i) => i.code), ["fill-different", "required-empty"]);
});

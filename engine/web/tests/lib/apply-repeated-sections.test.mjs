// Repeated employment and education entries (R1 Autofill): each entry's fields
// get an id that names the entry, the review screen and every warning say which
// entry a question belongs to, and nothing reusable (profile facts, saved
// answers) is copied into an entry.
//
// The pure half runs everywhere. The opt-in browser half extracts a local
// fixture form in Google Chrome (no ATS, no CLI); it runs with
// APPLY_SECTIONS_BROWSER_TEST=1. Detection is behind the `autofill` flag; the
// other modules act only on a field's `section`, so without the flag nothing changes.

import test from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applySections, fieldDisplayLabel, inRepeatedSection, sectionLabel, startsEntry } from "../../src/lib/apply/repeated-sections.mjs";
import { enforceAnswerPolicy } from "../../src/lib/apply/answer-policy.mjs";
import { profileFacts } from "../../src/lib/apply/profile-facts.mjs";
import { cannotSave, findApproved, questionKey } from "../../src/lib/apply/approved-answer-match.mjs";
import { buildAnswerPrompt } from "../../src/lib/apply/answer-prompt.mjs";
import { buildNarrativePrompt } from "../../src/lib/apply/narrative-draft.mjs";
import { compareFill } from "../../src/lib/apply/fill-readback.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const job1 = { group: "employment", kind: "employment", index: 1, count: 2 };
const job2 = { group: "employment", kind: "employment", index: 2, count: 2 };

test("labels: the entry is named, and a heading only where an entry starts", () => {
  assert.equal(sectionLabel(job2), "Employment 2 of 2");
  assert.equal(sectionLabel({ group: "education", kind: "education", index: 1, count: 3 }), "Education 1 of 3");
  assert.equal(sectionLabel({ group: "entry", kind: "entry", index: 1, count: 2, heading: "Languages" }), "Languages 1 of 2");
  assert.equal(sectionLabel({ group: "entry", kind: "entry", index: 1, count: 2 }), "Entry 1 of 2");
  assert.equal(sectionLabel(undefined), "");
  assert.equal(fieldDisplayLabel({ id: "a", label: "Company", section: job1 }), "Company (Employment 1 of 2)");
  assert.equal(fieldDisplayLabel({ id: "a", label: "Email" }), "Email");
  assert.equal(fieldDisplayLabel({ id: "a", label: "" }), "this field");
  assert.equal(inRepeatedSection({ id: "a", section: job1 }), true);
  assert.equal(inRepeatedSection({ id: "a" }), false);

  const fields = [{ id: "e" }, { id: "a", section: job1 }, { id: "b", section: job1 }, { id: "c", section: job2 }, { id: "d" }];
  assert.deepEqual(fields.map((f, i) => startsEntry(fields[i - 1], f)), [false, true, false, true, false]);
});

test("applySections: new ids and entries for fields inside one, the rest untouched", () => {
  const fields = [{ id: "co0", label: "Email" }, { id: "co1", label: "Company" }];
  const out = applySections(fields, { co1: { id: "employment-1-company", section: job1 } });
  assert.deepEqual(out, [{ id: "co0", label: "Email" }, { id: "employment-1-company", label: "Company", section: job1 }]);
  assert.equal(applySections(fields, null), fields, "a failed detection keeps the positional ids");
  assert.deepEqual(applySections(fields, { toString: { id: "x", section: job1 } }), fields, "only own keys count");
});

test("policy: no profile fact or saved answer is copied into an entry", () => {
  const facts = profileFacts({ candidate: { location: "Berlin" } });
  const city = { id: "co3", type: "text", label: "City" };
  const entryCity = { id: "employment-1-city", type: "text", label: "City", section: job1 };
  const company = { id: "employment-1-company", type: "text", label: "Company", section: job1 };
  const saved = [{ id: "s1", question: "Company", key: questionKey("Company"), kind: "text", value: "Same Co", company: null, savedAt: "2026-11-01T00:00:00Z" }];
  const planner = { "employment-1-city": { value: "Munich", needs_confirmation: false }, "employment-1-company": { value: "Example GmbH", needs_confirmation: false } };
  const { answers } = enforceAnswerPolicy([city, entryCity, company], planner, { facts, approved: (f) => findApproved(saved, f, null) });
  assert.equal(answers.co3.source, "profile_fact", "the form's own City question still comes from the profile");
  assert.equal(answers.co3.value, "Berlin");
  assert.equal(answers["employment-1-city"].source, "model_draft");
  assert.equal(answers["employment-1-city"].value, "Munich");
  assert.equal(answers["employment-1-company"].source, "model_draft");
  assert.equal(answers["employment-1-company"].value, "Example GmbH");

  assert.match(cannotSave(company) ?? "", /one entry of a repeated section/);
  assert.equal(findApproved(saved, company, null), null);
  assert.equal(cannotSave({ type: "text", label: "Company" }), null, "the same question outside an entry can still be saved");
});

test("prompts: entries are labelled, with the ordering rule only when the form has them", () => {
  const fields = [
    { id: "co0", type: "email", label: "Email" },
    { id: "employment-1-company", type: "text", label: "Company", section: job1 },
    { id: "employment-2-company", type: "text", label: "Company", section: job2 },
  ];
  const prompt = buildAnswerPrompt({ title: "Acme", fields });
  assert.ok(prompt.includes("employment-1-company\ttext\tCompany (Employment 1 of 2)"));
  assert.ok(prompt.includes("employment-2-company\ttext\tCompany (Employment 2 of 2)"));
  assert.match(prompt, /entry 1 is the most recent job or school/);
  assert.doesNotMatch(buildAnswerPrompt({ title: "Acme", fields: fields.slice(0, 1) }), /repeated entries/);

  const role = { id: "employment-2-what-did-you-do", type: "textarea", label: "What did you do?", section: job2 };
  const { system, user } = buildNarrativePrompt({ title: "Acme", fields: [role], cvText: "Fictional CV" });
  assert.match(user, /question: What did you do\?\n {2}entry: Employment 2 of 2/);
  assert.match(system, /entry 1 is the most recent job or school/);
  assert.doesNotMatch(buildNarrativePrompt({ title: "Acme", fields: [{ ...role, section: undefined }], cvText: "Fictional CV" }).system, /repeated section/);
});

test("readback: a warning names the entry", () => {
  const r = compareFill({ id: "employment-2-company", type: "text", label: "Company", section: job2 }, "Example GmbH", { kind: "text", value: "" });
  assert.equal(r.status, "empty");
  assert.equal(r.label, "Company (Employment 2 of 2)");
});

const FORM = (jobs, { extraBefore = false } = {}) => `<form>
  ${extraBefore ? '<label for="pre">Preferred name</label><input id="pre">' : ""}
  <label for="email">Email</label><input id="email" type="email">
  <label for="phone">Phone</label><input id="phone" type="tel">
  <h2>Work experience</h2>
  <div class="jobs">
    ${jobs
      .map(
        (n) => `<div class="job">
      <label for="c${n}">Company</label><input id="c${n}">
      <label for="t${n}">Job title</label><input id="t${n}">
      <label for="d${n}">What did you do?</label><textarea id="d${n}"></textarea>
      <fieldset><legend>Current role?</legend><label><input type="radio" name="cur${n}" value="y">Yes</label><label><input type="radio" name="cur${n}" value="n">No</label></fieldset>
    </div>`,
      )
      .join("")}
    <button type="button">Add another</button>
  </div>
  <fieldset><legend>Education</legend>
    <div class="school"><label for="s1">School</label><input id="s1"><label for="g1">Degree</label><input id="g1"></div>
    <div class="school"><label for="s2">School</label><input id="s2"><label for="g2">Degree</label><input id="g2"></div>
  </fieldset>
  <div class="emergency"><label for="ephone">Phone</label><input id="ephone" type="tel"></div>
</form>`;

// Opt-in browser proof: a local fixture document only; no ATS, no CLI.
test("extract finds the entries on a real page, and their ids survive the form growing", { skip: !process.env.APPLY_SECTIONS_BROWSER_TEST, timeout: 60_000 }, async (t) => {
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
  // Google Chrome, as the other browser suites use (tests/browser-suites.mjs).
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();

  // Without the autofill flag nothing changes: positional ids, no entries.
  const before = process.env.REBOUNDOPS_FEATURES;
  t.after(() => (before === undefined ? delete process.env.REBOUNDOPS_FEATURES : (process.env.REBOUNDOPS_FEATURES = before)));
  delete process.env.REBOUNDOPS_FEATURES;
  await page.setContent(FORM([1, 2]));
  const off = await extractForm(page.mainFrame());
  assert.ok(off.fields.every((f) => !f.section && /^co\d+$/.test(f.id)), "flag off: positional ids only");

  process.env.REBOUNDOPS_FEATURES = "autofill";
  await page.setContent(FORM([1, 2]));
  const form = await extractForm(page.mainFrame());
  const byId = Object.fromEntries(form.fields.map((f) => [f.id, f]));
  const ids = form.fields.map((f) => f.id);
  for (const id of [
    "employment-1-company", "employment-1-job-title", "employment-1-what-did-you-do", "employment-1-current-role",
    "employment-2-company", "employment-2-job-title", "employment-2-what-did-you-do", "employment-2-current-role",
    "education-1-school", "education-1-degree", "education-2-school", "education-2-degree",
  ]) assert.ok(byId[id], `${id} extracted (got ${ids.join(", ")})`);
  assert.deepEqual(byId["employment-2-company"].section, { group: "employment", kind: "employment", index: 2, count: 2, heading: "Work experience" });
  assert.deepEqual(byId["education-1-degree"].section, { group: "education", kind: "education", index: 1, count: 2, heading: "Education" });
  const phones = form.fields.filter((f) => f.label === "Phone");
  assert.equal(phones.length, 2);
  assert.ok(phones.every((f) => !f.section && /^co\d+$/.test(f.id)), "two unrelated Phone questions are not a repeated section");
  assert.equal(await page.locator("#c2").getAttribute("data-co-field"), "employment-2-company", "the live control is re-tagged");
  assert.deepEqual(await page.locator("input[name=cur2]").evaluateAll((rs) => rs.map((r) => r.getAttribute("data-co-field"))), ["employment-2-current-role", "employment-2-current-role"]);

  // A third job and a field earlier on the form: entries 1 and 2 keep their ids.
  await page.setContent(FORM([1, 2, 3], { extraBefore: true }));
  const grown = await extractForm(page.mainFrame());
  const grownIds = new Set(grown.fields.map((f) => f.id));
  for (const id of ids.filter((x) => !/^co\d+$/.test(x))) assert.ok(grownIds.has(id), `${id} is stable`);
  assert.ok(grownIds.has("employment-3-company"));
  assert.equal(grown.fields.find((f) => f.id === "employment-1-company").section.count, 3);

  // Repeated questions listed flat, with no block per entry, are not recognised.
  await page.setContent(`<form><div><label for="a">Company</label><input id="a"><label for="b">Job title</label><input id="b"><label for="c">Company</label><input id="c"><label for="d">Job title</label><input id="d"></div></form>`);
  const flat = await extractForm(page.mainFrame());
  assert.ok(flat.fields.every((f) => !f.section));
});

// Lever adapter (R1 Autofill, behind the `autofill` flag): on a Lever apply
// page, extraction reads only `form#application-form` (its context scope) and
// takes each question card's text and required flag from the schema Lever
// embeds in the form. Survey, EEO and pronoun fields are always the person's own
// answer, whatever their wording.
//
// The pure half runs everywhere. The opt-in browser half serves a made-up
// Lever-style page at a jobs.lever.co URL through page.route (nothing leaves the
// machine) and extracts it in Google Chrome; it runs with APPLY_LEVER_BROWSER_TEST=1.

import test from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichFromLever, LEVER_FORM_SCOPE, parseLever } from "../../src/lib/apply/lever.mjs";
import { enforceAnswerPolicy, fieldSensitiveCategory } from "../../src/lib/apply/answer-policy.mjs";
import { cannotSave } from "../../src/lib/apply/approved-answer-match.mjs";
import { narrativeFields } from "../../src/lib/apply/narrative-draft.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const POSTING = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";
const CARD = "11111111-2222-4333-8444-555555555555";
const SURVEY = "66666666-7777-4888-9999-000000000000";

test("parseLever: only Lever job and apply pages over https", () => {
  assert.deepEqual(parseLever(`https://jobs.lever.co/examplecorp/${POSTING}/apply`), { site: "examplecorp", postingId: POSTING });
  assert.deepEqual(parseLever(`https://jobs.eu.lever.co/examplecorp/${POSTING}`), { site: "examplecorp", postingId: POSTING });
  assert.deepEqual(parseLever(`https://jobs.lever.co/examplecorp/${POSTING.toUpperCase()}/apply/`), { site: "examplecorp", postingId: POSTING });
  assert.equal(parseLever(`http://jobs.lever.co/examplecorp/${POSTING}/apply`), null);
  assert.equal(parseLever(`https://jobs.lever.co.evil.test/examplecorp/${POSTING}/apply`), null);
  assert.equal(parseLever(`https://evil.test/jobs.lever.co/examplecorp/${POSTING}`), null);
  assert.equal(parseLever("https://jobs.lever.co/examplecorp"), null, "a board page is not a posting");
  assert.equal(parseLever(`https://jobs.lever.co/examplecorp/${POSTING}/thanks`), null);
  assert.equal(parseLever("not a url"), null);
  assert.equal(LEVER_FORM_SCOPE, "form#application-form");
});

const cards = [
  { id: CARD, kind: "card", questions: [{ text: "  Are you willing to   travel? ", type: "multiple-choice", required: true }, { text: "Which tools do you use?", type: "multiple-select", required: true }] },
  { id: SURVEY, kind: "survey", questions: [{ text: "How did you hear about us?", type: "text", required: false }] },
];

test("enrichFromLever: card text and required flag, labelled boxes, demographic marks", () => {
  const fields = [
    { id: "co0", type: "email", label: "Email✱", required: true, nativeName: "email" },
    { id: "co1", type: "radio", label: "Yes", required: false, nativeName: `cards[${CARD}][field0]` },
    { id: "co2", type: "checkbox", label: "Figma", required: false, nativeName: `cards[${CARD}][field1]` },
    { id: "co3", type: "text", label: "How did you hear about us?", required: false, nativeName: `surveysResponses[${SURVEY}][responses][field0]` },
    { id: "co4", type: "select", label: "Gender", required: false, nativeName: "eeo[gender]" },
    { id: "co5", type: "text", label: "Your name", required: false, nativeName: "eeo[disabilitySignature]" },
    { id: "co6", type: "checkbox", label: "She/her", required: false, nativeName: "pronouns" },
    { id: "co7", type: "checkbox", label: "Use name only", required: false, nativeId: "useNameOnlyPronounsOption" },
    { id: "co8", type: "text", label: "Unknown card", required: false, nativeName: "cards[99999999-0000-4000-8000-000000000000][field0]" },
    { id: "co9", type: "text", label: "Unknown survey", required: false, nativeName: "surveysResponses[99999999-0000-4000-8000-000000000000][responses][field0]" },
    { id: "co10", type: "text", label: "Current company", required: true, nativeName: "org" },
    { id: "co11", type: "file", label: "Resume/CV ATTACH RESUME/CV Analyzing resume...", required: false, nativeName: "resume" },
    { id: "co12", type: "checkbox", label: "He/him", required: false, nativeName: "pronouns" },
  ];
  const questions = { co11: "Resume/CV ✱", co12: "Pronouns", co1: "Page text the card replaces" };
  const out = Object.fromEntries(enrichFromLever(fields, { cards, questions }).map((f) => [f.id, f]));
  assert.equal(out.co0.label, "Email", "Lever's required marker is dropped");
  assert.equal(out.co1.label, "Are you willing to travel?");
  assert.equal(out.co1.required, true, "the card's required flag wins over the DOM");
  assert.equal(out.co2.label, "Which tools do you use?: Figma");
  assert.equal(out.co2.required, false, "one box of a multi-select is never required on its own");
  assert.equal(out.co3.sensitiveHint, "demographic");
  assert.equal(out.co4.sensitiveHint, "demographic");
  assert.equal(out.co5.sensitiveHint, "demographic");
  assert.deepEqual([out.co6.label, out.co6.sensitiveHint], ["Pronouns: She/her", "demographic"]);
  assert.deepEqual([out.co7.label, out.co7.sensitiveHint], ["Pronouns: Use name only", "demographic"]);
  assert.equal(out.co8.label, "Unknown card", "a card the schema does not describe is left alone");
  assert.equal(out.co8.sensitiveHint, undefined);
  assert.equal(out.co9.sensitiveHint, "demographic", "an undescribed survey answer is still demographic");
  assert.equal(out.co10, fields[10], "a standard field without a marker is returned as it was");
  assert.equal(out.co11.label, "Resume/CV", "the row's question text, without Lever's helper and status text");
  assert.deepEqual([out.co12.label, out.co12.sensitiveHint], ["Pronouns: He/him", "demographic"]);
  assert.deepEqual(enrichFromLever(fields.slice(10, 11), null), fields.slice(10, 11));
  assert.deepEqual(enrichFromLever(fields.slice(10, 11), { cards: [], questions: { toString: "x" } }), fields.slice(10, 11), "only own keys count");
});

test("the policy leaves a Lever survey answer for the person, whatever it asks", () => {
  const survey = { id: "co3", type: "text", label: "How did you hear about us?", sensitiveHint: "demographic" };
  const plain = { id: "co4", type: "text", label: "How did you hear about us?" };
  assert.equal(fieldSensitiveCategory(survey), "demographic");
  assert.equal(fieldSensitiveCategory(plain), null);
  assert.equal(fieldSensitiveCategory({ label: "Visa sponsorship?", sensitiveHint: "demographic" }), "sponsorship", "the label's category comes first");
  assert.equal(fieldSensitiveCategory({ label: "Hobbies", sensitiveHint: "made_up" }), null, "only known categories count");

  const { answers } = enforceAnswerPolicy([survey, plain], { co3: "A friend", co4: "A friend" });
  assert.deepEqual([answers.co3.source, answers.co3.value, answers.co3.hold_reason], ["unresolved", "", "sensitive_requires_reviewed_fact"]);
  assert.equal(answers.co4.source, "model_draft");
  assert.ok(cannotSave({ type: "checkbox", label: "Pronouns: She/her", sensitiveHint: "demographic" }), "a demographic checkbox is never saved");
  assert.equal(fieldSensitiveCategory({ label: "Are you 18 years or older?" }), "demographic", "an age question, Lever's common wording");
  assert.deepEqual(narrativeFields([{ id: "t", type: "textarea", label: "Anything else?", sensitiveHint: "demographic" }]), []);
});

const PAGE = `<!doctype html><html><head><title>Example Corp - Platform Engineer</title></head><body>
<header><label for="q">Keywords</label><input id="q" type="text"></header>
<form id="application-form" enctype="multipart/form-data" method="POST">
  <ul>
    <li class="application-question"><label><div class="application-label">Full name<span class="required">✱</span></div><div class="application-field"><input type="text" name="name" required></div></label></li>
    <li class="application-question"><label><div class="application-label">Email<span class="required">✱</span></div><div class="application-field"><input type="email" name="email" required></div></label></li>
    <li class="application-question"><div class="application-label multiple-select">Pronouns</div><div class="application-field"><ul>
      <li><label><input type="checkbox" name="pronouns" value="She/her"><span class="application-answer-alternative">She/her</span></label></li>
      <li><label><input type="checkbox" name="pronouns" value="They/them"><span class="application-answer-alternative">They/them</span></label></li>
    </ul></div></li>
  </ul>
  <h4>Links</h4>
  <ul><li class="application-question"><label><div class="application-label">LinkedIn URL</div><div class="application-field"><input type="text" name="urls[LinkedIn]"></div></label></li></ul>
  <input type="hidden" name="cards[${CARD}][baseTemplate]" value='{"text":"Additional information","type":"posting","fields":[{"type":"multiple-choice","text":"Are you willing to travel?","required":true,"options":[{"text":"Yes"},{"text":"No"}]},{"type":"textarea","text":"Tell us about a system you built","required":false}]}'>
  <ul><li class="application-question custom-question"><div class="application-label full-width multiple-choice"><div class="text">Are you willing to travel?</div></div><div class="application-field full-width"><ul>
    <li><label><input type="radio" name="cards[${CARD}][field0]" value="Yes"><span class="application-answer-alternative">Yes</span></label></li>
    <li><label><input type="radio" name="cards[${CARD}][field0]" value="No"><span class="application-answer-alternative">No</span></label></li>
  </ul></div></li>
  <li class="application-question custom-question"><div class="application-label full-width"><div class="text">Ignored DOM text</div></div><div class="application-field full-width"><textarea name="cards[${CARD}][field1]"></textarea></div></li></ul>
  <input type="hidden" name="surveysResponses[${SURVEY}][baseTemplate]" value='{"text":"Optional survey","type":"survey","fields":[{"type":"text","text":"How did you hear about us?","required":false}]}'>
  <ul><li class="application-question"><label><div class="application-label">How did you hear about us?</div><div class="application-field"><input type="text" name="surveysResponses[${SURVEY}][responses][field0]"></div></label></li></ul>
  <div class="application-question"><label><div class="application-label">Gender</div><div class="application-field"><select name="eeo[gender]"><option value="">Select ...</option><option>Female</option><option>Male</option></select></div></label></div>
  <button type="submit">Submit application</button>
</form>
<footer><label for="news">Newsletter email</label><input id="news" type="email"></footer>
</body></html>`;

// Opt-in browser proof: a made-up page served locally; no ATS, no CLI.
test("extract reads only the Lever form, with the card schema applied", { skip: !process.env.APPLY_LEVER_BROWSER_TEST, timeout: 60_000 }, async (t) => {
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
  // Every request is answered here: the fixture for the apply URL, nothing for anything else.
  await page.route("**/*", (route) =>
    route.request().url() === `https://jobs.lever.co/examplecorp/${POSTING}/apply`
      ? route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: PAGE })
      : route.abort(),
  );
  await page.goto(`https://jobs.lever.co/examplecorp/${POSTING}/apply`);

  const before = process.env.REBOUNDOPS_FEATURES;
  t.after(() => (before === undefined ? delete process.env.REBOUNDOPS_FEATURES : (process.env.REBOUNDOPS_FEATURES = before)));
  delete process.env.REBOUNDOPS_FEATURES;
  const off = await extractForm(page.mainFrame());
  assert.ok(off.fields.some((f) => /keywords/i.test(f.label)), `flag off: the whole page, as before (got ${off.fields.map((f) => f.label).join(" | ")})`);
  assert.ok(off.fields.every((f) => f.sensitiveHint === undefined));
  assert.ok(off.fields.some((f) => f.label === `cards[${CARD}][field0]`), "without the adapter the card question has only its field name");

  process.env.REBOUNDOPS_FEATURES = "autofill";
  const form = await extractForm(page.mainFrame());
  const labels = form.fields.map((f) => f.label);
  assert.ok(!labels.some((l) => /keywords|newsletter/i.test(l)), `only the application form is read (got ${labels.join(" | ")})`);
  const by = (l) => form.fields.find((f) => f.label === l);
  assert.ok(by("Full name")?.required && by("Email"), "standard fields, with the required marker dropped");
  assert.ok(by("LinkedIn URL"));
  const travel = by("Are you willing to travel?");
  assert.deepEqual([travel?.type, travel?.required, travel?.options], ["radio", true, ["Yes", "No"]]);
  assert.equal(by("Tell us about a system you built")?.type, "textarea", "the card's question text, not the page's");
  assert.equal(by("How did you hear about us?")?.sensitiveHint, "demographic");
  assert.equal(by("Gender")?.sensitiveHint, "demographic");
  assert.deepEqual(form.fields.filter((f) => f.nativeName === "pronouns").map((f) => [f.label, f.sensitiveHint]), [["Pronouns: She/her", "demographic"], ["Pronouns: They/them", "demographic"]]);
});

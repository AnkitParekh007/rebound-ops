/**
 * apply-answer-policy.test.mjs: the code-level answer rules the prefill route
 * applies to planner output (answer-policy.mjs), plus the route wiring.
 *
 * Also run by the root `npm test`, because engine/web tests are not part of
 * the repository's required CI (roadmap gap C1).
 *
 * Run (from web/):  node --test tests/lib/apply-answer-policy.test.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";
import { enforceAnswerPolicy, sensitiveCategory } from "../../src/lib/apply/answer-policy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const SENSITIVE_LABELS = [
  ["Will you now or in the future require sponsorship for employment visa status?", "sponsorship"],
  ["Do you require visa sponsorship?", "sponsorship"],
  ["Are you legally authorized to work in the United States?", "work_authorization"],
  ["Do you have the right to work in the UK?", "work_authorization"],
  ["Are you eligible to work in Germany?", "work_authorization"],
  ["Are you legally permitted to work in the United States?", "work_authorization"],
  ["Are you allowed to work in Canada without restriction?", "work_authorization"],
  ["Country of citizenship", "citizenship"],
  ["What are your salary expectations?", "salary"],
  ["Expected CTC (INR)", "salary"],
  ["Desired compensation", "salary"],
  ["Gender", "demographic"],
  ["Are you a protected veteran?", "demographic"],
  ["Disability status", "demographic"],
  ["Are you at least 18 years old?", "demographic"],
  ["Are you 18+ years of age?", "demographic"],
  ["Are you over the age of 21?", "demographic"],
  ["Race / Ethnicity", "demographic"],
  ["Have you ever been convicted of a felony?", "background_check"],
  ["I have read and agree to the privacy notice", "attestation"],
  ["I certify that the information provided is true", "attestation"],
];

test("sensitive questions are recognised by category", () => {
  for (const [label, want] of SENSITIVE_LABELS) assert.equal(sensitiveCategory(label), want, label);
});

test("ordinary questions are not sensitive", () => {
  for (const label of ["First name", "Email", "LinkedIn profile", "Why do you want to work at Acme?", "Notice period", "Years of experience with TypeScript", "How many years of React experience do you have?", "Preferred language", "Current company", "Agency name"]) {
    assert.equal(sensitiveCategory(label), null, label);
  }
});

test("a model answer to a sensitive question never reaches the person as a value", () => {
  const fields = [
    { id: "visa", type: "radio", label: "Do you require visa sponsorship?", required: true, options: ["Yes", "No"] },
    { id: "pay", type: "text", label: "Salary expectations", required: false },
    { id: "consent", type: "checkbox", label: "I agree to the privacy notice", required: true },
  ];
  // The planner ignored the prompt and answered all three.
  const raw = { visa: { value: "No", needs_confirmation: false }, pay: { value: "120000", needs_confirmation: false }, consent: { value: "true" } };
  const { answers, summary } = enforceAnswerPolicy(fields, raw);
  assert.deepEqual(answers.visa, { value: "", needs_confirmation: true, source: "unresolved", sensitive_category: "sponsorship", hold_reason: "sensitive_requires_reviewed_fact" });
  assert.equal(answers.pay.value, "");
  assert.equal(answers.pay.sensitive_category, "salary");
  assert.equal(answers.consent.hold_reason, "consent_never_auto");
  assert.deepEqual(summary, { proposed: 0, held: 0, unresolved: 3, dropped: 0, fromProfile: 0 });
});

test("work-permission and age-of-majority answers are never returned as model drafts", () => {
  const fields = [
    { id: "permit", type: "radio", label: "Are you legally permitted to work in the United States?", required: true, options: ["Yes", "No"] },
    { id: "adult", type: "radio", label: "Are you at least 18 years old?", required: true, options: ["Yes", "No"] },
  ];
  const { answers } = enforceAnswerPolicy(fields, { permit: { value: "Yes", needs_confirmation: false }, adult: { value: "Yes", needs_confirmation: false } });
  assert.equal(answers.permit.source, "unresolved");
  assert.equal(answers.permit.sensitive_category, "work_authorization");
  assert.equal(answers.permit.value, "");
  assert.equal(answers.adult.source, "unresolved");
  assert.equal(answers.adult.sensitive_category, "demographic");
  assert.equal(answers.adult.value, "");
});

test("ordinary answers pass through labelled as model drafts", () => {
  const fields = [{ id: "fn", type: "text", label: "First name", required: true }];
  const { answers, summary } = enforceAnswerPolicy(fields, { fn: { value: "Ada", needs_confirmation: false } });
  assert.deepEqual(answers.fn, { value: "Ada", needs_confirmation: false, source: "model_draft", sensitive_category: null, hold_reason: null });
  assert.equal(summary.proposed, 1);
});

test("the model's own needs_confirmation flag is kept", () => {
  const fields = [{ id: "why", type: "textarea", label: "Why Acme?", required: false }];
  const { answers } = enforceAnswerPolicy(fields, { why: { value: "Because…", needs_confirmation: true } });
  assert.equal(answers.why.needs_confirmation, true);
});

test("an option the form does not offer is left for the person", () => {
  const fields = [
    { id: "country", type: "select", label: "Country", required: true, options: ["Australia", "Austria"] },
    { id: "loc", type: "text", label: "Office", required: false, combobox: true, options: ["Berlin", "Munich"] },
  ];
  const { answers } = enforceAnswerPolicy(fields, { country: { value: "US" }, loc: { value: "berlin" } });
  assert.equal(answers.country.hold_reason, "not_an_option", "no substring match: US must not become Australia");
  assert.equal(answers.country.value, "");
  assert.equal(answers.loc.value, "Berlin", "case-insensitive exact option is accepted, stored as the form spells it");
});

test("a matched option is stored with the form's own spelling", () => {
  const fields = [{ id: "country", type: "select", label: "Country", required: true, options: ["Australia", "Austria"] }];
  const { answers } = enforceAnswerPolicy(fields, { country: { value: "austria" } });
  assert.equal(answers.country.value, "Austria");
  assert.equal(answers.country.source, "model_draft");
});

test("an over-long answer is flagged, never truncated", () => {
  const fields = [{ id: "sum", type: "textarea", label: "Summary", required: false, maxLength: 10 }];
  const { answers, summary } = enforceAnswerPolicy(fields, { sum: { value: "much longer than ten" } });
  assert.equal(answers.sum.value, "much longer than ten");
  assert.equal(answers.sum.hold_reason, "exceeds_max_length");
  assert.equal(answers.sum.needs_confirmation, true);
  assert.equal(summary.held, 1);
});

test("answers for fields not on the form are dropped; file fields are excluded", () => {
  const fields = [
    { id: "cv", type: "file", label: "Resume", required: true },
    { id: "fn", type: "text", label: "First name", required: true },
  ];
  const { answers, summary } = enforceAnswerPolicy(fields, { cv: { value: "/etc/passwd" }, fn: "Ada", injected: { value: "x" } });
  assert.equal("cv" in answers, false);
  assert.equal("injected" in answers, false);
  assert.equal(answers.fn.value, "Ada", "a bare string answer is accepted");
  assert.equal(summary.dropped, 1);
});

test("an empty required answer asks the person; an empty optional one stays quiet", () => {
  const fields = [
    { id: "req", type: "text", label: "Phone", required: true },
    { id: "opt", type: "text", label: "Website", required: false },
  ];
  const { answers } = enforceAnswerPolicy(fields, {});
  assert.equal(answers.req.hold_reason, "no_answer");
  assert.equal(answers.req.needs_confirmation, true);
  assert.equal(answers.opt.hold_reason, null);
  assert.equal(answers.opt.needs_confirmation, false);
});

test("non-object planner output yields no proposals", () => {
  const { summary } = enforceAnswerPolicy([{ id: "a", type: "text", label: "A", required: false }], /** @type {any} */ (null));
  assert.equal(summary.proposed, 0);
});

test("the prefill route emits the policy's answers, not the raw planner object", () => {
  const route = readFileSync(join(root, "src/app/api/apply/prefill/route.ts"), "utf8");
  assert.match(route, /import \{ enforceAnswerPolicy \} from "@\/lib\/apply\/answer-policy\.mjs"/);
  assert.match(route, /enforceAnswerPolicy\(s\.fields, obj, \{ facts \}\)/);
  assert.doesNotMatch(route, /answers:\s*obj\b/, "raw planner output must not be emitted");
});

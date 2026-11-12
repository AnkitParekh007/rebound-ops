/**
 * apply-approved-answers.test.mjs: answers the person saved for reuse
 * (approved-answers.mjs) and how the answer policy uses them
 * (`approved_answer`). Fictional data only.
 *
 * Also run by the root `npm test` (roadmap gap C1).
 *
 * Run (from web/):  node --test tests/lib/apply-approved-answers.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPROVED_ANSWERS_FILE, ApprovedAnswerError, cannotSave, deleteApproved, fieldKind, findApproved, questionKey, readApproved, saveApproved,
} from "../../src/lib/apply/approved-answers.mjs";
import { enforceAnswerPolicy } from "../../src/lib/apply/answer-policy.mjs";
import { profileFacts } from "../../src/lib/apply/profile-facts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const clock = () => new Date("2026-11-13T09:00:00.000Z");

function withRoot(fn) {
  const root = mkdtempSync(join(tmpdir(), "reboundops-approved-"));
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test("a question is recognised by its words, not its case, spacing or end punctuation", () => {
  assert.equal(questionKey("  How did you hear   about us?* "), "how did you hear about us");
  assert.equal(questionKey("How did you hear about us"), questionKey("HOW DID YOU HEAR ABOUT US:"));
  assert.notEqual(questionKey("How did you hear about us?"), questionKey("How did you hear about this role?"));
  assert.deepEqual(["text", "textarea", "email", "select", "radio", "checkbox", "file"].map((type) => fieldKind({ type })), ["text", "text", "text", "choice", "choice", "checkbox", null]);
  assert.equal(fieldKind({ type: "text", combobox: true }), "choice");
});

test("consent and attestation questions, file uploads and unlabelled fields are never saved", () => {
  assert.match(cannotSave({ type: "checkbox", label: "I agree to the privacy policy" }), /never saved/);
  assert.match(cannotSave({ type: "checkbox", label: "I consent to background checks" }), /never saved/);
  assert.match(cannotSave({ type: "file", label: "Resume" }), /file upload/);
  assert.match(cannotSave({ type: "text", label: "  " }), /no question text/);
  assert.equal(cannotSave({ type: "select", label: "Are you authorized to work in Germany?" }), null, "a sensitive question may be saved, as the contracts allow");
});

test("saving writes an owner-only file under data/, replaces the same question and scope, and keeps others", () => withRoot((root) => {
  let all = readApproved(root);
  assert.deepEqual(all, { version: 1, revision: 0, answers: [] });
  const field = { type: "text", label: "How did you hear about us?" };
  ({ all } = saveApproved(root, { revision: 0, field, value: "A fictional meetup", now: clock }));
  ({ all } = saveApproved(root, { revision: all.revision, field, value: "Example Labs blog", company: "Example Labs", now: clock }));
  ({ all } = saveApproved(root, { revision: all.revision, field: { ...field, label: "how did you hear about us" }, value: "A friend", now: clock }));
  assert.equal(all.revision, 3);
  assert.deepEqual(all.answers.map((a) => [a.value, a.company]), [["Example Labs blog", "example labs"], ["A friend", null]]);
  const file = join(root, APPROVED_ANSWERS_FILE);
  assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), all);
  if (process.platform !== "win32") assert.equal(statSync(file).mode & 0o777, 0o600);

  all = deleteApproved(root, { revision: all.revision, id: all.answers[0].id });
  assert.deepEqual(all.answers.map((a) => a.value), ["A friend"]);
  assert.throws(() => deleteApproved(root, { revision: all.revision, id: "gone" }), (e) => e instanceof ApprovedAnswerError && e.status === 404);
}));

test("a stale revision, an empty or attested answer, and a damaged file are refused without writing", () => withRoot((root) => {
  const field = { type: "text", label: "Preferred name" };
  saveApproved(root, { revision: 0, field, value: "Jay" });
  assert.throws(() => saveApproved(root, { revision: 0, field, value: "Other" }), (e) => e.status === 409);
  assert.throws(() => saveApproved(root, { revision: 1, field, value: "  " }), /no answer to save/);
  assert.throws(() => saveApproved(root, { revision: 1, field: { type: "checkbox", label: "I certify the above is true" }, value: "true" }), /never saved/);
  assert.equal(readApproved(root).answers[0].value, "Jay");

  const file = join(root, APPROVED_ANSWERS_FILE);
  writeFileSync(file, "{ not json");
  assert.throws(() => readApproved(root), (e) => e.status === 500 && /not valid JSON/.test(e.message));
  assert.throws(() => saveApproved(root, { revision: 1, field, value: "Jay" }), (e) => e.status === 500);
  assert.equal(readFileSync(file, "utf8"), "{ not json", "a damaged file is never overwritten");
}));

test("a company answer wins over a general one; kind must match", () => withRoot((root) => {
  const field = { type: "select", label: "Are you willing to relocate?" };
  let { all } = saveApproved(root, { revision: 0, field, value: "No" });
  ({ all } = saveApproved(root, { revision: all.revision, field, value: "Yes", company: "Example Labs" }));
  assert.equal(findApproved(all.answers, field, " example labs ").value, "Yes");
  assert.equal(findApproved(all.answers, field, "Other Co").value, "No");
  assert.equal(findApproved(all.answers, field, null).value, "No");
  assert.equal(findApproved(all.answers, { ...field, type: "text" }, null), null, "a text answer never fills a choice, or the reverse");
}));

const lookup = (answers, company = null) => (field) => findApproved(answers, field, company);

test("the policy uses a saved answer before a draft, with the approved_answer source", () => withRoot((root) => {
  const fields = [
    { id: "heard", type: "text", label: "How did you hear about us?" },
    { id: "auth", type: "select", label: "Are you authorized to work in Germany?", options: ["Yes", "No"] },
    { id: "salary", type: "text", label: "Salary expectations" },
    { id: "consent", type: "checkbox", label: "I agree to the privacy policy" },
    { id: "relocate", type: "radio", label: "Willing to relocate?", options: ["Yes", "No"] },
  ];
  let { all } = saveApproved(root, { revision: 0, field: fields[0], value: "A fictional meetup" });
  ({ all } = saveApproved(root, { revision: all.revision, field: fields[1], value: "yes" }));
  ({ all } = saveApproved(root, { revision: all.revision, field: fields[2], value: "Fictional range", company: "Example Labs" }));
  ({ all } = saveApproved(root, { revision: all.revision, field: { type: "radio", label: "Willing to relocate?" }, value: "Maybe" }));
  const model = { heard: { value: "LinkedIn" }, salary: { value: "100k" }, consent: { value: "true" }, relocate: { value: "No" } };

  const { answers, summary } = enforceAnswerPolicy(fields, model, { approved: lookup(all.answers, "Example Labs") });
  assert.deepEqual([answers.heard.source, answers.heard.value, answers.heard.needs_confirmation], ["approved_answer", "A fictional meetup", false]);
  assert.deepEqual([answers.auth.source, answers.auth.value, answers.auth.needs_confirmation, answers.auth.sensitive_category],
    ["approved_answer", "Yes", true, "work_authorization"], "a sensitive saved answer is filled in the form's spelling and still asks to confirm");
  assert.deepEqual([answers.salary.source, answers.salary.value, answers.salary.needs_confirmation], ["approved_answer", "Fictional range", true]);
  assert.deepEqual([answers.consent.source, answers.consent.hold_reason], ["unresolved", "consent_never_auto"]);
  assert.deepEqual([answers.relocate.source, answers.relocate.value], ["model_draft", "No"], "a saved option the form does not offer does not apply");
  assert.equal(summary.fromApproved, 3);

  const elsewhere = enforceAnswerPolicy(fields, model, { approved: lookup(all.answers, "Other Co") }).answers;
  assert.deepEqual([elsewhere.salary.source, elsewhere.salary.hold_reason], ["unresolved", "sensitive_requires_reviewed_fact"], "a company-only answer stays with that company");
}));

test("a consent box is never ticked even if a saved answer somehow matches it", () => {
  const field = { id: "c", type: "checkbox", label: "I consent to background checks" };
  const { answers } = enforceAnswerPolicy([field], {}, { approved: () => ({ value: "true" }) });
  assert.equal(answers.c.value, "");
});

test("source order: a profile fact beats a saved answer, and a saved answer beats a derived value", () => {
  const facts = profileFacts({ candidate: { full_name: "Jane Smith", email: "jane@example.com" } });
  const fields = [{ id: "email", type: "email", label: "Email" }, { id: "first", type: "text", label: "First name" }];
  const approved = (f) => ({ value: f.label === "Email" ? "saved@example.com" : "Janie" });
  const { answers } = enforceAnswerPolicy(fields, {}, { facts, approved });
  assert.deepEqual([answers.email.source, answers.email.value], ["profile_fact", "jane@example.com"]);
  assert.deepEqual([answers.first.source, answers.first.value], ["approved_answer", "Janie"]);
  const without = enforceAnswerPolicy(fields, {}, { facts }).answers;
  assert.deepEqual([without.first.source, without.first.value], ["derived", "Jane"]);
});

test("reuse and saving sit behind the autofill flag; the browser module reads no files", () => {
  const prefill = readFileSync(join(here, "../../src/app/api/apply/prefill/route.ts"), "utf8");
  assert.match(prefill, /if \(autofillEnabled\(process\.env\)\) \{\s*try \{\s*const saved = readApproved/);
  assert.match(prefill, /enforceAnswerPolicy\(s\.fields, obj, \{ facts, approved \}\)/);
  const crud = readFileSync(join(here, "../../src/app/api/apply/approved-answers/route.ts"), "utf8");
  assert.equal((crud.match(/if \(!autofillEnabled\(process\.env\)\) return off\(\);/g) ?? []).length, 3, "GET, POST and DELETE each check the flag");
  const match = readFileSync(join(here, "../../src/lib/apply/approved-answer-match.mjs"), "utf8");
  assert.doesNotMatch(match, /node:fs|node:path/);
});

test("data/approved-answers.json is listed as user data", () => {
  const contract = readFileSync(join(here, "../../../DATA_CONTRACT.md"), "utf8");
  assert.match(contract, /`data\/approved-answers\.json`/);
});

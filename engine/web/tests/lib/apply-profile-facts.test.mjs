/**
 * apply-profile-facts.test.mjs: deterministic answers from config/profile.yml
 * (profile-facts.mjs) and how the answer policy applies them.
 *
 * Fictional profile only. Also run by the root `npm test` (roadmap gap C1).
 *
 * Run (from web/):  node --test tests/lib/apply-profile-facts.test.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";
import { profileFacts, resolveProfileAnswer, countriesInLabel } from "../../src/lib/apply/profile-facts.mjs";
import { enforceAnswerPolicy, sensitiveCategory } from "../../src/lib/apply/answer-policy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const PROFILE = {
  candidate: {
    full_name: "Jane Smith",
    email: "jane@example.com",
    phone: "+1-555-0123",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/janesmith",
    github: "github.com/janesmith",
    portfolio_url: "https://janesmith.dev",
  },
  compensation: { target_range: "$150K-200K", currency: "USD", minimum: "$120K" },
  location: { country: "United States", visa_status: "No sponsorship needed", authorized_in: ["United States", "Canada"], needs_sponsorship: false },
};
const facts = profileFacts(PROFILE);
const answer = (field) => resolveProfileAnswer(field, facts, sensitiveCategory(field.label));

test("only allowlisted keys are copied; compensation and visa text never are", () => {
  const encoded = JSON.stringify(facts);
  assert.doesNotMatch(encoded, /120K|150K|USD|No sponsorship needed/);
  assert.deepEqual(facts.authorizedIn, ["united states", "canada"]);
  assert.equal(facts.needsSponsorship, false);
});

test("broken or missing profiles give empty facts, not errors", () => {
  for (const p of [null, undefined, "text", [], { candidate: "x", location: { authorized_in: "US", needs_sponsorship: "no" } }]) {
    const f = profileFacts(p);
    assert.equal(f.email, "");
    assert.deepEqual(f.authorizedIn, []);
    assert.equal(f.needsSponsorship, null, "a non-boolean is not a fact");
  }
});

test("identity fields come from the profile", () => {
  assert.deepEqual(answer({ type: "email", label: "Email address" }), { value: "jane@example.com", source: "profile_fact" });
  assert.deepEqual(answer({ type: "tel", label: "Phone" }), { value: "+1-555-0123", source: "profile_fact" });
  assert.deepEqual(answer({ type: "text", label: "LinkedIn Profile" }), { value: "linkedin.com/in/janesmith", source: "profile_fact" });
  assert.deepEqual(answer({ type: "url", label: "GitHub" }), { value: "github.com/janesmith", source: "profile_fact" });
  assert.deepEqual(answer({ type: "url", label: "Portfolio" }), { value: "https://janesmith.dev", source: "profile_fact" });
  assert.deepEqual(answer({ type: "text", label: "Full name" }), { value: "Jane Smith", source: "profile_fact" });
  assert.deepEqual(answer({ type: "text", label: "Location" }), { value: "San Francisco, CA", source: "profile_fact" });
});

test("first and last name split only from a plain two-word name, as derived", () => {
  assert.deepEqual(answer({ type: "text", label: "First name" }), { value: "Jane", source: "derived" });
  assert.deepEqual(answer({ type: "text", label: "Last name" }), { value: "Smith", source: "derived" });
  const three = profileFacts({ candidate: { full_name: "Ana María de la Cruz" } });
  assert.equal(resolveProfileAnswer({ type: "text", label: "First name" }, three, null), null);
});

test("fields about someone else are never filled with the candidate's details", () => {
  for (const label of ["Referrer email", "Reference phone number", "Emergency contact phone", "Hiring manager name", "Company name", "Current employer website"]) {
    assert.equal(answer({ type: "text", label }), null, label);
  }
});

test("authorized to work: Yes only for a named country in authorized_in", () => {
  const field = (label) => ({ type: "radio", label, options: ["Yes", "No"] });
  assert.deepEqual(answer(field("Are you legally authorized to work in the United States?")), { value: "Yes", source: "profile_fact" });
  assert.deepEqual(answer(field("Are you eligible to work in Canada?")), { value: "Yes", source: "profile_fact" });
  assert.equal(answer(field("Are you authorized to work in Germany?")), null, "absent from the list is not 'No'");
  assert.equal(answer(field("Are you authorized to work in the country where this job is located?")), null, "no country named");
  assert.equal(answer(field("Are you authorized to work in the US or Canada?")), null, "two countries named: one Yes cannot answer both");
});

test("sponsorship: No only when the country is authorized and needs_sponsorship is false", () => {
  const field = (label) => ({ type: "select", label, options: ["Yes", "No"] });
  assert.deepEqual(answer(field("Will you now or in the future require visa sponsorship to work in the United States?")), { value: "No", source: "profile_fact" });
  assert.equal(answer(field("Will you require sponsorship to work in the UK?")), null, "not in authorized_in");
  assert.equal(answer(field("Do you require sponsorship?")), null, "no country named");
  const needs = profileFacts({ location: { authorized_in: ["United States"], needs_sponsorship: true } });
  assert.equal(resolveProfileAnswer(field("Do you require sponsorship in the United States?"), needs, "sponsorship"), null, "needs_sponsorship true is left for the person");
  const unknown = profileFacts({ location: { authorized_in: ["United States"] } });
  assert.equal(resolveProfileAnswer(field("Do you require sponsorship in the United States?"), unknown, "sponsorship"), null, "missing boolean is not a fact");
});

test("a Yes/No fact only fills a choice field that offers it", () => {
  assert.deepEqual(answer({ type: "radio", label: "Are you authorized to work in the United States?", options: ["Yes, I am authorized", "No"] }), {
    value: "Yes, I am authorized",
    source: "profile_fact",
  });
  assert.equal(answer({ type: "select", label: "Are you authorized to work in the United States?", options: ["Citizen", "Permanent resident", "Visa holder"] }), null);
  assert.equal(answer({ type: "checkbox", label: "I am authorized to work in the United States" }), null);
});

test("salary, citizenship, demographics and attestations are never answered from the profile", () => {
  for (const label of ["Desired salary (USD)", "Country of citizenship", "Gender", "I agree to the privacy notice", "Have you ever been convicted of a felony?"]) {
    assert.equal(answer({ type: "text", label }), null, label);
  }
});

test("'work for us' does not name the United States", () => {
  assert.deepEqual(countriesInLabel("Why do you want to work for us?"), []);
  assert.deepEqual(countriesInLabel("Are you authorized to work in the U.S.?"), ["united states"]);
  assert.deepEqual(countriesInLabel("Can you work in Northern Ireland?"), ["united kingdom"]);
  assert.deepEqual(countriesInLabel("Can you work in Ireland?"), ["ireland"]);
});

test("the policy prefers profile facts over the planner, including for sponsorship", () => {
  const fields = [
    { id: "email", type: "email", label: "Email", required: true },
    { id: "visa", type: "radio", label: "Will you require sponsorship to work in the United States?", required: true, options: ["Yes", "No"] },
    { id: "pay", type: "text", label: "Salary expectations", required: true },
    { id: "why", type: "textarea", label: "Why Acme?", required: false },
  ];
  // The planner got the email wrong, answered sponsorship and salary anyway.
  const raw = { email: { value: "wrong@example.com" }, visa: { value: "Yes" }, pay: { value: "$150K" }, why: { value: "Mission." } };
  const { answers, summary } = enforceAnswerPolicy(fields, raw, { facts });
  assert.deepEqual(answers.email, { value: "jane@example.com", needs_confirmation: false, source: "profile_fact", sensitive_category: null, hold_reason: null });
  assert.deepEqual(answers.visa, { value: "No", needs_confirmation: false, source: "profile_fact", sensitive_category: "sponsorship", hold_reason: null });
  assert.equal(answers.pay.value, "", "salary stays the person's answer");
  assert.equal(answers.pay.hold_reason, "sensitive_requires_reviewed_fact");
  assert.equal(answers.why.source, "model_draft");
  assert.equal(summary.fromProfile, 2);
});

test("without facts the policy behaves exactly as before", () => {
  const fields = [{ id: "email", type: "email", label: "Email", required: true }];
  const { answers, summary } = enforceAnswerPolicy(fields, { email: { value: "x@example.com" } });
  assert.equal(answers.email.source, "model_draft");
  assert.equal(summary.fromProfile, 0);
});

test("the prefill route loads facts from the resolved profile path and passes them to the policy", () => {
  const route = readFileSync(join(root, "src/app/api/apply/prefill/route.ts"), "utf8");
  assert.match(route, /profileFacts\(yaml\.load\(fs\.readFileSync\(getProfilePath\(reboundOpsRoot\(\)\), "utf8"\)\)\)/);
  assert.match(route, /enforceAnswerPolicy\(s\.fields, obj, \{ facts, approved \}\)/);
});

// Eligibility screening (operations feature #3): requirement finding and the
// verdict rules. Every posting and profile here is fictional.
import test from "node:test";
import assert from "node:assert/strict";
import {
  eligibilityFacts,
  eligibilityOutcome,
  eligibilityScreeningEnabled,
  findRequirements,
  jobCountries,
  screenEligibility,
  sentences,
} from "../../src/lib/eligibility/screen.mjs";

const kinds = (text) => findRequirements(text).map((r) => r.kind);
const facts = (location = {}, candidate = {}) => eligibilityFacts({ location, candidate });
const only = (report, kind) => report.checks.filter((c) => c.kind === kind);

test("the screen is off unless eligibilityScreening is named exactly", () => {
  assert.equal(eligibilityScreeningEnabled({}), false);
  assert.equal(eligibilityScreeningEnabled({ REBOUNDOPS_FEATURES: "autofill" }), false);
  assert.equal(eligibilityScreeningEnabled({ REBOUNDOPS_FEATURES: "EligibilityScreening" }), false);
  assert.equal(eligibilityScreeningEnabled({ REBOUNDOPS_FEATURES: " autofill , eligibilityScreening" }), true);
});

test("facts read only the four reviewed keys, and a broken profile gives empty facts", () => {
  const f = eligibilityFacts({
    location: { country: "Germany", authorized_in: ["Germany", "germany", "The Netherlands"], needs_sponsorship: true, visa_status: "ignored" },
    candidate: { years_of_experience: 7, full_name: "ignored" },
    compensation: { minimum: "ignored" },
  });
  assert.deepEqual(f, { authorizedIn: ["germany", "netherlands"], needsSponsorship: true, country: "germany", yearsOfExperience: 7 });
  for (const broken of [null, "text", 42, { location: "Berlin", candidate: [] }]) {
    assert.deepEqual(eligibilityFacts(broken), { authorizedIn: [], needsSponsorship: null, country: null, yearsOfExperience: null });
  }
  assert.equal(facts({}, { years_of_experience: 99 }).yearsOfExperience, null, "an implausible years value is ignored");
  assert.equal(facts({ country: "Remote" }).country, null);
});

test("sentences split on lines and sentence ends, and strip bullets", () => {
  assert.deepEqual(sentences("Requirements:\n- Fluent German. We do not sponsor visas.\n2) Based in Spain"), [
    "Requirements:",
    "Fluent German.",
    "We do not sponsor visas.",
    "Based in Spain",
  ]);
});

test("sponsorship refusals and offers are found, refusals first", () => {
  for (const s of [
    "We are unable to sponsor visas for this role.",
    "This role does not offer visa sponsorship.",
    "No sponsorship is available.",
    "Sponsorship is not available for this position.",
    "We can't sponsor work permits.",
    "Candidates who require sponsorship now or in the future will not be considered.",
    "Applicants needing visa sponsorship are ineligible.",
    "Citizens and permanent residents only.",
  ]) {
    const r = findRequirements(s).find((x) => x.kind === "sponsorship");
    assert.equal(r?.stance, "refused", s);
  }
  for (const s of ["Visa sponsorship is available.", "We offer relocation and visa sponsorship.", "We can sponsor visas for strong candidates."]) {
    const r = findRequirements(s).find((x) => x.kind === "sponsorship");
    assert.equal(r?.stance, "offered", s);
  }
  assert.deepEqual(kinds("We sponsor local football clubs."), []);
});

test("each requirement kind is found, and preferences or soft wording are not", () => {
  assert.deepEqual(kinds("You must be authorized to work in the US."), ["work_authorization"]);
  assert.deepEqual(kinds("Applicants need the right to work in the UK."), ["work_authorization"]);
  assert.deepEqual(kinds("We will help you obtain a work permit and work authorization."), []);
  assert.deepEqual(kinds("Must hold an active security clearance."), ["citizenship_or_clearance"]);
  assert.deepEqual(kinds("US citizenship is required for this role."), ["citizenship_or_clearance"]);
  assert.deepEqual(kinds("You must be based in Spain."), ["location"]);
  assert.deepEqual(kinds("This role is remote (Canada only)."), ["location"]);
  assert.deepEqual(kinds("Fluent German is required."), ["language"]);
  assert.deepEqual(kinds("Japanese at C1 level."), ["language"]);
  assert.deepEqual(kinds("Bachelor's degree in Computer Science."), ["degree"]);
  assert.deepEqual(kinds("BS in Mathematics."), ["degree"]);

  for (const soft of [
    "Japanese is a plus.",
    "Fluent French preferred.",
    "Being based in Spain is nice to have.",
    "A security clearance is an advantage.",
    "BS in Computer Science or equivalent experience.",
    "A degree is not required.",
    "We don't require a degree.",
    "You will have a high degree of autonomy.",
    "A 360-degree view of the customer.",
    "Strong English communication skills.",
    "Experience with MS Office.",
    "Work for us and grow with the team.",
  ]) {
    assert.deepEqual(kinds(soft), [], soft);
  }
});

test("authorization meets only when every named country is in authorized_in", () => {
  const r = screenEligibility({ description: "You must be authorized to work in Germany." }, facts({ authorized_in: ["Germany"] }));
  assert.equal(r.outcome, "eligible");
  assert.deepEqual(r.checks[0].basis, ["location.authorized_in"]);
  assert.equal(r.checks[0].evidence, "You must be authorized to work in Germany.");
});

test("a country missing from authorized_in fails only when the profile says sponsorship is needed", () => {
  const jd = { description: "You must be authorized to work in the US. We do not sponsor visas.", location: "New York, US" };
  const silent = screenEligibility(jd, facts({ authorized_in: ["Germany"] }));
  assert.equal(silent.outcome, "needs_review");
  assert.ok(silent.checks.every((c) => c.verdict === "unknown" && c.basis.length === 0));

  const noNeed = screenEligibility(jd, facts({ authorized_in: ["Germany"], needs_sponsorship: false }));
  assert.equal(noNeed.outcome, "needs_review", "needs_sponsorship: false is not read as authorized everywhere");

  const needs = screenEligibility(jd, facts({ authorized_in: ["Germany"], needs_sponsorship: true }));
  assert.equal(needs.outcome, "blocked");
  for (const c of needs.checks) {
    assert.equal(c.verdict, "does_not_meet");
    assert.deepEqual(c.basis, ["location.authorized_in", "location.needs_sponsorship"]);
    assert.match(c.detail, /United States/);
  }
});

test("a sentence without a country uses the job location and says so", () => {
  const r = screenEligibility({ description: "We are unable to sponsor visas.", location: "Remote - US" }, facts({ authorized_in: ["United States"] }));
  assert.equal(r.checks[0].verdict, "meets");
  assert.match(r.checks[0].detail, /job location \(United States\) is used/);

  const nowhere = screenEligibility({ description: "We are unable to sponsor visas." }, facts({ authorized_in: ["United States"], needs_sponsorship: true }));
  assert.equal(nowhere.checks[0].verdict, "unknown", "no country anywhere is never a fail");
});

test("an offer of sponsorship meets without relying on a profile fact", () => {
  const r = screenEligibility({ description: "Visa sponsorship is available.", location: "London, UK" }, facts());
  assert.deepEqual(only(r, "sponsorship").map((c) => [c.verdict, c.basis.length]), [["meets", 0]]);
});

test("location compares the posting's countries with location.country", () => {
  const jd = { description: "You must be based in Spain or Portugal." };
  assert.equal(screenEligibility(jd, facts({ country: "Portugal" })).checks[0].verdict, "meets");
  const away = screenEligibility(jd, facts({ country: "Germany" })).checks[0];
  assert.equal(away.verdict, "does_not_meet");
  assert.deepEqual(away.basis, ["location.country"]);
  assert.match(away.detail, /Relocating may still be possible/);
  assert.equal(screenEligibility(jd, facts()).checks[0].verdict, "unknown");
  assert.equal(screenEligibility({ description: "You must be based within commuting distance of Lisbon." }, facts({ country: "Portugal" })).checks[0].verdict, "unknown");
  assert.equal(
    screenEligibility({ description: "You must be based in Lisbon.", location: "Lisbon, Portugal" }, facts({ country: "Germany" })).checks[0].verdict,
    "unknown",
    "a location requirement uses the sentence's own countries, not the job location",
  );
});

test("citizenship, clearance, language and degree are always quoted as unknown", () => {
  const r = screenEligibility(
    { description: "Must hold an active security clearance.\nFluent German is required.\nMaster's degree in Physics." },
    facts({ country: "Germany", authorized_in: ["Germany"], needs_sponsorship: false }, { years_of_experience: 10 }),
  );
  assert.equal(r.outcome, "needs_review");
  assert.deepEqual(r.checks.map((c) => [c.kind, c.verdict]), [
    ["citizenship_or_clearance", "unknown"],
    ["language", "unknown"],
    ["degree", "unknown"],
  ]);
});

const stated = (min, quote, confident = true) => ({
  status: "stated",
  min,
  max: null,
  confident,
  display: `${min}+`,
  mentions: [{ floor: min, ceiling: null, kind: "required", scope: "overall", degreeAlt: false, quote }],
});

test("years of experience use the parser result the caller passes in", () => {
  const jd = { description: "5+ years of backend work." };
  const years = stated(5, "5+ years of backend work.");
  assert.deepEqual(only(screenEligibility(jd, facts({}, { years_of_experience: 6 }), { years }), "experience_years").map((c) => c.verdict), ["meets"]);
  const low = only(screenEligibility(jd, facts({}, { years_of_experience: 3 }), { years }), "experience_years")[0];
  assert.equal(low.verdict, "does_not_meet");
  assert.deepEqual(low.basis, ["candidate.years_of_experience"]);
  assert.equal(only(screenEligibility(jd, facts({}, { years_of_experience: 3 }), { years: stated(5, "about 5 years", false) }), "experience_years")[0].verdict, "unknown");
  assert.equal(only(screenEligibility(jd, facts(), { years }), "experience_years")[0].verdict, "unknown");
  assert.deepEqual(only(screenEligibility(jd, facts(), {}), "experience_years"), [], "no parser result, no years check");
  assert.deepEqual(only(screenEligibility(jd, facts(), { years: { status: "preferred-only", min: 5, mentions: [] } }), "experience_years"), []);
});

test("outcomes follow from the checks, and nothing found is not eligible", () => {
  assert.equal(eligibilityOutcome([]), "no_requirements");
  assert.equal(eligibilityOutcome([{ verdict: "meets" }]), "eligible");
  assert.equal(eligibilityOutcome([{ verdict: "meets" }, { verdict: "unknown" }]), "needs_review");
  assert.equal(eligibilityOutcome([{ verdict: "unknown" }, { verdict: "does_not_meet" }]), "blocked");
  assert.deepEqual(screenEligibility({ description: "We build tools for small shops." }, facts()), { outcome: "no_requirements", checks: [] });
});

test("evidence is the posting's own sentence, capped, and repeated sentences are checked once", () => {
  const long = `You must be authorized to work in Germany ${"and keep it current ".repeat(40)}.`;
  const r = screenEligibility({ description: `${long}\n${long}` }, facts({ authorized_in: ["Germany"] }));
  assert.equal(r.checks.length, 1);
  assert.equal(r.checks[0].evidence.length, 400);
  assert.ok(long.startsWith(r.checks[0].evidence.slice(0, 50)));
});

test("job locations accept a bare US but not the word us", () => {
  assert.deepEqual(jobCountries("Remote - US"), ["united states"]);
  assert.deepEqual(jobCountries("Berlin, Germany"), ["germany"]);
  assert.deepEqual(jobCountries("Work with us"), []);
});

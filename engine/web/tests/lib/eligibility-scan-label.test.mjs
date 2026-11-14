// The `elig:` segment a scan writes on each new pipeline row: which text it
// screens and how the result reads. Fictional postings and profiles only.
import test from "node:test";
import assert from "node:assert/strict";
import { eligibilityFacts } from "../../src/lib/eligibility/screen.mjs";
import { eligibilitySegmentBody, screenScanOffer, summarizeScanEligibility, SCAN_TEXT_CAP } from "../../src/lib/eligibility/scan-label.mjs";

const NEEDS_SPONSORSHIP = eligibilityFacts({ location: { authorized_in: ["Germany"], needs_sponsorship: true, country: "Germany" }, candidate: { years_of_experience: 6 } });
const AUTHORIZED_UK = eligibilityFacts({ location: { authorized_in: ["United Kingdom"], needs_sponsorship: false }, candidate: { years_of_experience: 6 } });

const REFUSES = "Fictional Co is hiring an analyst.\nCandidates must have the right to work in the UK.\nWe are unable to sponsor visas.";

test("a refusal to sponsor someone who needs it is blocked, with the kind named", () => {
  const r = screenScanOffer({ fullText: REFUSES, location: "London, United Kingdom" }, NEEDS_SPONSORSHIP);
  assert.equal(r.outcome, "blocked");
  assert.equal(r.source, "ats");
  assert.equal(r.label, "blocked (work authorization, sponsorship)");
});

test("requirements the profile cannot settle are left for review, by kind", () => {
  const r = screenScanOffer({ fullText: "Fluent German is required.\nA Bachelor's degree in Economics is required." }, AUTHORIZED_UK);
  assert.equal(r.outcome, "needs_review");
  assert.equal(r.label, "review (language, degree)");
});

test("the full description wins over the listing, which is used only without it", () => {
  const listing = "Short teaser. Fluent German is required.";
  assert.equal(screenScanOffer({ fullText: REFUSES, listing, location: "London, United Kingdom" }, AUTHORIZED_UK).label, "eligible");
  const fromListing = screenScanOffer({ fullText: null, listing, location: "London" }, AUTHORIZED_UK);
  assert.equal(fromListing.source, "listing");
  assert.equal(fromListing.label, "review (language) from listing");
  assert.equal(screenScanOffer({ fullText: "   ", listing }, AUTHORIZED_UK).source, "listing");
});

test("a listing is capped like the experience filter caps it", () => {
  const long = `${"a".repeat(SCAN_TEXT_CAP)}\nFluent German is required.`;
  assert.equal(screenScanOffer({ listing: long }, AUTHORIZED_UK).label, "none found from listing");
});

test("no text at all is unread, and no requirement is 'none found', never eligible", () => {
  assert.deepEqual(screenScanOffer({ fullText: null, listing: undefined }, AUTHORIZED_UK), { outcome: null, source: null, label: "unread" });
  assert.equal(screenScanOffer({ fullText: "We build fictional widgets with a friendly team." }, AUTHORIZED_UK).label, "none found");
  assert.equal(eligibilitySegmentBody(null, null), "unread");
});

test("an empty profile never blocks: every requirement is for review", () => {
  const r = screenScanOffer({ fullText: REFUSES, location: "London" }, eligibilityFacts({}));
  assert.notEqual(r.outcome, "blocked");
});

test("the summary counts each outcome, unread included", () => {
  assert.deepEqual(summarizeScanEligibility([{ outcome: "blocked" }, { outcome: "blocked" }, { outcome: "needs_review" }, { outcome: null }]), {
    blocked: 2,
    needs_review: 1,
    eligible: 0,
    no_requirements: 0,
    unread: 1,
  });
});

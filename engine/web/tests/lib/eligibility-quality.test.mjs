// Posting-quality signals for the scan's `qual:` segment: stated pay, age and
// cross-listing. Fictional sentences only.
import test from "node:test";
import assert from "node:assert/strict";
import { postingAgeDays, postingQuality, qualitySegmentBody, statesPay, summarizeQuality, STALE_DAYS } from "../../src/lib/eligibility/quality.mjs";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 14);

test("a stated pay figure is found in common wordings", () => {
  for (const s of [
    "The salary range for this role is $120,000 - $150,000.",
    "Base pay: £55k–£65k depending on experience.",
    "€60.000 – €75.000 brutto pro Jahr.",
    "Compensation: USD 140k plus equity.",
    "This role pays $45/hr.",
    "We offer a salary of 52 000 EUR per year.",
    "$95,000 to $120,000 USD annually",
    "Hourly rate: $30 - $40",
  ]) {
    assert.equal(statesPay(s), true, s);
  }
});

test("company money, perks and vague pay are not a stated pay figure", () => {
  for (const s of [
    "We raised $50M in our Series B.",
    "Our ARR passed $10 million last year.",
    "You get a $1,500 learning budget every year.",
    "Competitive salary and benefits.",
    "Salary is competitive and depends on experience.",
    "We have 5,000 customers in 40 countries.",
    "401(k) matching up to 4%.",
    "A €500 home-office allowance.",
    "Founded in 2015, we have 200 employees.",
  ]) {
    assert.equal(statesPay(s), false, s);
  }
});

test("age is whole days from the posted date, and unknown or future dates are null", () => {
  assert.equal(postingAgeDays(NOW - 42 * DAY, NOW), 42);
  assert.equal(postingAgeDays(NOW - DAY / 2, NOW), 0);
  assert.equal(postingAgeDays(undefined, NOW), null);
  assert.equal(postingAgeDays(NOW + 3 * DAY, NOW), null);
  assert.equal(postingAgeDays("2026-01-01", NOW), null);
});

test("provider salary wins, then the full text, then the listing, which says so", () => {
  assert.equal(postingQuality({ salary: { min: 90000, max: 110000, currency: "USD" }, fullText: "No figures here." }, NOW).label, "pay stated");
  assert.equal(postingQuality({ salary: { min: 0 }, fullText: "Base salary: $100k–$120k." }, NOW).paySource, "ats");
  assert.equal(postingQuality({ fullText: "We build fictional widgets.", listing: "Pay: $100k-$120k" }, NOW).label, "no pay found");
  assert.equal(postingQuality({ listing: "We build fictional widgets." }, NOW).label, "no pay found in listing");
  assert.equal(postingQuality({}, NOW).label, "pay unread");
});

test("age is named only when stale, and a cross-listing is named", () => {
  const fresh = postingQuality({ fullText: "Salary: €50k–€60k.", postedAt: NOW - 5 * DAY }, NOW);
  assert.equal(fresh.label, "pay stated");
  const old = postingQuality({ fullText: "We build fictional widgets.", postedAt: NOW - STALE_DAYS * DAY, crossListed: true }, NOW);
  assert.equal(old.label, `no pay found, ${STALE_DAYS}d old, cross-listed`);
  assert.equal(qualitySegmentBody({ pay: true, paySource: "provider", ageDays: 400, crossListed: false }), "pay stated, 400d old");
});

test("the summary counts each signal", () => {
  const rs = [
    postingQuality({ fullText: "Salary: $100k-$120k.", postedAt: NOW - 40 * DAY }, NOW),
    postingQuality({ listing: "Nothing.", crossListed: true }, NOW),
    postingQuality({}, NOW),
  ];
  assert.deepEqual(summarizeQuality(rs), { payStated: 1, noPay: 1, payUnread: 1, stale: 1, crossListed: 1 });
});

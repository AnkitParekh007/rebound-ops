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
    "Salary of approximately $90k.",
    "OTE £70k.",
    "Salary: up to £70k.",
    "Base pay: from $85,000.",
    "$100,000 per year plus a $2,000 learning budget.",
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
    "Competitive salary plus a $1,500 learning budget.",
    "Competitive salary and a $2,000 home-office setup.",
    "Great pay, and $500 towards your first conference.",
    "We provide a $2,000 per year learning budget.",
    "A $100 a month phone allowance.",
    "Annual revenue from enterprise software subscriptions reached $100,000,000 per year.",
    "Founded in 2015, we have 200 employees.",
  ]) {
    assert.equal(statesPay(s), false, s);
  }
});

// Wording families the pay corpus (evals/pay) found missing or misread. These
// paraphrases are kept out of the corpus, so they check each family, not the
// corpus rows.
test("pay wording families found by the corpus are read as pay", () => {
  for (const s of [
    // weekly rates and /annum
    "Locum contract paying $3,100 per week plus housing.",
    "$2,800/wk travel contract",
    "Weekly rate: $1,950",
    "£52,500/annum plus pension.",
    // a pay word, a few words, then a linking verb
    "The base salary for candidates in Washington is $104,000.",
    "Your starting salary would be £36,500.",
    "The hourly wage for this shift starts at $23.40.",
    "Total cash: $210,000 at target.",
    // pay qualifiers after the figure
    "Up to £60,000 depending on experience",
    "NZD 95k + KiwiSaver, DOE",
    "AUD 145,000 + superannuation",
    // figures with no currency that can only be pay
    "Salary 40-48k",
    "CTC: 9.5-14 LPA",
    // German, Portuguese, French and Spanish wording
    "Gehalt: 5.100 € brutto pro Monat",
    "Salário: R$ 6.500 por mês",
    "Salaire : 48 000 € brut annuel",
    "MXN 38,000 mensuales",
    "PLN 15 000 – 21 000 brutto (UoP) or B2B",
    // company money in another clause of the same sentence
    "We raised $25M last year, and the salary for this role is $130k to $150k.",
    "Our app has 3 million users, and this job pays $88,000 per year.",
    // words near company money that are not company money
    "Cost-of-living adjusted salary: $90,000",
    "As part of our hiring process, the salary range is $90,000–$110,000.",
  ]) {
    assert.equal(statesPay(s), true, s);
  }
});

test("perk stipends, prices, billing and volumes with a period are not pay", () => {
  for (const s of [
    "Fitness stipend: $50/month.",
    "Mobile phone stipend of $40 per month.",
    "Internet stipend up to $60/month.",
    "Coworking stipend of €200 per month.",
    "Transit passes worth $120 per month are covered.",
    "Lunch vouchers worth €10 per day.",
    "Tuition support of up to $4,000 per year.",
    "Childcare vouchers up to £250 a month.",
    "Parking is available at $8 a day.",
    "We match charitable donations up to $500 a year.",
    "Our software costs $15 per user per month.",
    "Seats cost $20 per month after the trial.",
    "Licences are priced at €900 per year.",
    "Our lawyers bill at $400 an hour.",
    "Our clients pay $50 an hour for support.",
    "The team closes deals between $10k and $80k.",
    "Members save $200 per year on average.",
    "We handle $3,000,000 in payments per day.",
    "Our B2B platform processes €5,000,000 per month.",
    "Quota: $900k ARR per year.",
    "Competitive salary plus a learning budget of $1,500.",
    "Salary reviews happen twice a year, and the bonus pool is $2M.",
    "Salary benchmarking for 3,000 roles in 12 countries.",
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

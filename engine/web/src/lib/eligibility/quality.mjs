/**
 * Posting-quality signals for the `qual:` segment a scan writes on each new
 * pipeline row (operations feature #3, behind the `eligibilityScreening` flag).
 *
 * Three signals, all deterministic and all from data the scan already has (no
 * extra request):
 *   - pay: does the provider's salary or the posting text state a pay figure?
 *   - age: is the posting at least STALE_DAYS old by its own posted date?
 *   - repost: does its text match a different company's recent posting
 *     (the scan's cross-listing fingerprint check)?
 * Labels only: nothing is dropped, hidden or reordered. Pure: the scan passes
 * in the text, the dates and the cross-listing result.
 */
import { sentences } from "./screen.mjs";

/** A posting this many days old or more is labelled with its age. */
export const STALE_DAYS = 30;

const CURRENCY = String.raw`(?:[$£€¥₹]|\b(?:USD|EUR|GBP|CAD|AUD|NZD|CHF|SGD|INR|JPY|SEK|NOK|DKK|PLN|ZAR|BRL|MXN)\b)`;
// 120,000 / 120.000 / 120 000 / 120k / 85 / 45.50
const AMOUNT = String.raw`\d{1,3}(?:[.,  ]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d+)?\s?[kK]\b|\d{2,}(?:[.,]\d{1,2})?`;
const MONEY = String.raw`(?:${CURRENCY}\s?(?:${AMOUNT})|(?:${AMOUNT})\s?${CURRENCY})`;
const MONEY_RE = new RegExp(MONEY, "i");
const RANGE_RE = new RegExp(
  String.raw`(?:${CURRENCY}\s?)?(?:${AMOUNT})\s?(?:${CURRENCY})?\s*(?:-|–|—|to|and)\s*(?:${CURRENCY}\s?)?(?:${AMOUNT})\s?(?:${CURRENCY})?`,
  "i",
);
// The figure must belong to the pay wording: right after it ("salary of
// $90k", "Base pay: £55k", "rate: $30"), or carry its own period ("$45/hr",
// "52 000 EUR per year"). A pay word elsewhere in the sentence does not make an
// unrelated amount pay ("competitive salary plus a $1,500 learning budget").
const PAY_WORD = String.raw`(?:salary|salaries|pay|compensation|base(?:\s+(?:pay|salary))?|wages?|ote|on-target\s+earnings|(?:hourly|day)\s+rate|rate|stipend)`;
const PAY_THEN_MONEY = new RegExp(
  // Punctuation and qualifiers are separate, so "Salary: up to £70k" reads.
  String.raw`\b${PAY_WORD}\b(?:\s+(?:range|band))?\s*(?:[:=–—-]\s*)?(?:(?:is|of|from|between|up\s+to|starting\s+(?:at|from)|at|approximately|about|around|roughly)\s+)*${MONEY}`,
  "i",
);
const MONEY_PER_PERIOD = new RegExp(
  String.raw`${MONEY}(?:\s*(?:-|–|—|to)\s*${MONEY})?\s*(?:\/\s?(?:yr|year|hr|hour|h|mo|month|day)\b|(?:per|a|an)\s+(?:year|annum|hour|month|day)\b|annually\b|p\.?a\.?(?=\s|$|[,.;]))`,
  "i",
);
// Company money and perks, not the person's pay.
const NOT_PAY = /\b(?:raised|funding|funded|series\s+[a-f]\b|valuation|valued|revenue|arr|investors?|investment|million|billion|customers|users|budget|allowance|reimburse\w*|bonus\s+pool)\b|\d\s?(?:m|bn|b)\b/i;

/**
 * Whether an amount with its own period is pay: "$2,000 per year learning
 * budget" is a perk, but in "$100,000 per year plus a $2,000 learning budget"
 * the budget belongs to the second amount. So the perk words are looked for
 * only around each period amount, from the previous amount (or the sentence
 * start) to the next one (or the sentence end).
 * @param {string} s one sentence
 */
function periodAmountIsPay(s) {
  const amounts = [...s.matchAll(new RegExp(MONEY, "gi"))].map((m) => ({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
  for (const m of s.matchAll(new RegExp(MONEY_PER_PERIOD.source, "gi"))) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const prev = amounts.filter((a) => a.end <= start).at(-1);
    const next = amounts.find((a) => a.start >= end);
    const before = s.slice(prev ? prev.end : 0, start);
    const after = s.slice(end, next ? next.start : s.length);
    if (!NOT_PAY.test(`${before}${m[0]}${after}`)) return true;
  }
  return false;
}

/**
 * Whether a posting text states a pay figure: an amount tied to pay wording,
 * an amount with its own pay period, or a currency range in a sentence that
 * is not about company money or perks.
 * @param {string | null | undefined} text
 */
export function statesPay(text) {
  for (const s of sentences(String(text ?? ""))) {
    if (!MONEY_RE.test(s)) continue;
    if (PAY_THEN_MONEY.test(s)) return true;
    if (periodAmountIsPay(s)) return true;
    const range = RANGE_RE.exec(s);
    if (range && new RegExp(CURRENCY, "i").test(range[0]) && !NOT_PAY.test(s)) return true;
  }
  return false;
}

/**
 * Whole days between a posted date (epoch ms) and now, or null when unknown,
 * in the future or implausible.
 * @param {unknown} postedAt
 * @param {number} now epoch ms
 */
export function postingAgeDays(postedAt, now) {
  if (typeof postedAt !== "number" || !Number.isFinite(postedAt) || postedAt <= 0) return null;
  const days = Math.floor((now - postedAt) / 86_400_000);
  return days >= 0 && days < 36_500 ? days : null;
}

/**
 * The `qual:` segment body, for example "no pay found, 42d old, cross-listed"
 * or "pay stated". Pay is always named; age only when stale; repost only when
 * matched. A pay reading from the listing alone says so ("in listing").
 * @param {{ pay: boolean, paySource: "provider" | "ats" | "listing" | null, ageDays: number | null, crossListed: boolean }} q
 */
export function qualitySegmentBody({ pay, paySource, ageDays, crossListed }) {
  const parts = [];
  if (pay) parts.push("pay stated");
  else if (paySource === null) parts.push("pay unread");
  else parts.push(paySource === "listing" ? "no pay found in listing" : "no pay found");
  if (ageDays !== null && ageDays >= STALE_DAYS) parts.push(`${ageDays}d old`);
  if (crossListed) parts.push("cross-listed");
  return parts.join(", ");
}

/**
 * Quality signals for one new offer.
 * @param {{ salary?: unknown, fullText?: string | null, listing?: unknown, postedAt?: unknown, crossListed?: boolean }} offer
 *   `fullText`: the ATS description the experience filter fetched, if any.
 * @param {number} now epoch ms
 */
export function postingQuality({ salary, fullText, listing, postedAt, crossListed = false }, now) {
  const providerPay =
    salary !== null && typeof salary === "object" && [/** @type {any} */ (salary).min, /** @type {any} */ (salary).max].some((n) => Number.isFinite(n) && n > 0);
  const full = typeof fullText === "string" ? fullText.trim() : "";
  const fromListing = typeof listing === "string" ? listing.slice(0, 60_000).trim() : "";
  /** @type {"provider" | "ats" | "listing" | null} */
  let paySource = null;
  let pay = false;
  if (providerPay) {
    pay = true;
    paySource = "provider";
  } else if (full) {
    pay = statesPay(full);
    paySource = "ats";
  } else if (fromListing) {
    pay = statesPay(fromListing);
    paySource = "listing";
  }
  const ageDays = postingAgeDays(postedAt, now);
  const signals = { pay, paySource, ageDays, crossListed: Boolean(crossListed) };
  return { ...signals, label: qualitySegmentBody(signals) };
}

/**
 * Counts for the scan's summary line.
 * @param {{ pay: boolean, paySource: string | null, ageDays: number | null, crossListed: boolean }[]} results
 */
export function summarizeQuality(results) {
  const c = { payStated: 0, noPay: 0, payUnread: 0, stale: 0, crossListed: 0 };
  for (const r of results) {
    if (r.pay) c.payStated += 1;
    else if (r.paySource === null) c.payUnread += 1;
    else c.noPay += 1;
    if (r.ageDays !== null && r.ageDays >= STALE_DAYS) c.stale += 1;
    if (r.crossListed) c.crossListed += 1;
  }
  return c;
}

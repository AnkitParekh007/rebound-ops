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
// $90k", "Base pay: £55k", "rate: $30"), a few words later through a linking
// verb ("the salary for this role is $88k", "your base salary will be $128k"),
// or carry its own period or pay qualifier ("$45/hr", "$2,400 per week",
// "€4.200 brutto", "Up to $85,000 DOE"). A pay word elsewhere in the sentence
// does not make an unrelated amount pay ("competitive salary plus a $1,500
// learning budget").
//
// A stipend is pay ("Stipend: $3,000/month for the fellowship") unless a perk
// names it ("Wellness stipend: $100/month", "home office stipend of $500").
const PERK = String.raw`(?:wellness|office|work|internet|phone|mobile|learning|education|gym|fitness|commuter|commuting|meal|lunch|coworking|equipment|tech|technology|health|travel|setup|book|childcare|transit|transport|remote)`;
const PERK_STIPEND = String.raw`(?<!\b${PERK}[\s-]+)stipend`;
// The same check for an amount with a period: "Remote work stipend of $75 per month".
const PERK_NAMED_STIPEND = new RegExp(String.raw`\b${PERK}[\s-]+stipends?\b`, "i");
const PAY_WORD = String.raw`(?:salary|salaries|pay|pays|compensation|base(?:\s+(?:pay|salary))?|wages?|ote|on-target\s+earnings|(?:hourly|day)\s+rate|rate|${PERK_STIPEND}|total\s+(?:target\s+)?cash|ctc)`;
const QUALIFIERS = String.raw`(?:(?:is|of|from|between|up\s+to|starting\s+(?:at|from)|at|approximately|about|around|roughly)\s+)*`;
const PAY_THEN_MONEY = new RegExp(
  // Punctuation and qualifiers are separate, so "Salary: up to £70k" reads.
  String.raw`\b${PAY_WORD}\b(?:\s+(?:range|band))?\s*(?:[:=–—-]\s*)?${QUALIFIERS}${MONEY}`,
  "gi",
);
// "The annual salary for this role starts at $58,000", "your salary would be
// £36,500": up to five words between the pay word and a linking verb. The gap
// is checked in code for conjunctions and company money, so "salary plus a
// learning budget of $1,500" is not pay.
const PAY_LINK_MONEY = new RegExp(
  String.raw`\b${PAY_WORD}\b((?:\s+[\p{L}'’-]+){0,5}?)\s+(?:is|are|will\s+be|would\s+be|starts?\s+at|ranges?\s+from|between|of)\s+${QUALIFIERS}${MONEY}`,
  "giu",
);
const GAP_BREAK = /\b(?:plus|and|with|or|but|also|including|includes?|towards?|for\s+(?:your|our|the\s+team))\b/i;
// Periods and pay qualifiers after an amount, in English and in the posting
// languages the corpus covers (German, French, Spanish, Portuguese).
const PERIOD = String.raw`(?:\/\s?(?:yr|year|annum|hr|hour|h|mo|month|wk|week|day)\b|(?:per|a|an)\s+(?:year|annum|hour|month|week|day)\b|annually\b|p\.?a\.?(?=\s|$|[,.;])|pro\s+(?:Jahr|Monat|Stunde)\b|jährlich\b|monatlich\b|par\s+(?:an|mois|heure|jour)\b|annuel(?:le)?\b|mensuel(?:le)?\b|por\s+(?:mês|mes|año|ano|hora)\b|al\s+(?:año|mes)\b|anuales\b|mensuales\b)`;
const GROSS = String.raw`(?:gross|brutto|brut|bruto|brutos|brutas|netto)\b`;
const PAY_TAIL = String.raw`(?:\s*(?:${GROSS}\s*)?${PERIOD}|\s*(?:${GROSS}|DOE\b|depending\s+on\s+experience\b|\+\s*(?:super(?:annuation)?|kiwisaver)\b|pro\s+rata\b))`;
// The range word "a" is Portuguese and Spanish ("R$ 8.000 a R$ 10.000 por mês");
// both sides must carry a currency.
const MONEY_PER_PERIOD = new RegExp(String.raw`${MONEY}(?:\s*(?:-|–|—|to|a)\s*${MONEY})?${PAY_TAIL}`, "gi");
// A figure with no currency is pay only in the forms that cannot be anything
// else: "12-18 LPA" (lakh per annum), or a "k" figure right after a pay word
// ("Salary 55-65k").
const NO_CURRENCY_PAY = new RegExp(
  String.raw`\b\d+(?:\.\d+)?\s*(?:(?:-|–|to)\s*\d+(?:\.\d+)?\s*)?(?:LPA|lakhs?\s+per\s+annum)\b|\b${PAY_WORD}\b\s*[:=]?\s*\d+(?:\.\d+)?\s*[kK]?\s*(?:-|–|to)\s*\d+(?:\.\d+)?\s*[kK]\b`,
  "i",
);
// Company money, perks and prices, not the person's pay. "\d B" needs no
// letter before the digit, so "B2B" is not "2B" (two billion).
const NOT_PAY =
  /\b(?:raised|funding|funded|series\s+[a-f]\b|valuation|valued|revenue|arr|investors?|investment|million|billion|customers|users|budget|allowance|reimburse\w*|bonus\s+pool|commuter|transit|childcare|meals?|vouchers?|gym|wellness|tuition|relocation|donations?|parking|mileage|fund|costs?(?![\s-]+of[\s-]+living)|priced|pricing|prices?|retails?|bill(?:s|ed)?|clients?|fees?|transactions?|processes|processed|processing|payments|orders|gmv|deals?|contract\s+value|deal\s+size|saves?|saved|recover\w*)\b|(?<![\p{L}\d.,])\d+(?:[.,]\d+)?\s?(?:m|bn|b)\b/iu;
// Where a clause starts: before an amount, only its own clause is read, so
// "We serve 2 million users, and this role pays $90,000 a year" is pay. A colon
// is not a break: the label before it says what the amount is ("Phone
// allowance: £30/month").
const CLAUSE_BREAK = /[,;()]|\band\b|\bbut\b/gi;

/** The text of `s` before `start`, back to the previous amount or clause break. */
function clauseBefore(s, start, amounts) {
  const prev = amounts.filter((a) => a.end <= start).at(-1);
  const window = s.slice(prev ? prev.end : 0, start);
  const last = [...window.matchAll(CLAUSE_BREAK)].at(-1);
  return last ? window.slice((last.index ?? 0) + last[0].length) : window;
}

/** The text of `s` after `end`, up to the next amount or clause break. */
function clauseAfter(s, end, amounts) {
  const next = amounts.find((a) => a.start >= end);
  const rest = s.slice(end, next ? next.start : s.length);
  const brk = rest.search(/[,;()]|\bbut\b/i);
  return brk === -1 ? rest : rest.slice(0, brk);
}

/**
 * Whether one matched amount (with its period, range or pay wording) is pay:
 * its own clause, from the previous amount to the next one, names no company
 * money, perk or price. In "$100,000 per year plus a $2,000 learning budget"
 * the budget belongs to the second amount.
 */
function matchIsPay(s, start, end, amounts) {
  const clause = `${clauseBefore(s, start, amounts)}${s.slice(start, end)}${clauseAfter(s, end, amounts)}`;
  return !NOT_PAY.test(clause) && !PERK_NAMED_STIPEND.test(clause);
}

/** Longest quote the report page shows for a pay sentence. */
const MAX_PAY_EVIDENCE = 300;

/**
 * Whether a posting text states a pay figure: an amount tied to pay wording,
 * an amount with its own pay period or qualifier, a currency range, or a
 * figure in a form that is always pay ("12-18 LPA"), when its clause is not
 * about company money, perks or prices.
 * @param {string | null | undefined} text
 */
export function statesPay(text) {
  return payEvidence(text) !== null;
}

/**
 * The first sentence of a posting text that states a pay figure (cut to
 * MAX_PAY_EVIDENCE characters), or null when none does. Same rules as
 * `statesPay`.
 * @param {string | null | undefined} text
 * @returns {string | null}
 */
export function payEvidence(text) {
  for (const s of sentences(String(text ?? ""))) {
    if (sentenceStatesPay(s)) return s.length > MAX_PAY_EVIDENCE ? s.slice(0, MAX_PAY_EVIDENCE) : s;
  }
  return null;
}

/** @param {string} s one sentence */
function sentenceStatesPay(s) {
  if (NO_CURRENCY_PAY.test(s)) return true;
  if (!MONEY_RE.test(s)) return false;
  const amounts = [...s.matchAll(new RegExp(MONEY, "gi"))].map((m) => ({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
  for (const m of s.matchAll(PAY_THEN_MONEY)) {
    const start = m.index ?? 0;
    // "Customers pay $99 a month": the pay word's own clause decides.
    if (!NOT_PAY.test(clauseBefore(s, start, amounts))) return true;
  }
  for (const m of s.matchAll(PAY_LINK_MONEY)) {
    const start = m.index ?? 0;
    if (!GAP_BREAK.test(m[1]) && !NOT_PAY.test(m[1]) && !NOT_PAY.test(clauseBefore(s, start, amounts))) return true;
  }
  for (const m of s.matchAll(MONEY_PER_PERIOD)) {
    const start = m.index ?? 0;
    if (matchIsPay(s, start, start + m[0].length, amounts)) return true;
  }
  for (const m of s.matchAll(new RegExp(RANGE_RE.source, "gi"))) {
    const start = m.index ?? 0;
    if (new RegExp(CURRENCY, "i").test(m[0]) && matchIsPay(s, start, start + m[0].length, amounts)) return true;
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

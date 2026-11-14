/**
 * screen.mjs: eligibility screening for one job posting (operations feature
 * #3, flag `eligibilityScreening`, release R2).
 *
 * It finds the hard requirements a posting states (work authorization, visa
 * sponsorship, citizenship or security clearance, where the person must live,
 * languages, degrees, years of experience) and checks each one against the
 * person's reviewed profile facts. No model is involved, and nothing is
 * inferred that the profile does not say:
 *
 * - Every check quotes the posting sentence it is about, so the person can
 *   judge it.
 * - `meets` and `does_not_meet` come only from profile facts, and each names
 *   the profile keys it used (`basis`). A country missing from
 *   `location.authorized_in` is not read as "not authorized" on its own; that
 *   takes `location.needs_sponsorship: true` as well, the same rule the
 *   Autofill profile answers use (../apply/profile-facts.mjs).
 * - Citizenship, clearance, language and degree requirements have no profile
 *   fact yet, so they are always `unknown` and quoted for the person.
 * - A report never hides, drops or ranks a job. It is information.
 *
 * Years of experience come from the engine's existing parser
 * (engine/jd-years.mjs `parseYearsRequirement`), which the caller passes in as
 * `options.years`: that module pulls in engine dependencies this one must not
 * need, so the screen stays runnable from the repository root tests.
 *
 * The vocabulary is mirrored from @reboundops/contracts
 * (packages/contracts/src/operations/eligibility.ts); tests/operations-parity.test.mjs
 * fails if the two drift. Plain .mjs so `node --test` runs it without a build.
 */
import { canonicalCountry, countriesInLabel } from "../apply/profile-facts.mjs";

export const ELIGIBILITY_FLAG = "eligibilityScreening";
export const FEATURE_FLAG_ENV = "REBOUNDOPS_FEATURES";

export const ELIGIBILITY_REQUIREMENT_KINDS = Object.freeze([
  "work_authorization",
  "sponsorship",
  "citizenship_or_clearance",
  "location",
  "language",
  "degree",
  "experience_years",
]);
export const UNVERIFIED_REQUIREMENT_KINDS = Object.freeze(["citizenship_or_clearance", "language", "degree"]);
export const ELIGIBILITY_VERDICTS = Object.freeze(["meets", "does_not_meet", "unknown"]);
export const ELIGIBILITY_OUTCOMES = Object.freeze(["blocked", "needs_review", "eligible", "no_requirements"]);

const MAX_EVIDENCE = 400;
const MAX_CHECKS = 50;

/** True only when `eligibilityScreening` is named in REBOUNDOPS_FEATURES. */
export function eligibilityScreeningEnabled(env) {
  const raw = env && typeof env[FEATURE_FLAG_ENV] === "string" ? env[FEATURE_FLAG_ENV] : "";
  return raw.split(",").map((s) => s.trim()).includes(ELIGIBILITY_FLAG);
}

/**
 * @typedef {{
 *   authorizedIn: string[],
 *   needsSponsorship: boolean | null,
 *   country: string | null,
 *   yearsOfExperience: number | null,
 * }} EligibilityFacts
 */

/**
 * The reviewed facts a screen may use, from a parsed profile.yml. Only these
 * keys are read: `location.authorized_in`, `location.needs_sponsorship`,
 * `location.country` and `candidate.years_of_experience`. A malformed
 * profile yields empty facts, so every check comes back `unknown`.
 * @param {unknown} profile
 * @returns {EligibilityFacts}
 */
export function eligibilityFacts(profile) {
  const p = profile && typeof profile === "object" ? /** @type {Record<string, any>} */ (profile) : {};
  const loc = p.location && typeof p.location === "object" ? p.location : {};
  const c = p.candidate && typeof p.candidate === "object" ? p.candidate : {};
  const authorizedIn = Array.isArray(loc.authorized_in)
    ? [...new Set(loc.authorized_in.map(canonicalCountry).filter(Boolean))]
    : [];
  const countryHits = typeof loc.country === "string" ? countriesInLabel(loc.country) : [];
  const years = c.years_of_experience;
  return {
    authorizedIn,
    needsSponsorship: typeof loc.needs_sponsorship === "boolean" ? loc.needs_sponsorship : null,
    country: countryHits.length === 1 ? countryHits[0] : null,
    yearsOfExperience: typeof years === "number" && Number.isFinite(years) && years >= 0 && years <= 60 ? years : null,
  };
}

// --- Finding requirement sentences -------------------------------------------

/** Wording that makes a sentence a preference, not a requirement. */
const PREFERRED = /\b(nice[-\s]to[-\s]have|a\s+plus|a\s+bonus|bonus\s+points|preferred|preferably|ideally|desirable|an\s+advantage|advantageous|not\s+required)\b/i;

const NEG = String.raw`(?:unable\s+to|not\s+able\s+to|are\s+not\s+able\s+to|is\s+not\s+able\s+to|not\s+in\s+a\s+position\s+to|cannot|can\s+not|can't|can’t|won't|won’t|will\s+not|do\s+not|does\s+not|don't|don’t|doesn't|doesn’t)`;
const SPONSOR_REFUSED = new RegExp(
  String.raw`\b(?:no|without)\s+(?:visa\s+|immigration\s+)?sponsorship\b` +
    String.raw`|\b${NEG}\s+(?:be\s+able\s+to\s+)?(?:offer\s+|provide\s+|support\s+)?(?:relocation\s+(?:or|and|nor)\s+)?(?:visa\s+|immigration\s+|work\s+permit\s+)?sponsor(?:ship|s)?\b` +
    String.raw`|\bnot\s+(?:offer|provide|support)(?:ing)?\s+(?:visa\s+|immigration\s+)?sponsorship\b` +
    String.raw`|\bsponsorship\s+(?:is\s+)?(?:not|un)\s*available\b` +
    String.raw`|\bsponsorship\s+(?:isn't|isn’t|will\s+not|won't|won’t|cannot|can\s+not|can't|can’t)\s+(?:be\s+)?(?:provided|offered|available|possible)\b` +
    String.raw`|\b(?:not\s+eligible|ineligible)\s+for\s+(?:visa\s+|immigration\s+)?sponsorship\b` +
    String.raw`|\b(?:do\s+not|does\s+not|don't|don’t|doesn't|doesn’t)\s+(?:require|need)\s+(?:visa\s+|immigration\s+)?sponsorship\b` +
    String.raw`|\b(?:require|requires|requiring|need|needs|needing)\s+(?:visa\s+|immigration\s+)?sponsorship\b[^.]{0,60}\b(?:not\s+(?:be\s+)?(?:eligible|considered)|ineligible)\b` +
    String.raw`|\bpermanent\s+residents\s+only\b`,
  "i",
);
const SPONSOR_OFFERED = new RegExp(
  String.raw`\b(?:visa\s+)?sponsorship\s+(?:is\s+|are\s+|can\s+be\s+|will\s+be\s+)?(?:available|offered|provided|possible)\b` +
    String.raw`|\b(?:we|will|can|happy\s+to|able\s+to)\s+(?:offer|provide|support)s?\s+(?:visa\s+|relocation\s+and\s+visa\s+)?sponsorship\b` +
    String.raw`|\bwe\s+(?:can\s+|will\s+|do\s+)?sponsor\s+(?:[\w-]+\s+){0,3}?(?:visas?|work\s+permits?)\b` +
    String.raw`|\beligible\s+for\s+(?:visa\s+|immigration\s+)?sponsorship\b`,
  "i",
);
const WORK_AUTH = new RegExp(
  String.raw`\b(?:authori[sz]ed|eligible|entitled|permitted|cleared)\s+to\s+work\b` +
    String.raw`|\b(?:valid|current|existing)\s+(?:work\s+(?:permit|visa|authori[sz]ation)|right\s+to\s+work)\b` +
    String.raw`|\bright\s+to\s+work\s+in\b|\bwork[-\s]authori[sz](?:ation|ed)\b|\bauthori[sz]ation\s+to\s+work\b` +
    String.raw`|\blegally\s+(?:able|allowed)\s+to\s+work\b` +
    String.raw`|\b(?:unrestricted|full|valid)\s+work\s+rights\b` +
    String.raw`|\b(?:visa|permit|status)\s+that\s+(?:allows?|permits?)\s+you\s+to\s+work\b`,
  "i",
);
const HELP_OBTAIN = /\b(?:help|assist|support)\w*\s+(?:you\s+)?(?:with\s+|in\s+)?(?:obtain|get|secur)/i;
const CITIZENSHIP_OR_CLEARANCE = new RegExp(
  String.raw`\bcitizens?(?:hip)?\b(?!['’])[^.]{0,40}\b(?:only|required|requirement|must|mandatory|essential)\b` +
    String.raw`|\bmust\s+(?:be|hold)\s+(?:a\s+|an\s+)?[\p{L}.\s]{0,20}citizen(?:s|ship)?\b` +
    String.raw`|\bnationality\b[^.]{0,30}\b(?:only|required|requirement|must|mandatory|essential)\b` +
    String.raw`|\bU\.?S\.?\s+persons?\b` +
    String.raw`|\b(?:security|government|baseline|secret|top\s+secret|ts\/sci|sc|dv|nv1|nv2)\s+clearance\b` +
    String.raw`|\bclearance\s+(?:is\s+)?required\b` +
    String.raw`|\b(?:eligible|able)\s+to\s+(?:obtain|hold)\s+(?:a\s+|an\s+)?(?:active\s+)?(?:security\s+)?clearance\b`,
  "iu",
);
const LOCATION = new RegExp(
  String.raw`\b(?:must|should|need\s+to|required\s+to|have\s+to)\s+(?:currently\s+)?(?:be\s+)?(?:currently\s+)?(?:physically\s+)?(?:based|located|living|live|resid(?:e|ing|ent))\s+(?:in|within)\b` +
    String.raw`|\b(?:candidates|applicants)\s+(?:must\s+be\s+|need\s+to\s+be\s+)?(?:based|located|living|residing)\s+in\b[^.]{0,60}\bonly\b` +
    String.raw`|\bonly\s+(?:candidates|applicants)\s+(?:who\s+(?:are|live)\s+)?(?:based|located|living|residing)\s+in\b` +
    String.raw`|\b(?:can|are)\s+only\s+(?:hire|hiring|employ|employing)\s+(?:people\s+|candidates\s+)?(?:in|within|from)\b(?!-)` +
    String.raw`|\bresidence\s+in\b[^.]{0,40}\b(?:required|only|must|mandatory)\b` +
    String.raw`|\bremote\b[^.]{0,40}\b(?:only|restricted\s+to|limited\s+to)\b` +
    String.raw`|\bopen\s+(?:only\s+)?to\s+(?:candidates|applicants)\s+(?:based|located|residing|living)\s+in\b` +
    String.raw`|\bresidents?\s+of\b[^.]{0,40}\bonly\b`,
  "i",
);
const LANGS = "English|German|French|Spanish|Italian|Portuguese|Dutch|Polish|Swedish|Danish|Norwegian|Finnish|Japanese|Korean|Mandarin|Chinese|Cantonese|Arabic|Hebrew|Hindi|Turkish|Russian|Ukrainian|Czech|Vietnamese|Indonesian|Thai|Greek|Romanian|Hungarian";
const LANGUAGE = new RegExp(
  String.raw`\b(?:fluen(?:t|cy)|native|proficien(?:t|cy)|business[-\s]level|professional\s+(?:working\s+)?proficiency|full\s+professional|(?:C1|C2|B2)(?:\s+level)?(?:\s+(?:of|in))?)\b[^.]{0,40}\b(?:${LANGS})\b` +
    String.raw`|\bmust\s+(?:be\s+able\s+to\s+)?speak\s+(?:and\s+write\s+)?(?:${LANGS})\b` +
    // A language name before "nationals", "citizenship" or "law" names a country or a legal system, not a language.
    String.raw`|\b(?:${LANGS})\b(?!\s+(?:nationals?|nationality|citizens?(?:hip)?|contract|law|employment\s+law)\b)[^.]{0,25}\b(?:fluen(?:t|tly|cy)|native|(?:at\s+)?(?:C1|C2|B2)(?:\s+level)?|required|is\s+a\s+must|mandatory|essential)\b`,
  "i",
);
/** Degree abbreviations, case-sensitive so "ms" or "ba" in prose do not count. */
const DEGREE = /\b(?:BSc|MSc|MBA|PhD|Ph\.D)\b|\b[BM]\.?S\.?(?=\s+(?:in|degree)\b)/;
const DEGREE_CI = /\b(?:bachelor(?:'|’)?s?|masters?\s+degree|master(?:'|’)s|master\s+of|doctorate|postgraduate\s+(?:degree|qualification|diploma)|(?:undergraduate|university|college)\s+degree|degree)\b(?!\s+of\b)/i;
const DEGREE_NOT_HARD = /\bor\s+equivalent\b|\bequivalent\s+(?:practical\s+|work\s+|professional\s+)?experience\b|\bor\s+(?:similar|comparable)\s+experience\b|\b(?:no|not|don't|don’t|do\s+not|doesn't|doesn’t)\b[^.]{0,25}\b(?:degree|require)|\b\d{2,3}[-\s]degree\b/i;

/** Split a posting into trimmed sentences, bullets and headings stripped. */
export function sentences(text) {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n+|(?<=[.!?;])\s+(?=[\p{Lu}\d(])/u)
    .map((s) => s.replace(/^\s*(?:[-*•·▪◦‣]|\d+[.)])\s*/u, "").replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 2);
}

const quote = (s) => (s.length > MAX_EVIDENCE ? s.slice(0, MAX_EVIDENCE) : s);

/**
 * The requirement sentences in a posting, in order. One sentence can state
 * more than one requirement kind. Exported for tests and future callers that
 * only want the quotes.
 * @param {string} text
 * @returns {{ kind: string, stance?: "refused" | "offered", evidence: string }[]}
 */
export function findRequirements(text) {
  /** @type {{ kind: string, stance?: "refused" | "offered", evidence: string }[]} */
  const found = [];
  for (const s of sentences(text)) {
    const preferred = PREFERRED.test(s);
    if (SPONSOR_REFUSED.test(s)) found.push({ kind: "sponsorship", stance: "refused", evidence: quote(s) });
    else if (SPONSOR_OFFERED.test(s)) found.push({ kind: "sponsorship", stance: "offered", evidence: quote(s) });
    if (WORK_AUTH.test(s) && !SPONSOR_OFFERED.test(s) && !HELP_OBTAIN.test(s)) found.push({ kind: "work_authorization", evidence: quote(s) });
    if (CITIZENSHIP_OR_CLEARANCE.test(s) && !preferred) found.push({ kind: "citizenship_or_clearance", evidence: quote(s) });
    if (LOCATION.test(s) && !preferred) found.push({ kind: "location", evidence: quote(s) });
    if (LANGUAGE.test(s) && !preferred) found.push({ kind: "language", evidence: quote(s) });
    if ((DEGREE.test(s) || DEGREE_CI.test(s)) && !preferred && !DEGREE_NOT_HARD.test(s)) found.push({ kind: "degree", evidence: quote(s) });
  }
  return found;
}

// --- Checking requirements against facts --------------------------------------

const BASIS_AUTH = "location.authorized_in";
const BASIS_SPONSOR = "location.needs_sponsorship";
const BASIS_COUNTRY = "location.country";
const BASIS_YEARS = "candidate.years_of_experience";

const title = (c) => c.replace(/\b\p{L}/gu, (ch) => ch.toUpperCase());
const list = (cs) => cs.map(title).join(", ");

/** Countries a job's own location field names; also accepts a bare "US". */
export function jobCountries(location) {
  const text = String(location ?? "");
  const found = countriesInLabel(text);
  if (/(?:^|[^\p{L}])US(?=$|[^\p{L}])/u.test(text) && !found.includes("united states")) found.push("united states");
  return found;
}

/**
 * Is the person free to work in every one of `countries`?
 * @returns {"yes" | "no" | "unknown"}
 */
function authorized(countries, facts) {
  if (countries.length === 0) return "unknown";
  if (countries.every((c) => facts.authorizedIn.includes(c))) return "yes";
  // Absence from authorized_in alone is not "no": the profile must also say
  // the person needs sponsorship where they are not already authorized.
  if (facts.needsSponsorship === true && countries.some((c) => !facts.authorizedIn.includes(c))) return "no";
  return "unknown";
}

function checkAuthorization(req, countries, facts) {
  const named = countries.length ? list(countries) : "";
  const state = authorized(countries, facts);
  if (req.kind === "sponsorship" && req.stance === "offered") {
    return { verdict: "meets", detail: "The posting says it offers visa sponsorship.", basis: [] };
  }
  if (state === "yes") {
    const detail = req.kind === "sponsorship"
      ? `Your profile lists ${named} in authorized_in, so you would not need sponsorship there.`
      : `Your profile lists ${named} in authorized_in.`;
    return { verdict: "meets", detail, basis: [BASIS_AUTH] };
  }
  if (state === "no") {
    const missing = list(countries.filter((c) => !facts.authorizedIn.includes(c)));
    const detail = req.kind === "sponsorship"
      ? `The posting will not sponsor, and your profile says you need sponsorship outside authorized_in, which does not list ${missing}.`
      : `Your profile does not list ${missing} in authorized_in and says you need sponsorship there.`;
    return { verdict: "does_not_meet", detail, basis: [BASIS_AUTH, BASIS_SPONSOR] };
  }
  if (countries.length === 0) {
    return { verdict: "unknown", detail: "The posting does not say which country this applies to, and the job location names none.", basis: [] };
  }
  return {
    verdict: "unknown",
    detail: `Your profile does not list ${named} in authorized_in, and does not say you need sponsorship there (location.needs_sponsorship).`,
    basis: [],
  };
}

function checkLocation(countries, facts) {
  if (countries.length === 0) {
    return { verdict: "unknown", detail: "The posting names a place this screen cannot match to a country (a city, region or time zone).", basis: [] };
  }
  if (!facts.country) {
    return { verdict: "unknown", detail: "Your profile does not set location.country.", basis: [] };
  }
  if (countries.includes(facts.country)) {
    return { verdict: "meets", detail: `Your profile's location.country is ${title(facts.country)}.`, basis: [BASIS_COUNTRY] };
  }
  return {
    verdict: "does_not_meet",
    detail: `The posting asks for someone in ${list(countries)}; your profile's location.country is ${title(facts.country)}. Relocating may still be possible.`,
    basis: [BASIS_COUNTRY],
  };
}

const UNVERIFIED_DETAIL = {
  citizenship_or_clearance: "Your profile has no citizenship or clearance fact, so check this yourself.",
  language: "Your profile has no language-proficiency fact, so check this yourself.",
  degree: "Your profile has no education fact this screen reads, so check this yourself.",
};

/**
 * The years check, from engine/jd-years.mjs `parseYearsRequirement` output.
 * Mirrors its `classifyYears` with no stretch: below the stated floor counts
 * against the person only when the parser was confident.
 */
function checkYears(years, facts) {
  if (!years || years.status !== "stated" || typeof years.min !== "number") return null;
  const mention = Array.isArray(years.mentions)
    ? years.mentions.find((m) => m && typeof m.quote === "string" && m.quote.trim() && m.kind !== "preferred")
    : null;
  if (!mention) return null;
  const evidence = quote(mention.quote.replace(/\s+/g, " ").trim());
  if (facts.yearsOfExperience === null) {
    return { kind: "experience_years", evidence, verdict: "unknown", detail: "Your profile does not set candidate.years_of_experience.", basis: [] };
  }
  if (years.min <= facts.yearsOfExperience) {
    return { kind: "experience_years", evidence, verdict: "meets", detail: `The posting asks for ${years.display} years; your profile says ${facts.yearsOfExperience}.`, basis: [BASIS_YEARS] };
  }
  if (years.confident === true) {
    return { kind: "experience_years", evidence, verdict: "does_not_meet", detail: `The posting asks for ${years.display} years; your profile says ${facts.yearsOfExperience}.`, basis: [BASIS_YEARS] };
  }
  return { kind: "experience_years", evidence, verdict: "unknown", detail: `The posting may ask for ${years.display} years, but its wording is unclear.`, basis: [] };
}

/** The outcome a list of checks implies (mirrors the contract's eligibilityOutcome). */
export function eligibilityOutcome(checks) {
  if (checks.length === 0) return "no_requirements";
  if (checks.some((c) => c.verdict === "does_not_meet")) return "blocked";
  if (checks.some((c) => c.verdict === "unknown")) return "needs_review";
  return "eligible";
}

/**
 * Screen one posting.
 * @param {{ description: string, location?: string }} job
 * @param {EligibilityFacts} facts from eligibilityFacts(profile)
 * @param {{ years?: unknown }} [options] `years`: parseYearsRequirement(description)
 * @returns {{ outcome: string, checks: { kind: string, verdict: string, evidence: string, detail: string, basis: string[] }[] }}
 */
export function screenEligibility(job, facts, options = {}) {
  const fromJob = jobCountries(job?.location);
  const checks = [];
  const seen = new Set();
  const add = (c) => {
    const key = `${c.kind}\u0000${c.evidence}`;
    if (seen.has(key) || checks.length >= MAX_CHECKS) return;
    seen.add(key);
    checks.push(c);
  };

  for (const req of findRequirements(job?.description ?? "")) {
    const named = countriesInLabel(req.evidence);
    const countries = named.length ? named : fromJob;
    let result;
    if (req.kind === "work_authorization" || req.kind === "sponsorship") result = checkAuthorization(req, countries, facts);
    else if (req.kind === "location") result = checkLocation(named, facts);
    else result = { verdict: "unknown", detail: UNVERIFIED_DETAIL[req.kind], basis: [] };
    // Say when the country came from the job's location, not the sentence.
    if (!named.length && fromJob.length && req.kind !== "location" && !(req.kind === "sponsorship" && req.stance === "offered")) {
      result = { ...result, detail: `This sentence names no country, so the job location (${list(fromJob)}) is used. ${result.detail}` };
    }
    add({ kind: req.kind, evidence: req.evidence, ...result });
  }
  const years = checkYears(options.years, facts);
  if (years) add(years);

  return { outcome: eligibilityOutcome(checks), checks };
}

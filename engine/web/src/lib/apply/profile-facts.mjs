/**
 * profile-facts.mjs: deterministic answers from the person's own
 * config/profile.yml, with no model involved (Autofill AF-02, first slice).
 *
 * config/profile.yml is user-authored and authoritative for identity, work
 * authorization and visa facts (engine AGENTS.md, Source-of-Truth Boundary).
 * The owner decided on 12 Nov 2026 that its STRUCTURED fields count as reviewed
 * profile facts. This module reads only an allowlist of keys:
 *
 *   candidate.full_name / email / phone / linkedin / github / portfolio_url / location
 *   location.authorized_in (list of countries) / location.needs_sponsorship (boolean)
 *
 * Never read: compensation.* (salary is always the person's own answer, and
 * `minimum` is a walk-away number a form must never see), location.visa_status
 * (free text), and everything else. `profileFacts` copies only the allowlist,
 * so nothing outside it can reach a form through this path.
 *
 * Authorization answers are conservative by construction:
 * - The question must name exactly one country this module recognises.
 * - "Authorized to work in X?" is answered "Yes" only when X is in
 *   authorized_in. Absence from the list is NOT treated as "No": the list may be
 *   incomplete, so the field is left for the person.
 * - "Require sponsorship in X?" is answered "No" only when X is in
 *   authorized_in and needs_sponsorship is exactly false. Every other case is
 *   left for the person.
 *
 * Plain .mjs so `node --test` loads it with no build step.
 */
import { pickComboboxOption } from "./option-match.mjs";

/** A trimmed string, or "" for anything that is not a string. */
const str = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * Canonical country keys and the label phrases that name them. Short forms
 * that are ordinary English words ("us") are only accepted with an article
 * ("the US") so "work for us" never reads as the United States.
 */
const COUNTRIES = [
  ["united states", /\b(united\s+states(\s+of\s+america)?|the\s+us|the\s+u\.s\.?(a\.?)?|usa|u\.s\.a\.?|u\.s\.)(?=$|[^\p{L}])/iu],
  ["united kingdom", /\b(united\s+kingdom|the\s+uk|uk|u\.k\.|great\s+britain|britain|england|scotland|wales|northern\s+ireland)(?=$|[^\p{L}])/iu],
  ["canada", /\bcanad(a|ian)\b/i],
  ["germany", /\b(germany|deutschland)\b/i],
  ["india", /\bindia\b/i],
  ["ireland", /\bireland\b/i],
  ["netherlands", /\b(the\s+)?netherlands\b|\bholland\b/i],
  ["france", /\bfrance\b/i],
  ["spain", /\bspain\b/i],
  ["australia", /\baustralia\b/i],
  ["new zealand", /\bnew\s+zealand\b/i],
  ["singapore", /\bsingapore\b/i],
  ["united arab emirates", /\b(united\s+arab\s+emirates|the\s+uae|uae)\b/i],
  ["switzerland", /\bswitzerland\b/i],
  ["sweden", /\bsweden\b/i],
  ["poland", /\bpoland\b/i],
  ["portugal", /\bportugal\b/i],
  ["japan", /\bjapan\b/i],
  ["brazil", /\bbrazil\b/i],
  ["mexico", /\bmexico\b/i],
];

/** Countries a label names, canonical keys, in table order, without duplicates. */
export function countriesInLabel(label) {
  const text = String(label ?? "").replace(/\s+/g, " ");
  const found = [];
  for (const [key, re] of COUNTRIES) {
    // Northern Ireland is part of the United Kingdom, not Ireland.
    const subject = key === "ireland" ? text.replace(/\bnorthern\s+ireland\b/gi, "") : text;
    if (re.test(subject) && !found.includes(key)) found.push(key);
  }
  return found;
}

/** Canonical key for a country as the person wrote it in authorized_in. */
export function canonicalCountry(name) {
  const text = str(name);
  if (!text) return "";
  const hits = countriesInLabel(text);
  return hits.length === 1 ? hits[0] : text.toLowerCase();
}

/**
 * @typedef {{
 *   fullName: string, email: string, phone: string, linkedin: string, github: string,
 *   portfolio: string, location: string, authorizedIn: string[], needsSponsorship: boolean | null
 * }} ProfileFacts
 */

/**
 * Copy the allowlisted facts out of a parsed profile.yml. Unknown shapes yield
 * empty facts, never an error: a broken profile must not block a prefill.
 * @param {unknown} profile
 * @returns {ProfileFacts}
 */
export function profileFacts(profile) {
  const p = profile && typeof profile === "object" ? /** @type {Record<string, any>} */ (profile) : {};
  const c = p.candidate && typeof p.candidate === "object" ? p.candidate : {};
  const loc = p.location && typeof p.location === "object" ? p.location : {};
  const authorizedIn = Array.isArray(loc.authorized_in) ? [...new Set(loc.authorized_in.map(canonicalCountry).filter(Boolean))] : [];
  return {
    fullName: str(c.full_name),
    email: str(c.email),
    phone: str(c.phone),
    linkedin: str(c.linkedin),
    github: str(c.github),
    portfolio: str(c.portfolio_url),
    location: str(c.location),
    authorizedIn,
    needsSponsorship: typeof loc.needs_sponsorship === "boolean" ? loc.needs_sponsorship : null,
  };
}

/** Labels that ask about someone other than the candidate. */
const SOMEONE_ELSE = /\b(referr(er|al|ed)|reference|emergency|manager|supervisor|company|employer|recruiter|hiring|school|university|college|spouse|partner|parent|guardian)\b/i;

const IDENTITY = [
  ["email", (f, l) => f.type === "email" || /\be-?mail\b/i.test(l)],
  ["phone", (f, l) => f.type === "tel" || /\b(phone|mobile|cell|telephone)\b/i.test(l)],
  ["linkedin", (_f, l) => /\blinked\s*in\b/i.test(l)],
  ["github", (_f, l) => /\bgit\s*hub\b/i.test(l)],
  ["portfolio", (_f, l) => /\b(portfolio|personal\s+(web\s*site|site)|website)\b/i.test(l)],
  ["fullName", (_f, l) => /^\s*(full\s+|legal\s+|your\s+)?name\s*\*?\s*$/i.test(l)],
  ["firstName", (_f, l) => /\b(first|given)\s+name\b/i.test(l)],
  ["lastName", (_f, l) => /\b(last|family)\s+name\b|\bsurname\b/i.test(l)],
  ["location", (f, l) => (f.type === "text" || !f.type) && /^\s*(current\s+)?(location|city)\s*\*?\s*$/i.test(l)],
];

/** Fit a Yes/No fact to the field: a choice field must offer it as an option. */
function fit(field, value) {
  const options = Array.isArray(field.options) ? field.options : [];
  const choosesOption = field.type === "select" || field.type === "radio" || !!field.combobox;
  if (!choosesOption || options.length === 0) return field.type === "checkbox" ? null : value;
  const i = pickComboboxOption(options, value);
  return i >= 0 ? options[i] : null;
}

/**
 * The deterministic answer for one field, or null when the profile does not
 * settle it. `source` is `profile_fact` for a value copied from the profile and
 * `derived` for first/last name split from a two-word full name.
 * @param {{ type: string, label?: string, options?: string[], combobox?: boolean }} field
 * @param {ProfileFacts} facts
 * @param {string | null} category the field's sensitive category, from answer-policy.mjs
 * @returns {{ value: string, source: "profile_fact" | "derived" } | null}
 */
export function resolveProfileAnswer(field, facts, category) {
  if (!field || !facts) return null;
  const label = String(field.label ?? "").replace(/\s+/g, " ").trim();
  if (!label || field.type === "file") return null;

  if (category === "work_authorization" || category === "sponsorship") {
    const named = countriesInLabel(label);
    if (named.length !== 1) return null;
    const authorized = facts.authorizedIn.includes(named[0]);
    if (category === "work_authorization") {
      if (!authorized) return null;
      const value = fit(field, "Yes");
      return value ? { value, source: "profile_fact" } : null;
    }
    if (!authorized || facts.needsSponsorship !== false) return null;
    const value = fit(field, "No");
    return value ? { value, source: "profile_fact" } : null;
  }
  // Every other sensitive category (salary, citizenship, demographics,
  // attestations, background checks) is always the person's own answer.
  if (category) return null;
  if (SOMEONE_ELSE.test(label)) return null;
  if (field.type !== "text" && field.type !== "email" && field.type !== "tel" && field.type !== "url" && field.type) return null;

  for (const [key, matches] of IDENTITY) {
    if (!matches(field, label)) continue;
    if (key === "firstName" || key === "lastName") {
      const parts = facts.fullName.split(/\s+/).filter(Boolean);
      // Only a plain two-word name splits unambiguously; anything else
      // (middle names, particles, single names) is left for the person.
      if (parts.length !== 2) return null;
      return { value: key === "firstName" ? parts[0] : parts[1], source: "derived" };
    }
    const value = facts[/** @type {keyof ProfileFacts} */ (key)];
    return typeof value === "string" && value ? { value, source: "profile_fact" } : null;
  }
  return null;
}

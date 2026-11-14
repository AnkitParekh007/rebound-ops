/**
 * answer-policy.mjs: the code-level rules a planner answer must pass before
 * the person sees it as a proposed value (Autofill AF-04).
 *
 * Before this module, the only thing keeping work authorization, visa, salary
 * and demographic answers out of a pre-filled form was one bullet in the
 * planner prompt (answer-prompt.mjs). A model that ignored it produced a value
 * the UI showed as a normal answer. The fill step's own guard covers consent
 * checkboxes only. This policy runs on the parsed planner output and enforces:
 *
 * - Sensitive categories are never answered from a model draft. They come back
 *   empty and flagged for the person, whatever the model wrote.
 * - A select/radio/combobox answer must name one of the field's options
 *   (same matcher the fill step uses, option-match.mjs). Otherwise the field
 *   is left for the person rather than offering a value the form cannot take.
 * - An answer longer than the field's maxLength is kept but flagged; it is
 *   never silently truncated, because truncation changes meaning.
 * - Answers for ids that are not on this form are dropped and counted.
 * - File fields are excluded: the CV upload is handled by the fill step.
 *
 * Every answer gets a `source`. The planner reads profile and CV files itself,
 * so everything it writes is a `model_draft`. Fields settled by the person's
 * reviewed config/profile.yml facts (profile-facts.mjs) come back as
 * `profile_fact` (or `derived` for a first/last name split from a two-word full
 * name). An answer the person saved for this question (approved-answers.mjs)
 * comes back as `approved_answer`, after a profile fact and before a derived
 * value or a draft. A saved answer may settle a sensitive question, since the
 * person reviewed it, but it is still marked for them to confirm. Attestation
 * questions and checkboxes in any sensitive category are never filled from one.
 *
 * ANSWER_SOURCES, SENSITIVE_CATEGORIES and ANSWER_HOLD_REASONS mirror
 * packages/contracts/src/operations/autofill.ts. tests/operations-parity.test.mjs
 * fails if they drift. Plain .mjs so `node --test` loads it with no build step.
 */
import { pickComboboxOption } from "./option-match.mjs";
import { resolveProfileAnswer } from "./profile-facts.mjs";

export const ANSWER_SOURCES = Object.freeze(["profile_fact", "approved_answer", "derived", "model_draft", "unresolved"]);
export const SENSITIVE_CATEGORIES = Object.freeze([
  "work_authorization",
  "sponsorship",
  "citizenship",
  "salary",
  "demographic",
  "attestation",
  "background_check",
]);
export const ANSWER_HOLD_REASONS = Object.freeze([
  "sensitive_requires_reviewed_fact",
  "not_an_option",
  "exceeds_max_length",
  "consent_never_auto",
  "no_answer",
]);

// Checked in order: the first match names the category. Over-matching is the
// safe failure (the person answers one more field themselves); under-matching
// is the one this module exists to prevent, so the patterns lean wide.
const CATEGORY_PATTERNS = [
  ["sponsorship", /\b(sponsor(ship|ed|ing)?|visas?|h-?1b|tn status|green card)\b/i],
  [
    "work_authorization",
    /\b(authori[sz](ed|ation)\s+to\s+work|legally\s+(authori[sz]ed|eligible|able|entitled|permitted|allowed)|(permitted|allowed|entitled|cleared)\s+to\s+work|eligib(le|ility)\s+to\s+work|right\s+to\s+work|work\s+(permit|authori[sz]ation|eligibility)|employment\s+eligibility|immigration)\b/i,
  ],
  ["citizenship", /\b(citizen(ship)?|nationality|national\s+of|passport)\b/i],
  [
    "salary",
    /\b(salary|salaries|compensation|remuneration|wages?|pay\s+(expectations?|range|requirements?|rate)|desired\s+pay|expected\s+(pay|ctc|package)|current\s+(ctc|pay|package)|ctc|hourly\s+rate|day\s+rate|rate\s+expectations?)\b/i,
  ],
  [
    "demographic",
    /\b(gender|sex|race|racial|ethnic(ity)?|hispanic|latin[oax]|veteran|disab(led|ility|ilities)|sexual\s+orientation|transgender|pronouns?|date\s+of\s+birth|birth\s*date|age|ages|\d{1,2}\s*\+?\s*(years?|yrs?)\s+(old|of\s+age)|years\s+of\s+age|religio(n|us)|marital|caste)\b/i,
  ],
  ["background_check", /\b(convicted|convictions?|criminal|felon(y|ies)|misdemeanou?rs?|background\s+checks?)\b/i],
  [
    "attestation",
    /\b(i\s+(have\s+)?read|i\s+agree|i\s+consent|i\s+accept|i\s+acknowledge|i\s+certify|i\s+attest|i\s+confirm|consent\s+to|privacy\s+(notice|policy)|terms\s+(of|and)|gdpr|data\s+protection|acknowledge|certify|attest)\b/i,
  ],
];

/**
 * @param {string | null | undefined} label
 * @returns {string | null} one of SENSITIVE_CATEGORIES, or null
 */
export function sensitiveCategory(label) {
  const text = String(label ?? "").replace(/\s+/g, " ");
  for (const [category, re] of CATEGORY_PATTERNS) if (re.test(text)) return category;
  return null;
}

/**
 * @typedef {{ id: string, type: string, label?: string, required?: boolean, options?: string[], maxLength?: number, combobox?: boolean, section?: import("./repeated-sections.mjs").FieldSection }} PolicyField
 * @typedef {{ value: string, needs_confirmation: boolean, source: string, sensitive_category: string | null, hold_reason: string | null }} PolicyAnswer
 * @typedef {{ proposed: number, held: number, unresolved: number, dropped: number, fromProfile: number, fromApproved: number }} PolicySummary
 * @typedef {{ value: string }} SavedAnswer
 */

/**
 * @param {PolicyField[]} fields the form as extracted for this session
 * @param {Record<string, unknown>} raw the parsed planner object: id → {value, needs_confirmation} or a bare string
 * @param {{ facts?: import("./profile-facts.mjs").ProfileFacts | null, approved?: ((field: PolicyField) => SavedAnswer | null) | null }} [opts]
 *   `facts`: reviewed facts from config/profile.yml (profile-facts.mjs). A
 *   field they settle takes the profile's value whatever the planner wrote.
 *   `approved`: the person's saved answer for a field (approved-answers.mjs
 *   findApproved). These two are the only ways a sensitive field gets a value.
 * @returns {{ answers: Record<string, PolicyAnswer>, summary: PolicySummary }}
 */
export function enforceAnswerPolicy(fields, raw, opts = {}) {
  const planner = raw && typeof raw === "object" ? raw : {};
  /** @type {Record<string, PolicyAnswer>} */
  const answers = {};
  const summary = { proposed: 0, held: 0, unresolved: 0, dropped: 0, fromProfile: 0, fromApproved: 0 };
  const facts = opts.facts ?? null;
  const approved = typeof opts.approved === "function" ? opts.approved : null;
  const known = new Set();

  for (const field of fields ?? []) {
    if (!field || typeof field.id !== "string") continue;
    known.add(field.id);
    if (field.type === "file") continue;

    const entry = planner[field.id];
    const rawValue = entry && typeof entry === "object" ? /** @type {{value?: unknown}} */ (entry).value : entry;
    let value = typeof rawValue === "string" || typeof rawValue === "number" || typeof rawValue === "boolean" ? String(rawValue) : "";
    const modelAsked = !!(entry && typeof entry === "object" && /** @type {{needs_confirmation?: unknown}} */ (entry).needs_confirmation);
    const category = sensitiveCategory(field.label);

    const unresolved = (/** @type {string | null} */ hold) => {
      summary.unresolved++;
      return { value: "", needs_confirmation: hold !== null, source: "unresolved", sensitive_category: category, hold_reason: hold };
    };

    const fits = (/** @type {string} */ v) => !(typeof field.maxLength === "number" && field.maxLength > 0 && v.length > field.maxLength);
    const options = Array.isArray(field.options) ? field.options : [];
    const choosesOption = field.type === "select" || field.type === "radio" || !!field.combobox;
    // One entry of a repeated employment/education section is about one job or
    // school: a profile fact ("Country", "City") or a saved answer ("Company")
    // would put the same value into every entry, so neither applies there.
    const repeated = !!field.section;
    const fromProfile = facts && !repeated ? resolveProfileAnswer(field, facts, category) : null;
    // Source order (contracts ANSWER_SOURCES): profile_fact, approved_answer, derived, model_draft.
    if (fromProfile && fromProfile.source === "profile_fact" && fits(fromProfile.value)) {
      summary.fromProfile++;
      answers[field.id] = { value: fromProfile.value, needs_confirmation: false, source: fromProfile.source, sensitive_category: category, hold_reason: null };
      continue;
    }
    // A sensitive checkbox is a consent or declaration (attestation, background
    // check, …): the person ticks it on each form, never a saved answer.
    const saved = approved && !repeated && category !== "attestation" && !(field.type === "checkbox" && category) ? approved(field) : null;
    if (saved && typeof saved.value === "string" && saved.value.trim() !== "") {
      // A saved choice must still be one of this form's options, spelled its way;
      // otherwise it does not apply here and the field resolves as if unsaved.
      let savedValue = saved.value;
      let usable = fits(savedValue);
      if (usable && choosesOption && options.length > 0) {
        const picked = pickComboboxOption(options, savedValue);
        usable = picked >= 0;
        if (usable) savedValue = String(options[picked]);
      }
      if (usable) {
        summary.fromApproved++;
        answers[field.id] = { value: savedValue, needs_confirmation: category !== null, source: "approved_answer", sensitive_category: category, hold_reason: null };
        continue;
      }
    }
    if (fromProfile && fits(fromProfile.value)) {
      summary.fromProfile++;
      answers[field.id] = { value: fromProfile.value, needs_confirmation: false, source: fromProfile.source, sensitive_category: category, hold_reason: null };
      continue;
    }
    if (category) {
      answers[field.id] = unresolved(field.type === "checkbox" && category === "attestation" ? "consent_never_auto" : "sensitive_requires_reviewed_fact");
      continue;
    }
    if (value.trim() === "") {
      answers[field.id] = unresolved(field.required || modelAsked ? "no_answer" : null);
      continue;
    }
    if (choosesOption && options.length > 0) {
      const picked = pickComboboxOption(options, value);
      if (picked < 0) {
        answers[field.id] = unresolved("not_an_option");
        continue;
      }
      // Store the option exactly as the form spells it ("austria" -> "Austria"):
      // the review <select> and the fill step's selectOption match on that text.
      value = String(options[picked]);
    }
    if (typeof field.maxLength === "number" && field.maxLength > 0 && value.length > field.maxLength) {
      summary.held++;
      answers[field.id] = { value, needs_confirmation: true, source: "model_draft", sensitive_category: null, hold_reason: "exceeds_max_length" };
      continue;
    }
    summary.proposed++;
    answers[field.id] = { value, needs_confirmation: modelAsked, source: "model_draft", sensitive_category: null, hold_reason: null };
  }

  for (const id of Object.keys(planner)) if (!known.has(id)) summary.dropped++;
  return { answers, summary };
}

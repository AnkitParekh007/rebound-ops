/**
 * approved-answer-match.mjs - how a saved answer is recognised (no file
 * access, so the review screen can use it in the browser too). Storage is in
 * approved-answers.mjs.
 */
import { fieldSensitiveCategory } from "./answer-policy.mjs";

/**
 * @typedef {{ id: string, question: string, key: string, kind: "text" | "choice" | "checkbox", value: string, company: string | null, savedAt: string }} ApprovedAnswer
 * @typedef {{ type: string, label?: string, combobox?: boolean, section?: import("./repeated-sections.mjs").FieldSection, sensitiveHint?: string }} AnswerField
 */

/**
 * The question as a stable key: case, spacing, a trailing required-marker and
 * end punctuation do not matter; the words do.
 * @param {string | null | undefined} label
 */
export function questionKey(label) {
  return String(label ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\s*:?.!]+$/u, "")
    .replace(/^[\s*]+/u, "")
    .trim();
}

/** @param {AnswerField} field @returns {"text" | "choice" | "checkbox" | null} */
export function fieldKind(field) {
  if (!field || field.type === "file") return null;
  if (field.type === "select" || field.type === "radio" || field.combobox) return "choice";
  if (field.type === "checkbox") return "checkbox";
  return "text";
}

/** @param {string | null | undefined} company */
export function companyKey(company) {
  const c = String(company ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  return c || null;
}

/**
 * Why this field's answer cannot be saved, or null when it can.
 * @param {AnswerField} field
 */
export function cannotSave(field) {
  if (!fieldKind(field)) return "A file upload is not saved as an answer.";
  if (!questionKey(field.label)) return "This field has no question text to recognise it by.";
  if (field.section) return "This question belongs to one entry of a repeated section (one job or school), so it is not saved for other forms.";
  const category = fieldSensitiveCategory(field);
  if (category === "attestation" || (category && fieldKind(field) === "checkbox")) {
    return "Consent and declaration questions are never saved; you answer them yourself on each form.";
  }
  return null;
}

/**
 * The saved answer for this question, if any: one saved for `company` wins over
 * one saved for every application.
 * @param {readonly ApprovedAnswer[]} answers
 * @param {AnswerField} field
 * @param {string | null | undefined} company
 * @returns {ApprovedAnswer | null}
 */
export function findApproved(answers, field, company) {
  const kind = fieldKind(field);
  const key = questionKey(field.label);
  if (!kind || !key || cannotSave(field)) return null;
  const c = companyKey(company);
  let general = null;
  for (const a of answers ?? []) {
    if (a.key !== key || a.kind !== kind) continue;
    if (a.company && a.company === c) return a;
    if (!a.company) general = a;
  }
  return general;
}

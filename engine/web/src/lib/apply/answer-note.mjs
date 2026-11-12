/**
 * answer-note.mjs: the one-line explanation the apply review screen shows
 * under a field, built from the labels answer-policy.mjs puts on every answer.
 *
 * The person should be able to tell, per field, whether a value is an AI draft
 * to check, something only they can answer, or a draft that was withheld and
 * why. Plain .mjs so `node --test` loads it with no build step.
 */

const CATEGORY_LABEL = Object.freeze({
  work_authorization: "work authorization",
  sponsorship: "visa sponsorship",
  citizenship: "citizenship",
  salary: "salary",
  demographic: "demographic",
  attestation: "agreement",
  background_check: "background check",
});

/**
 * @typedef {{ source?: string, holdReason?: string | null, sensitiveCategory?: string | null, edited?: boolean }} NoteMeta
 * @typedef {{ tone: "draft" | "held" | "yours", text: string }} AnswerNote
 */

/**
 * @param {NoteMeta | undefined} meta
 * @param {{ maxLength?: number }} [field]
 * @returns {AnswerNote | null} null when there is nothing worth saying
 */
export function answerNote(meta, field = {}) {
  if (!meta) return null;
  if (meta.edited) return { tone: "yours", text: "Edited by you." };
  const category = meta.sensitiveCategory ? CATEGORY_LABEL[meta.sensitiveCategory] ?? "sensitive" : null;
  switch (meta.holdReason) {
    case "sensitive_requires_reviewed_fact":
      return { tone: "held", text: `Sensitive (${category ?? "sensitive"}) question. The AI is never allowed to answer this, so answer it yourself.` };
    case "consent_never_auto":
      return { tone: "held", text: "Agreement or consent. Only you can accept this." };
    case "not_an_option":
      return { tone: "held", text: "The AI's answer was not one of this field's options, so it was left blank." };
    case "exceeds_max_length":
      return {
        tone: "held",
        text: `AI draft is longer than this field allows${field.maxLength ? ` (${field.maxLength} characters)` : ""}. Shorten it before filling.`,
      };
    case "no_answer":
      return { tone: "held", text: "No answer was found in your CV or profile." };
    default:
      break;
  }
  if (meta.source === "model_draft") return { tone: "draft", text: "AI draft from your CV and profile. Check it before filling." };
  if (meta.source === "profile_fact") return { tone: "draft", text: "From your reviewed profile." };
  if (meta.source === "approved_answer") return { tone: "draft", text: "Your saved answer for this question." };
  return null;
}

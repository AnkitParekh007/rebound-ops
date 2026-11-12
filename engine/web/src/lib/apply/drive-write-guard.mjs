/**
 * drive-write-guard.mjs: what the agentic drive loop may write into a form
 * (roadmap gap C3).
 *
 * The prefill path runs every planner answer through answer-policy.mjs. The
 * drive loop is different: the planner names an action ("type", "select",
 * "click") and executeAction carries it out. Before this guard, the answers
 * block in its prompt was the only thing tying what it typed to what the
 * person reviewed, so it could type a sponsorship answer, tick "I agree", or
 * invent a value. This guard is consulted by executeAction before any write:
 *
 * - Sensitive fields (answer-policy.mjs categories, read from the control's
 *   question) accept only a reviewed answer for that same question with that
 *   same value. A consent/agreement checkbox is never ticked.
 * - In `full` mode (the person pressed "Let the AI fill it" on the review
 *   screen), every other typed or selected value, and every radio option, must
 *   be one of the reviewed answers. A prefix is accepted so a combobox can be
 *   filtered before its option is clicked.
 * - A radio button whose question cannot be identified is left for the person:
 *   its own label is only the option ("Yes"), which says nothing about whether
 *   the question is sensitive.
 * - In `reach` mode there are no reviewed answers yet, so only the sensitive
 *   rule applies (a pre-screen may still ask for an email to continue).
 *
 * Plain .mjs so `node --test` loads it with no build step.
 */
import { sensitiveCategory } from "./answer-policy.mjs";
import { snapshotLabel } from "./submit-guard.mjs";

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * @typedef {{ label: string, value: string }} ReviewedAnswer
 * @typedef {{ approved: ReviewedAnswer[] | null }} WritePolicy approved is null in reach mode
 * @typedef {"sensitive-field" | "unreviewed-value" | "unknown-question"} WriteRefusal
 */

/** True when the reviewed answer's label is the control's question. */
function sameQuestion(answerLabel, question) {
  const a = norm(answerLabel);
  const q = norm(question);
  if (!a || !q) return false;
  return a === q || q.includes(a) || a.includes(q);
}

/**
 * @param {{ action: string, text?: string, value?: string }} act
 * @param {Record<string, any>} facts the control as factsOf read it, including `question`
 * @param {WritePolicy} policy
 * @returns {{ refusal: WriteRefusal, note: string } | null} null when the write may go ahead
 */
export function guardDriveWrite(act, facts, policy) {
  if (!facts || !policy) return null;
  const type = String(facts.type ?? "");
  const role = String(facts.role ?? "");
  const isRadio = type === "radio" || role === "radio";
  const isCheckbox = type === "checkbox" || role === "checkbox";
  const isChoice = isRadio || isCheckbox;
  const writes = act.action === "type" || act.action === "select" || (act.action === "click" && isChoice);
  if (!writes) return null;

  const label = snapshotLabel(facts);
  const question = String(facts.question ?? "").trim() || (isChoice ? "" : label);
  const value = act.action === "type" ? String(act.text ?? "") : act.action === "select" ? String(act.value ?? "") : label;
  const category = sensitiveCategory([question, isCheckbox ? label : ""].join(" "));
  const approved = policy.approved;

  if (category) {
    if (isCheckbox && category === "attestation") {
      return { refusal: "sensitive-field", note: "agreement or consent: only you can accept this" };
    }
    const reviewed = (approved ?? []).some(
      (a) => sensitiveCategory(a.label) === category && norm(a.value) === norm(value) && sameQuestion(a.label, question),
    );
    return reviewed ? null : { refusal: "sensitive-field", note: `sensitive (${category.replace(/_/g, " ")}) question: only your reviewed answer can go here` };
  }
  if (isRadio && !question) {
    return { refusal: "unknown-question", note: "can't tell which question this option answers; you choose it at handoff" };
  }
  if (approved === null || (isCheckbox && act.action === "click")) return null;

  const typed = norm(value);
  const ok = typed !== "" && approved.some((a) => norm(a.value) === typed || (act.action === "type" && norm(a.value).startsWith(typed)));
  return ok ? null : { refusal: "unreviewed-value", note: "not one of your reviewed answers" };
}

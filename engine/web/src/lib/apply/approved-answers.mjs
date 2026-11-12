/**
 * approved-answers.mjs - answers the person saved for reuse (Autofill,
 * `approved_answer` source). Saving is the approval: an answer is stored only
 * when the person chooses "Save answer" on the review screen, never from a
 * model draft on its own.
 *
 * - Stored in <root>/data/approved-answers.json (git-ignored, like all of
 *   data/), written owner-only and atomically under a lock, with a revision
 *   so two tabs cannot overwrite each other.
 * - Matched by the question text (normalized) and the kind of control
 *   (text, choice or checkbox). An answer is saved either for every
 *   application or for one company; the company one wins.
 * - Consent and attestation questions are never saved or reused: the policy
 *   never ticks them (consent_never_auto).
 *
 * Dependency-light (node:fs, the shared lock), so `node --test` loads it.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { tryAcquireDirLockSync, releaseOrWarn } from "../core/dir-lock.mjs";
import { cannotSave, companyKey, fieldKind, questionKey } from "./approved-answer-match.mjs";

export { cannotSave, companyKey, fieldKind, findApproved, questionKey } from "./approved-answer-match.mjs";

export const APPROVED_ANSWERS_FILE = path.join("data", "approved-answers.json");
export const MAX_APPROVED_ANSWERS = 500;
export const MAX_APPROVED_VALUE_CHARS = 20_000;
const LOCK_STALE_MS = 30_000;

export class ApprovedAnswerError extends Error {
  /** @param {string} message @param {number} [status] */
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * @typedef {import("./approved-answer-match.mjs").ApprovedAnswer} ApprovedAnswer
 * @typedef {import("./approved-answer-match.mjs").AnswerField} AnswerField
 * @typedef {{ version: 1, revision: number, answers: ApprovedAnswer[] }} ApprovedAnswers
 */

/** @param {string} root */
const fileOf = (root) => path.join(root, APPROVED_ANSWERS_FILE);

/** @param {unknown} a @returns {a is ApprovedAnswer} */
function isAnswer(a) {
  const r = /** @type {Record<string, unknown>} */ (a);
  return !!a && typeof r.id === "string" && typeof r.key === "string" && typeof r.question === "string" &&
    (r.kind === "text" || r.kind === "choice" || r.kind === "checkbox") && typeof r.value === "string" &&
    (r.company === null || typeof r.company === "string") && typeof r.savedAt === "string";
}

/**
 * The saved answers. A missing file is an empty list; an unreadable or damaged
 * one is an error, so it is never silently overwritten.
 * @param {string} root
 * @returns {ApprovedAnswers}
 */
export function readApproved(root) {
  let text;
  try {
    text = fs.readFileSync(fileOf(root), "utf8");
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT") return { version: 1, revision: 0, answers: [] };
    throw new ApprovedAnswerError("Saved answers could not be read.", 500);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApprovedAnswerError(`${APPROVED_ANSWERS_FILE} is not valid JSON. Fix or move it; it was not changed.`, 500);
  }
  if (!parsed || parsed.version !== 1 || !Number.isSafeInteger(parsed.revision) || !Array.isArray(parsed.answers) || !parsed.answers.every(isAnswer)) {
    throw new ApprovedAnswerError(`${APPROVED_ANSWERS_FILE} has an unexpected shape. Fix or move it; it was not changed.`, 500);
  }
  return parsed;
}

/**
 * @param {string} root
 * @param {number} revision the revision the caller last read
 * @param {(answers: ApprovedAnswer[]) => ApprovedAnswer[]} change
 * @returns {ApprovedAnswers}
 */
function update(root, revision, change) {
  if (!Number.isSafeInteger(revision) || revision < 0) throw new ApprovedAnswerError("A revision is required.");
  const file = fileOf(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lock = tryAcquireDirLockSync(`${file}.lock`, { staleMs: LOCK_STALE_MS });
  if (!lock) throw new ApprovedAnswerError("Saved answers are busy; try again.", 409);
  try {
    const prior = readApproved(root);
    if (prior.revision !== revision) throw new ApprovedAnswerError("Saved answers changed in another tab. Reload them and try again.", 409);
    const answers = change([...prior.answers]);
    if (answers.length > MAX_APPROVED_ANSWERS) throw new ApprovedAnswerError(`At most ${MAX_APPROVED_ANSWERS} answers can be saved. Delete some first.`);
    const next = { version: /** @type {1} */ (1), revision: prior.revision + 1, answers };
    const temp = `${file}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600, flag: "wx" });
      fs.renameSync(temp, file);
      if (process.platform !== "win32") fs.chmodSync(file, 0o600);
    } finally {
      try { fs.unlinkSync(temp); } catch (err) { if (/** @type {NodeJS.ErrnoException} */ (err).code !== "ENOENT") throw err; }
    }
    return next;
  } finally {
    releaseOrWarn(lock);
  }
}

/**
 * Save (or replace) the answer to one question, for every application or for
 * one company. The same question, kind and scope replaces the earlier answer.
 *
 * @param {string} root
 * @param {{ revision: number, field: AnswerField, value: string, company?: string | null, now?: () => Date }} input
 * @returns {{ saved: ApprovedAnswer, all: ApprovedAnswers }}
 */
export function saveApproved(root, { revision, field, value, company = null, now = () => new Date() }) {
  const refused = cannotSave(field);
  if (refused) throw new ApprovedAnswerError(refused);
  if (typeof value !== "string" || !value.trim()) throw new ApprovedAnswerError("There is no answer to save.");
  if (value.length > MAX_APPROVED_VALUE_CHARS) throw new ApprovedAnswerError(`An answer can be at most ${MAX_APPROVED_VALUE_CHARS} characters.`);
  const kind = /** @type {"text" | "choice" | "checkbox"} */ (fieldKind(field));
  const key = questionKey(field.label);
  const scope = companyKey(company);
  /** @type {ApprovedAnswer} */
  const saved = { id: randomUUID(), question: String(field.label).replace(/\s+/g, " ").trim().slice(0, 500), key, kind, value: kind === "text" ? value : value.trim(), company: scope, savedAt: now().toISOString() };
  const all = update(root, revision, (answers) => [...answers.filter((a) => !(a.key === key && a.kind === kind && a.company === scope)), saved]);
  return { saved, all };
}

/**
 * @param {string} root
 * @param {{ revision: number, id: string }} input
 * @returns {ApprovedAnswers}
 */
export function deleteApproved(root, { revision, id }) {
  if (typeof id !== "string" || !id) throw new ApprovedAnswerError("Which saved answer?");
  return update(root, revision, (answers) => {
    const kept = answers.filter((a) => a.id !== id);
    if (kept.length === answers.length) throw new ApprovedAnswerError("That saved answer no longer exists.", 404);
    return kept;
  });
}

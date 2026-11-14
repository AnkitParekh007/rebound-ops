/**
 * fill-readback.mjs - per-field `FillResult`: after a fill, read every control
 * of the real form back and say, field by field, whether the reviewed answer is
 * what the form now shows.
 *
 * Two halves:
 * - `readControls` runs inside the page (Playwright `frame.evaluate`), so it is
 *   self-contained: no imports, no closures. It only reads; it never focuses,
 *   types, clicks or changes a control.
 * - `compareFill` and `readbackIssues` are pure, so `node --test` covers them.
 *
 * Statuses:
 * - `filled`     the form shows the reviewed answer (whitespace and case aside;
 *                a phone number may be reformatted).
 * - `different`  the form shows something else (`actual` says what; `reason`
 *                is "truncated" when the form cut the answer at its length limit).
 * - `empty`      there was an answer, but the control is empty.
 * - `held`       the fill left it for the person on purpose (consent boxes).
 * - `unread`     the control's value cannot be read reliably (some custom
 *                dropdowns); never reported as a problem.
 * - `missing`    the control is no longer on the page.
 * - `not_filled` there was no answer to fill.
 *
 * Client-safe: no Playwright or Node imports.
 */
import { pickComboboxOption } from "./option-match.mjs";
import { fieldDisplayLabel } from "./repeated-sections.mjs";

/**
 * @typedef {{ id: string, type: string, label?: string, required?: boolean, combobox?: boolean, maxLength?: number, section?: import("./repeated-sections.mjs").FieldSection }} ReadbackField
 * @typedef {{ kind: "missing" }
 *   | { kind: "text", value: string }
 *   | { kind: "checked", value: boolean }
 *   | { kind: "choice", text: string, value: string }
 *   | { kind: "files", count: number }
 *   | { kind: "unread" }} Observed
 * @typedef {"filled" | "different" | "empty" | "held" | "unread" | "missing" | "not_filled"} FillStatus
 * @typedef {{ fieldId: string, label: string, required: boolean, status: FillStatus, intended: string, actual?: string, reason?: "truncated" | "reformatted" }} FillResult
 */

const MAX_ACTUAL_CHARS = 200;
const TRUTHY = new Set(["true", "1", "yes", "on", "checked"]);

/**
 * Read what each control shows. Runs in the page; keep it self-contained.
 * @param {{ id: string, type: string, combobox?: boolean }[]} fields
 * @returns {Record<string, Observed>}
 */
export function readControls(fields) {
  /** @type {Record<string, any>} */
  const out = {};
  const esc = (s) => (globalThis.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, "\\$&"));
  const visible = (el) => !!el && /** @type {HTMLElement} */ (el).offsetParent !== null;
  for (const f of fields) {
    const all = Array.from(document.querySelectorAll(`[data-co-field="${esc(f.id)}"]`));
    const el = /** @type {any} */ (all[0]);
    if (!el) { out[f.id] = { kind: "missing" }; continue; }
    if (f.type === "file") {
      out[f.id] = { kind: "files", count: el.files ? el.files.length : 0 };
    } else if (f.type === "checkbox") {
      out[f.id] = { kind: "checked", value: !!el.checked };
    } else if (f.type === "radio") {
      const on = /** @type {any} */ (all.find((r) => /** @type {any} */ (r).checked));
      out[f.id] = on ? { kind: "choice", text: on.getAttribute("data-co-option") || on.value || "", value: on.value || "" } : { kind: "choice", text: "", value: "" };
    } else if (f.combobox) {
      // react-select keeps the chosen value in a sibling single-value element;
      // the tagged input stays empty. Without a shown value or a visible
      // placeholder, the value cannot be read.
      const shell = el.closest('[class*="select-shell" i], [class*="select__container" i], [class*="select__control" i], [class*="value-container" i]') || el.parentElement?.parentElement || el.parentElement;
      const sv = shell?.querySelector('.select__single-value, [class*="single-value" i], [class*="singleValue" i], [class*="multi-value" i]');
      const ph = shell?.querySelector('.select__placeholder, [class*="placeholder" i]');
      const text = (sv?.textContent || "").trim();
      out[f.id] = text ? { kind: "choice", text, value: text } : visible(ph) ? { kind: "choice", text: "", value: "" } : { kind: "unread" };
    } else if (el.tagName === "SELECT") {
      const opt = el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
      out[f.id] = { kind: "choice", text: opt ? (opt.textContent || "").trim() : "", value: el.value || "" };
    } else {
      out[f.id] = { kind: "text", value: typeof el.value === "string" ? el.value : "" };
    }
  }
  return out;
}

/** @param {unknown} s */
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
/** @param {string} s */
const clip = (s) => (s.length > MAX_ACTUAL_CHARS ? `${s.slice(0, MAX_ACTUAL_CHARS)}…` : s);

/**
 * Compare one field's reviewed answer with what the form shows.
 *
 * @param {ReadbackField} field
 * @param {string | undefined} intended the reviewed answer ("" or undefined: none); for a file field, non-empty means a file was attached
 * @param {Observed | undefined} observed
 * @param {{ held?: boolean }} [opts]
 * @returns {FillResult}
 */
export function compareFill(field, intended, observed, opts = {}) {
  const want = String(intended ?? "");
  const base = { fieldId: field.id, label: fieldDisplayLabel(field), required: !!field.required, intended: field.type === "file" && want ? "file attached" : clip(want) };
  /** @param {FillStatus} status @param {Partial<FillResult>} [more] @returns {FillResult} */
  const r = (status, more = {}) => ({ ...base, status, ...more });
  if (!observed || observed.kind === "missing") return r("missing");
  if (opts.held) return r("held");
  // Never a false "didn't land" or "still empty": an unreadable control is unread.
  if (observed.kind === "unread") return r("unread");

  if (observed.kind === "files") {
    if (observed.count > 0) return r("filled", { actual: `${observed.count} file${observed.count === 1 ? "" : "s"}` });
    return r(want ? "empty" : "not_filled");
  }

  if (observed.kind === "checked") {
    const shown = observed.value ? "checked" : "not checked";
    if (!want.trim()) return r("not_filled", { actual: shown });
    const wantOn = TRUTHY.has(norm(want));
    if (observed.value === wantOn) return r("filled", { actual: shown });
    return r(wantOn ? "empty" : "different", { actual: shown });
  }

  const shownText = observed.kind === "choice" ? observed.text : observed.value;
  const shownValue = observed.kind === "choice" ? observed.value : observed.value;
  if (!want.trim()) return r("not_filled", norm(shownText) ? { actual: clip(shownText) } : {});
  if (!norm(shownText) && !norm(shownValue)) return r("empty");

  if (observed.kind === "choice") {
    const same = norm(shownText) === norm(want) || norm(shownValue) === norm(want) || (field.combobox && pickComboboxOption([shownText], want) === 0);
    return same ? r("filled", { actual: clip(shownText) }) : r("different", { actual: clip(shownText || shownValue) });
  }

  const actual = observed.value;
  if (norm(actual) === norm(want)) return r("filled", { actual: clip(actual) });
  if (field.type === "tel" && actual.replace(/\D/g, "") && actual.replace(/\D/g, "") === want.replace(/\D/g, "")) {
    return r("filled", { actual: clip(actual), reason: "reformatted" });
  }
  if (field.maxLength && actual.length === field.maxLength && want.startsWith(actual)) {
    return r("different", { actual: clip(actual), reason: "truncated" });
  }
  return r("different", { actual: clip(actual) });
}

/**
 * Read back every field the person reviewed.
 *
 * @param {ReadbackField[]} fields
 * @param {Record<string, string>} answers
 * @param {Record<string, Observed>} observed
 * @param {{ held?: Iterable<string>, attached?: Iterable<string> }} [opts] ids the fill held for the person, and file ids it attached a file to
 * @returns {FillResult[]}
 */
export function compareAll(fields, answers, observed, opts = {}) {
  const held = new Set(opts.held ?? []);
  const attached = new Set(opts.attached ?? []);
  return fields.map((f) => compareFill(
    f,
    f.type === "file" ? (attached.has(f.id) ? "file" : "") : answers[f.id],
    observed[f.id],
    { held: held.has(f.id) },
  ));
}

/** @param {string[]} names */
const list = (names) => `${names.slice(0, 4).join(", ")}${names.length > 4 ? "…" : ""}`;

/**
 * The warnings to show before the person submits.
 *
 * `differences: false` keeps the warnings the fill gave before per-field
 * readback (empty answers and required fields only); with the `autofill` flag
 * the caller also reports answers that landed as something else.
 *
 * @param {FillResult[]} results
 * @param {{ differences?: boolean }} [opts]
 * @returns {{ level: "warn", code: string, message: string }[]}
 */
export function readbackIssues(results, opts = {}) {
  /** @type {{ level: "warn", code: string, message: string }[]} */
  const out = [];
  const empty = results.filter((x) => x.status === "empty" && x.intended !== "file attached").map((x) => x.label);
  if (empty.length) out.push({ level: "warn", code: "fill-mismatch", message: `These answers didn't seem to land on the real form — check them: ${list(empty)}.` });
  if (opts.differences) {
    const differ = results.filter((x) => x.status === "different").map((x) => x.label);
    if (differ.length) out.push({ level: "warn", code: "fill-different", message: `The real form shows something other than your reviewed answer — check: ${list(differ)}.` });
  }
  const requiredEmpty = results
    .filter((x) => x.required && (
      x.status === "held" ||
      (x.status === "not_filled" && (!x.actual || x.actual === "not checked")) ||
      (x.status === "empty" && x.intended === "file attached")))
    .map((x) => x.label);
  if (requiredEmpty.length) out.push({ level: "warn", code: "required-empty", message: `Required and still empty — you'll need to fill ${requiredEmpty.length > 1 ? "these" : "this"}: ${list(requiredEmpty)}.` });
  return out;
}

/** Statuses the person should look at before submitting, in the order shown. */
export const NEEDS_LOOK = /** @type {const} */ (["different", "empty", "held", "missing", "unread"]);

/**
 * One plain sentence for a field's readback, for the review screen.
 * @param {FillResult} x
 * @returns {string}
 */
export function readbackText(x) {
  switch (x.status) {
    case "filled": return x.reason === "reformatted" ? `On the form, reformatted as “${x.actual}”.` : "On the form as you reviewed it.";
    case "different": return x.reason === "truncated"
      ? `The form cut it at ${x.actual?.length ?? 0} characters. It shows “${x.actual}”.`
      : `The form shows “${x.actual}”, not your answer “${x.intended}”.`;
    case "empty": return x.intended === "file attached" ? "The file did not stay attached." : "Your answer is not on the form. The field is empty.";
    case "held": return "Left for you to tick yourself.";
    case "missing": return "This field is no longer on the page.";
    case "unread": return "Could not be read back. Check it on the form.";
    case "not_filled": return x.required ? "Required, and you gave no answer." : "No answer given.";
  }
}

/**
 * Counts for the summary line.
 * @param {FillResult[]} results
 * @returns {{ answered: number, landed: number, look: FillResult[] }}
 */
export function readbackSummary(results) {
  const answered = results.filter((x) => x.status !== "not_filled");
  const look = NEEDS_LOOK.flatMap((st) => results.filter((x) => x.status === st));
  return { answered: answered.length, landed: answered.filter((x) => x.status === "filled").length, look };
}

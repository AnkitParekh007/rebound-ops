/**
 * lever.mjs - the Lever application form, read from the page itself.
 *
 * Lever's apply page (`jobs.lever.co/<site>/<posting>/apply`) keeps the whole
 * application in `form#application-form`. Each custom question card and each
 * survey carries its own schema in a hidden `…[baseTemplate]` input: the
 * question text, whether it is required, and the card type. That is the
 * Greenhouse schema's counterpart, but it is already on the page, so nothing
 * is fetched.
 *
 * - Context scope: extraction reads only the controls inside the form, never
 *   the rest of the page (`LEVER_FORM_SCOPE`).
 * - `readLeverPage` runs inside the page (Playwright `frame.evaluate`), so it
 *   is self-contained: no imports, no closures. It only reads.
 * - `parseLever` and `enrichFromLever` are pure, so `node --test` covers them.
 *
 * What enrichment changes, per field:
 * - the label is the row's question text (`.application-label`), without the
 *   helper and status text Lever keeps beside it;
 * - a card question gets the card's question text and its required flag;
 * - each box of a multi-select question reads "Question: option", not just the option;
 * - Lever's required marker ("Email✱") is dropped from the label;
 * - survey answers, `eeo[…]` fields and pronouns are marked `demographic`
 *   whatever their wording, so the answer policy always leaves them for the person.
 *
 * Client-safe: no Playwright or Node imports.
 */

/** The application form on a Lever apply page. */
export const LEVER_FORM_SCOPE = "form#application-form";

/**
 * @typedef {{ text: string, type: string, required: boolean }} LeverQuestion
 * @typedef {{ id: string, kind: "card" | "survey", questions: LeverQuestion[] }} LeverCard
 * @typedef {{ cards: LeverCard[], questions: Record<string, string> }} LeverPage
 *   `questions`: the form's own question text per tagged control id
 * @typedef {{ id: string, type: string, label: string, required: boolean, nativeName?: string, nativeId?: string, sensitiveHint?: string }} LeverField
 */

const HOSTS = /^jobs\.(eu\.)?lever\.co$/i;
const POSTING = /^\/([^/]+)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/apply)?\/?$/i;

/**
 * A Lever job page or apply page → {site, postingId}, else null.
 * @param {string} url
 */
export function parseLever(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !HOSTS.test(u.hostname)) return null;
    const m = u.pathname.match(POSTING);
    return m ? { site: m[1], postingId: m[2].toLowerCase() } : null;
  } catch {
    return null;
  }
}

/**
 * Read the form's own question text for every tagged control, and the schema
 * of every question card and survey. Runs in the page; keep it self-contained.
 * Call it after extraction has tagged the controls with `data-co-field`.
 * @param {string} scope the form selector (LEVER_FORM_SCOPE)
 * @returns {LeverPage}
 */
export function readLeverPage(scope) {
  const root = document.querySelector(scope);
  /** @type {LeverPage} */
  const out = { cards: [], questions: {} };
  if (!root) return out;
  for (const input of Array.from(root.querySelectorAll('input[type="hidden"][name$="[baseTemplate]"]'))) {
    const m = (input.getAttribute("name") || "").match(/^(cards|surveysResponses)\[([^\]]+)\]\[baseTemplate\]$/);
    if (!m) continue;
    let tpl;
    try {
      tpl = JSON.parse(/** @type {HTMLInputElement} */ (input).value);
    } catch {
      continue;
    }
    const fields = tpl && Array.isArray(tpl.fields) ? tpl.fields : [];
    out.cards.push({
      id: m[2],
      kind: m[1] === "surveysResponses" ? "survey" : "card",
      questions: fields.map((f) => ({
        text: typeof f?.text === "string" ? f.text : "",
        type: typeof f?.type === "string" ? f.type : "",
        required: f?.required === true,
      })),
    });
  }
  // Lever's question text is the `.application-label` of the question's row;
  // the rest of the row holds helper and status text ("Analyzing resume...").
  for (const el of Array.from(root.querySelectorAll("[data-co-field]"))) {
    const id = el.getAttribute("data-co-field") || "";
    if (!id || out.questions[id] !== undefined) continue;
    const label = el.closest(".application-question")?.querySelector(".application-label");
    if (!label) continue;
    const c = /** @type {Element} */ (label.cloneNode(true));
    c.querySelectorAll(".required, input, select, textarea, button").forEach((n) => n.remove());
    const text = (c.textContent || "").replace(/\s+/g, " ").trim();
    if (text) out.questions[id] = text;
  }
  return out;
}

const clean = (/** @type {unknown} */ s) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
const stripMarker = (/** @type {string} */ s) => s.replace(/\s*[✱*]+\s*$/, "");
const CARD_FIELD = /^(cards|surveysResponses)\[([^\]]+)\](?:\[responses\])?\[field(\d+)\]$/;

/**
 * Apply what the page says to the generically extracted fields: the question
 * text, the card schemas and the demographic marks.
 *
 * @template {LeverField} F
 * @param {F[]} fields
 * @param {LeverPage | null | undefined} page what readLeverPage returned
 * @returns {F[]}
 */
export function enrichFromLever(fields, page) {
  const byId = new Map((Array.isArray(page?.cards) ? page.cards : []).map((c) => [c.id, c]));
  const questions = page?.questions && typeof page.questions === "object" ? page.questions : {};
  /** One box of a multi-select question reads "Question: option". */
  const boxLabel = (/** @type {string} */ question, /** @type {string} */ option) => (option && option !== question ? `${question}: ${option}` : question);
  return fields.map((field) => {
    const own = stripMarker(String(field.label ?? ""));
    const question = Object.prototype.hasOwnProperty.call(questions, field.id) ? stripMarker(clean(questions[field.id])) : "";
    const label = !question ? own : field.type === "checkbox" ? boxLabel(question, own) : question;
    const f = label === field.label ? field : { ...field, label };
    const name = f.nativeName ?? "";
    // EEO and pronouns: always the person's own answer, whatever the label says.
    if (/^eeo\[/.test(name)) return { ...f, sensitiveHint: "demographic" };
    if (name === "pronouns" || /pronouns/i.test(f.nativeId ?? "")) {
      return { ...f, sensitiveHint: "demographic", label: f.type === "checkbox" && !/^pronouns\b/i.test(f.label) ? `Pronouns: ${f.label || "option"}` : f.label };
    }
    const m = name.match(CARD_FIELD);
    if (!m) return f;
    const q = byId.get(m[2])?.questions[Number(m[3])];
    const survey = m[1] === "surveysResponses";
    if (!q) return survey ? { ...f, sensitiveHint: "demographic" } : f;
    const text = clean(q.text);
    return {
      ...f,
      label: !text ? f.label : f.type === "checkbox" ? boxLabel(text, own) : text,
      required: f.required || (q.required && f.type !== "checkbox"),
      ...(survey ? { sensitiveHint: "demographic" } : {}),
    };
  });
}

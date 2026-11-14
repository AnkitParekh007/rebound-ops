/**
 * repeated-sections.mjs - repeated employment and education entries on an
 * application form, each field with an id that names its entry.
 *
 * Many forms ask for the same questions once per job or school ("Company",
 * "Job title", "From" for Employment 1, again for Employment 2, ...). Without
 * this the review screen shows two identical "Company" rows, the planner sees
 * two fields it cannot tell apart, and the ids (`co12`, `co17`) depend on how
 * many controls come before them, so adding an entry or a field earlier on the
 * page moves every later id.
 *
 * Two halves:
 * - `findRepeatedSections` runs inside the page (Playwright `frame.evaluate`)
 *   right after extraction, so it is self-contained: no imports, no closures.
 *   It finds the entries, re-tags each control's `data-co-field` with a stable
 *   id such as `employment-2-company`, and reports each field's entry.
 * - the rest is pure and client-safe, so `node --test` covers it.
 *
 * An entry is found when at least two question texts repeat across sibling
 * blocks of the page: the block that holds one "Company" and one "Job title" is
 * one entry, and its parent holds the entries. A form that lists the repeated
 * questions flat, with no block per entry, is not recognised and keeps its
 * positional ids.
 *
 * The id depends only on the section, the entry's place in it and the question
 * text, so Employment 1's fields keep their ids when an entry is added after
 * them or a field is added elsewhere on the form.
 */

/**
 * @typedef {"employment" | "education" | "entry"} SectionKind
 * @typedef {{ group: string, kind: SectionKind, index: number, count: number, heading?: string }} FieldSection
 *   `group` names the whole repeated section (one per section on the form);
 *   `index` is the entry's 1-based place in it and `count` the number of entries.
 * @typedef {{ id: string, label?: string, section?: FieldSection }} SectionField
 */

/**
 * Find repeated entries among the tagged controls and re-tag their fields.
 * Runs in the page; keep it self-contained.
 *
 * @param {{ id: string, label?: string }[]} fields the extracted fields, in page order
 * @returns {Record<string, { id: string, section: FieldSection }>} old id → new id and entry, for the fields inside an entry only
 */
export function findRepeatedSections(fields) {
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const esc = (s) => (globalThis.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, "\\$&"));
  const before = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  const EMPLOYMENT = /\b(employ(er|ment)|company|organi[sz]ation|job title|position|role|work experience|work history|experience)\b/i;
  const EDUCATION = /\b(education|school|university|college|institution|degree|field of study|major|discipline|qualification|graduat)/i;

  const items = [];
  for (const f of fields) {
    if (!f || typeof f.id !== "string") continue;
    const els = Array.from(document.querySelectorAll(`[data-co-field="${esc(f.id)}"]`));
    if (els.length) items.push({ f, el: els[0], els, key: norm(f.label) });
  }
  /** @type {Map<string, any[]>} */
  const byKey = new Map();
  for (const it of items) {
    if (!it.key) continue;
    if (!byKey.has(it.key)) byKey.set(it.key, []);
    byKey.get(it.key).push(it);
  }

  // For each repeated question, the entry block of each occurrence: the
  // highest ancestor that holds no other occurrence of the same question.
  /** @type {Map<Element, Map<Element, Set<string>>>} */
  const containers = new Map();
  for (const [key, group] of byKey) {
    if (group.length < 2) continue;
    for (const it of group) {
      let root = it.el;
      while (root.parentElement && root.parentElement !== document.body && group.filter((o) => root.parentElement.contains(o.el)).length === 1) {
        root = root.parentElement;
      }
      const container = root.parentElement;
      if (!container || root === it.el) continue;
      if (!containers.has(container)) containers.set(container, new Map());
      const roots = containers.get(container);
      if (!roots.has(root)) roots.set(root, new Set());
      roots.get(root).add(key);
    }
  }

  const headingOf = (container, firstRoot) => {
    const pick = (el) => {
      const t = (el?.textContent || "").replace(/\s+/g, " ").trim();
      return t && t.length <= 80 ? t : "";
    };
    const sel = 'legend, h1, h2, h3, h4, h5, h6, [role="heading"], [class*="heading" i], [class*="section-title" i]';
    for (const h of Array.from(container.querySelectorAll(sel))) {
      if (before(h, firstRoot) < 0 && !firstRoot.contains(h) && pick(h)) return pick(h);
    }
    let c = container;
    for (let depth = 0; depth < 3 && c; depth++, c = c.parentElement) {
      for (let s = c.previousElementSibling; s; s = s.previousElementSibling) {
        const h = s.matches(sel) ? s : s.querySelector(sel);
        if (h && pick(h)) return pick(h);
        if (s.querySelector("input, select, textarea")) break;
      }
    }
    return "";
  };

  const used = new Set(items.map((it) => it.f.id));
  const groupsUsed = new Set();
  /** @type {Record<string, { id: string, section: any }>} */
  const out = {};
  const ordered = Array.from(containers.entries()).sort((a, b) => before(a[0], b[0]));
  for (const [container, rootMap] of ordered) {
    // An entry needs at least two questions that also appear in another entry:
    // one shared "Phone" in two unrelated places is not a repeated section.
    const counts = new Map();
    for (const keys of rootMap.values()) for (const k of keys) counts.set(k, (counts.get(k) || 0) + 1);
    const roots = Array.from(rootMap.entries())
      .filter(([, keys]) => Array.from(keys).filter((k) => counts.get(k) >= 2).length >= 2)
      .map(([root]) => root)
      .sort(before);
    if (roots.length < 2) continue;
    if (roots.some((r) => out[items.find((it) => r.contains(it.el))?.f.id ?? ""])) continue;

    const members = roots.map((r) => items.filter((it) => r.contains(it.el)));
    const heading = headingOf(container, roots[0]);
    const text = `${heading} ${members.flat().map((it) => it.key).join(" ")}`;
    const kind = EDUCATION.test(heading) ? "education" : EMPLOYMENT.test(heading) ? "employment" : EDUCATION.test(text) ? "education" : EMPLOYMENT.test(text) ? "employment" : "entry";
    let group = kind;
    for (let n = 2; groupsUsed.has(group); n++) group = `${kind}${n}`;
    groupsUsed.add(group);

    members.forEach((list, i) => {
      for (const it of list) {
        if (out[it.f.id]) continue;
        const slug = it.key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "field";
        let id = `${group}-${i + 1}-${slug}`;
        for (let n = 2; used.has(id); n++) id = `${group}-${i + 1}-${slug}-${n}`;
        used.add(id);
        for (const el of it.els) el.setAttribute("data-co-field", id);
        out[it.f.id] = { id, section: heading ? { group, kind, index: i + 1, count: roots.length, heading } : { group, kind, index: i + 1, count: roots.length } };
      }
    });
  }
  return out;
}

const KIND_NAME = { employment: "Employment", education: "Education", entry: "Entry" };

/**
 * Apply what `findRepeatedSections` found to the extracted fields: new ids and
 * an entry on each field inside one. Fields outside any entry are unchanged.
 *
 * @template {{ id: string }} F
 * @param {F[]} fields
 * @param {Record<string, { id: string, section: FieldSection }> | null | undefined} found
 * @returns {(F & { section?: FieldSection })[]}
 */
export function applySections(fields, found) {
  if (!found || typeof found !== "object") return fields;
  return fields.map((f) => {
    const hit = Object.prototype.hasOwnProperty.call(found, f.id) ? found[f.id] : null;
    return hit && typeof hit.id === "string" && hit.section ? { ...f, id: hit.id, section: hit.section } : f;
  });
}

/**
 * The entry's name for people, e.g. "Employment 2 of 3".
 * @param {FieldSection | null | undefined} section
 */
export function sectionLabel(section) {
  if (!section) return "";
  const name = section.kind === "entry" && section.heading ? section.heading : KIND_NAME[section.kind] || "Entry";
  return `${name} ${section.index} of ${section.count}`;
}

/**
 * The field's question with its entry, e.g. "Company (Employment 2 of 3)", so
 * two "Company" questions can be told apart in warnings, prompts and logs.
 * @param {SectionField} field
 * @param {string} [fallback]
 */
export function fieldDisplayLabel(field, fallback = "this field") {
  const label = String(field?.label ?? "").trim() || fallback;
  return field?.section ? `${label} (${sectionLabel(field.section)})` : label;
}

/** @param {SectionField | null | undefined} field */
export function inRepeatedSection(field) {
  return !!field?.section;
}

/**
 * Whether the review list starts a new entry at this field.
 * @param {SectionField | null | undefined} previous
 * @param {SectionField} field
 */
export function startsEntry(previous, field) {
  if (!field.section) return false;
  const p = previous?.section;
  return !p || p.group !== field.section.group || p.index !== field.section.index;
}

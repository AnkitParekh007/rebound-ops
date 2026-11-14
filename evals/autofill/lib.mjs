/**
 * Autofill policy corpus: 200 fictional application-form questions, each
 * labelled with what the autofill code should do with it, scored against the
 * code that decides (engine/web/src/lib/apply).
 *
 * Every question goes through enforceAnswerPolicy with the corpus's fictional
 * profile and a planner that offers an answer for every field, exactly as the
 * prefill route calls it. Three labels per question:
 * - `category`: the sensitive category (or null) fieldSensitiveCategory should give;
 * - `outcome`: `profile` / `derived` (a reviewed fact, with `fact` naming it),
 *   `draft` (the planner's answer is proposed), `held` (left for the person),
 *   `none` (a file upload, which the policy never answers);
 * - `savable`: whether the person may save the answer for later forms (cannotSave).
 *
 * The scores describe this corpus only; it is not a sample of real forms.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enforceAnswerPolicy, fieldSensitiveCategory, SENSITIVE_CATEGORIES } from '../../engine/web/src/lib/apply/answer-policy.mjs';
import { profileFacts } from '../../engine/web/src/lib/apply/profile-facts.mjs';
import { cannotSave } from '../../engine/web/src/lib/apply/approved-answer-match.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUTCOMES = new Set(['profile', 'derived', 'draft', 'held', 'none']);
const FACTS = new Set(['fullName', 'firstName', 'lastName', 'email', 'phone', 'linkedin', 'github', 'portfolio', 'location', 'authorizedYes', 'sponsorshipNo']);
const TYPES = new Set(['text', 'email', 'tel', 'url', 'number', 'date', 'textarea', 'select', 'checkbox', 'radio', 'file']);
const CHOICE = new Set(['select', 'radio']);

export const loadCorpus = (file = join(here, 'corpus.json')) => JSON.parse(readFileSync(file, 'utf8'));
export const loadThresholds = (file = join(here, 'thresholds.json')) => JSON.parse(readFileSync(file, 'utf8'));

/** Throws on the first structural problem; a mislabelled row must not score. */
export function validateCorpus(corpus) {
  if (!/^FICTIONAL\b/.test(corpus?.notice ?? '')) throw new Error('corpus notice must start with FICTIONAL');
  if (!Array.isArray(corpus.fields)) throw new Error('corpus has no fields');
  const ids = new Set();
  for (const row of corpus.fields) {
    const f = row?.field;
    const e = row?.expect;
    const at = f?.id ?? '(no id)';
    if (!f || typeof f.id !== 'string' || !f.id) throw new Error('field without an id');
    if (ids.has(f.id)) throw new Error(`duplicate field id ${at}`);
    ids.add(f.id);
    if (!TYPES.has(f.type)) throw new Error(`${at}: unknown type ${f.type}`);
    if (typeof f.label !== 'string' || !f.label.trim()) throw new Error(`${at}: empty label`);
    if (CHOICE.has(f.type) && !(Array.isArray(f.options) && f.options.length)) throw new Error(`${at}: a choice field needs options`);
    if (!e || !OUTCOMES.has(e.outcome)) throw new Error(`${at}: unknown outcome ${e?.outcome}`);
    if (e.category !== null && !SENSITIVE_CATEGORIES.includes(e.category)) throw new Error(`${at}: unknown category ${e.category}`);
    if ((e.outcome === 'profile' || e.outcome === 'derived') !== (e.fact !== undefined)) throw new Error(`${at}: a fact goes with a profile or derived outcome only`);
    if (e.fact !== undefined && !FACTS.has(e.fact)) throw new Error(`${at}: unknown fact ${e.fact}`);
    if (e.outcome === 'held' && e.category === null) throw new Error(`${at}: held without a sensitive category`);
    if (e.outcome === 'draft' && e.category !== null) throw new Error(`${at}: a sensitive question is never a draft`);
    if ((f.type === 'file') !== (e.outcome === 'none')) throw new Error(`${at}: only a file upload has outcome none`);
    if (typeof e.savable !== 'boolean') throw new Error(`${at}: savable must be true or false`);
  }
  return corpus;
}

/** The value a fact should put in the field. */
function factValue(fact, facts) {
  if (fact === 'authorizedYes') return 'Yes';
  if (fact === 'sponsorshipNo') return 'No';
  const parts = facts.fullName.split(/\s+/);
  if (fact === 'firstName') return parts[0];
  if (fact === 'lastName') return parts[1];
  return facts[fact];
}

/** What the planner offers for a field: a valid answer, so only the policy decides. */
function plannerAnswer(field) {
  if (CHOICE.has(field.type)) return { value: field.options[0], needs_confirmation: false };
  if (field.type === 'checkbox') return { value: 'true', needs_confirmation: false };
  if (field.type === 'number') return { value: '5', needs_confirmation: false };
  if (field.type === 'date') return { value: '2027-01-04', needs_confirmation: false };
  return { value: 'A drafted answer', needs_confirmation: false };
}

const OUTCOME_OF = { profile_fact: 'profile', derived: 'derived', model_draft: 'draft', approved_answer: 'saved', unresolved: 'held' };

/** Run every question through the policy and compare with its labels. */
export function scoreCorpus(corpus) {
  const facts = profileFacts(corpus.profile);
  const fields = corpus.fields.map((r) => r.field);
  const planner = Object.fromEntries(fields.filter((f) => f.type !== 'file').map((f) => [f.id, plannerAnswer(f)]));
  const { answers } = enforceAnswerPolicy(fields, planner, { facts });

  const rows = corpus.fields.map(({ field, expect, note }) => {
    const a = answers[field.id];
    const actual = {
      category: fieldSensitiveCategory(field),
      outcome: a ? OUTCOME_OF[a.source] ?? a.source : 'none',
      value: a?.value ?? '',
      savable: cannotSave(field) === null,
    };
    const wantValue = expect.fact ? factValue(expect.fact, facts) : null;
    const problems = [];
    if (actual.category !== expect.category) problems.push('category');
    if (actual.outcome !== expect.outcome) problems.push('outcome');
    else if (wantValue !== null && actual.value !== wantValue) problems.push('fact_value');
    if (actual.savable !== expect.savable) problems.push('savable');
    return { id: field.id, label: field.label, expect, actual, problems, note };
  });

  const categories = [...SENSITIVE_CATEGORIES];
  const perCategory = Object.fromEntries(categories.map((c) => {
    const tp = rows.filter((r) => r.expect.category === c && r.actual.category === c).length;
    const fp = rows.filter((r) => r.expect.category !== c && r.actual.category === c).length;
    const fn = rows.filter((r) => r.expect.category === c && r.actual.category !== c).length;
    return [c, { support: tp + fn, tp, fp, fn, precision: tp + fp ? tp / (tp + fp) : 1, recall: tp + fn ? tp / (tp + fn) : 1 }];
  }));
  const sensitive = rows.filter((r) => r.expect.category !== null);
  const flagged = rows.filter((r) => r.actual.category !== null);
  // The failures that matter most, each its own count:
  const unsafeDrafts = rows.filter((r) => r.expect.outcome === 'held' && r.actual.outcome === 'draft');
  const wrongFacts = rows.filter((r) => (r.actual.outcome === 'profile' || r.actual.outcome === 'derived') && (r.expect.fact === undefined || r.problems.includes('fact_value') || r.problems.includes('outcome')));
  const unsafeSaves = rows.filter((r) => r.actual.savable && !r.expect.savable);
  const overHeld = rows.filter((r) => r.expect.outcome !== 'held' && r.actual.outcome === 'held');
  const missedFacts = rows.filter((r) => (r.expect.outcome === 'profile' || r.expect.outcome === 'derived') && r.actual.outcome !== r.expect.outcome);

  return {
    total: rows.length,
    outcomeAccuracy: rows.filter((r) => !r.problems.includes('outcome') && !r.problems.includes('fact_value')).length / rows.length,
    sensitiveRecall: sensitive.length ? sensitive.filter((r) => r.actual.category !== null).length / sensitive.length : 1,
    sensitivePrecision: flagged.length ? flagged.filter((r) => r.expect.category !== null).length / flagged.length : 1,
    perCategory,
    counts: {
      unsafeDrafts: unsafeDrafts.length,
      wrongFacts: wrongFacts.length,
      unsafeSaves: unsafeSaves.length,
      overHeld: overHeld.length,
      missedFacts: missedFacts.length,
      savableMismatches: rows.filter((r) => r.problems.includes('savable')).length,
      categoryMismatches: rows.filter((r) => r.problems.includes('category')).length,
    },
    rows,
  };
}

/** Every threshold as a named check. */
export function gate(score, t) {
  const checks = [
    { name: 'corpus size', pass: score.total >= t.minFields, actual: score.total, limit: `>= ${t.minFields}` },
    { name: 'sensitive questions drafted', pass: score.counts.unsafeDrafts <= t.maxUnsafeDrafts, actual: score.counts.unsafeDrafts, limit: `<= ${t.maxUnsafeDrafts}` },
    { name: 'wrong profile facts', pass: score.counts.wrongFacts <= t.maxWrongFacts, actual: score.counts.wrongFacts, limit: `<= ${t.maxWrongFacts}` },
    { name: 'unsafe saves', pass: score.counts.unsafeSaves <= t.maxUnsafeSaves, actual: score.counts.unsafeSaves, limit: `<= ${t.maxUnsafeSaves}` },
    { name: 'sensitive recall', pass: score.sensitiveRecall >= t.minSensitiveRecall, actual: round(score.sensitiveRecall), limit: `>= ${t.minSensitiveRecall}` },
    { name: 'sensitive precision', pass: score.sensitivePrecision >= t.minSensitivePrecision, actual: round(score.sensitivePrecision), limit: `>= ${t.minSensitivePrecision}` },
    { name: 'outcome accuracy', pass: score.outcomeAccuracy >= t.minOutcomeAccuracy, actual: round(score.outcomeAccuracy), limit: `>= ${t.minOutcomeAccuracy}` },
  ];
  return { pass: checks.every((c) => c.pass), checks };
}

export const round = (x) => Math.round(x * 1000) / 1000;

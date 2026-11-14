/**
 * Score the eligibility requirement patterns against a labelled corpus of
 * fictional job-posting snippets.
 *
 * Each row is a snippet and the set of hard requirements a careful reader
 * finds in it: `work_authorization`, `sponsorship:refused`,
 * `sponsorship:offered`, `citizenship_or_clearance`, `location`, `language`
 * or `degree`. `findRequirements` runs on the snippet exactly as the screen
 * does, and its kinds (with the sponsorship stance) are compared with the
 * labels row by row. A row can carry several labels; a label counts once per
 * row however many sentences state it.
 *
 * Years of experience are not scored here: `screenEligibility` takes them
 * from `engine/jd-years.mjs`, which imports engine-only packages that root CI
 * does not install.
 *
 * The scores describe this corpus only, not real postings.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findRequirements } from '../../engine/web/src/lib/eligibility/screen.mjs';

const here = dirname(fileURLToPath(import.meta.url));

export const LABELS = Object.freeze([
  'work_authorization',
  'sponsorship:refused',
  'sponsorship:offered',
  'citizenship_or_clearance',
  'location',
  'language',
  'degree',
]);
const KNOWN = new Set(LABELS);

export const loadCorpus = () => JSON.parse(readFileSync(join(here, 'corpus.json'), 'utf8'));
export const loadThresholds = () => JSON.parse(readFileSync(join(here, 'thresholds.json'), 'utf8'));

/** Throw on the first malformed row; return the corpus. */
export function validateCorpus(corpus) {
  if (!/^FICTIONAL/.test(corpus?.notice ?? '')) throw new Error('corpus notice must start with FICTIONAL');
  if (!Array.isArray(corpus.rows) || corpus.rows.length === 0) throw new Error('corpus has no rows');
  const ids = new Set();
  for (const row of corpus.rows) {
    if (typeof row.id !== 'string' || !row.id) throw new Error('row without an id');
    if (ids.has(row.id)) throw new Error(`duplicate row id ${row.id}`);
    ids.add(row.id);
    if (typeof row.text !== 'string' || row.text.trim().length < 3) throw new Error(`${row.id}: text is empty`);
    if (!Array.isArray(row.expect)) throw new Error(`${row.id}: expect must be a list`);
    for (const label of row.expect) if (!KNOWN.has(label)) throw new Error(`${row.id}: unknown label ${label}`);
    if (new Set(row.expect).size !== row.expect.length) throw new Error(`${row.id}: repeated label`);
    if (row.expect.includes('sponsorship:refused') && row.expect.includes('sponsorship:offered')) {
      throw new Error(`${row.id}: sponsorship cannot be both refused and offered`);
    }
  }
  return corpus;
}

/** The labels `findRequirements` gives one snippet. */
export function actualLabels(text) {
  const out = new Set();
  for (const r of findRequirements(text)) out.add(r.kind === 'sponsorship' ? `sponsorship:${r.stance}` : r.kind);
  return [...out];
}

const ratio = (num, den) => (den === 0 ? 1 : num / den);

export function scoreCorpus(corpus) {
  const per = Object.fromEntries(LABELS.map((l) => [l, { support: 0, tp: 0, fp: 0, fn: 0 }]));
  let stanceFlips = 0;
  let exact = 0;
  const rows = corpus.rows.map((row) => {
    const expected = new Set(row.expect);
    const actual = new Set(actualLabels(row.text));
    const missed = [...expected].filter((l) => !actual.has(l));
    const extra = [...actual].filter((l) => !expected.has(l));
    for (const l of expected) per[l].support += 1;
    for (const l of actual) if (expected.has(l)) per[l].tp += 1;
    for (const l of extra) per[l].fp += 1;
    for (const l of missed) per[l].fn += 1;
    // The one error that turns a posting's meaning around: an offer read as a refusal or the reverse.
    const flipped =
      (expected.has('sponsorship:refused') && actual.has('sponsorship:offered')) ||
      (expected.has('sponsorship:offered') && actual.has('sponsorship:refused'));
    if (flipped) stanceFlips += 1;
    if (!missed.length && !extra.length) exact += 1;
    return { id: row.id, expect: [...expected], actual: [...actual], missed, extra };
  });

  const perLabel = {};
  let tp = 0, fp = 0, fn = 0;
  for (const [l, v] of Object.entries(per)) {
    tp += v.tp; fp += v.fp; fn += v.fn;
    perLabel[l] = { support: v.support, tp: v.tp, fp: v.fp, fn: v.fn, precision: ratio(v.tp, v.tp + v.fp), recall: ratio(v.tp, v.tp + v.fn) };
  }
  const noRequirementRows = corpus.rows.filter((r) => r.expect.length === 0);
  const falseAlarms = rows.filter((r) => r.expect.length === 0 && r.actual.length > 0).length;
  return {
    total: corpus.rows.length,
    perLabel,
    microPrecision: ratio(tp, tp + fp),
    microRecall: ratio(tp, tp + fn),
    exactRowAccuracy: ratio(exact, corpus.rows.length),
    counts: { stanceFlips, falseAlarms, noRequirementRows: noRequirementRows.length },
    rows,
  };
}

/** Apply the thresholds. Every check must pass. */
export function gate(score, t) {
  const checks = [
    { name: 'rows', actual: score.total, limit: `>= ${t.minRows}`, pass: score.total >= t.minRows },
    { name: 'sponsorship stance flips', actual: score.counts.stanceFlips, limit: `<= ${t.maxStanceFlips}`, pass: score.counts.stanceFlips <= t.maxStanceFlips },
    { name: 'false alarms on rows with no requirement', actual: score.counts.falseAlarms, limit: `<= ${t.maxFalseAlarms}`, pass: score.counts.falseAlarms <= t.maxFalseAlarms },
    { name: 'micro precision', actual: round(score.microPrecision), limit: `>= ${t.minMicroPrecision}`, pass: score.microPrecision >= t.minMicroPrecision },
    { name: 'micro recall', actual: round(score.microRecall), limit: `>= ${t.minMicroRecall}`, pass: score.microRecall >= t.minMicroRecall },
  ];
  for (const [label, floor] of Object.entries(t.minRecallByLabel ?? {})) {
    const v = score.perLabel[label]?.recall ?? 0;
    checks.push({ name: `${label} recall`, actual: round(v), limit: `>= ${floor}`, pass: v >= floor });
  }
  for (const [label, floor] of Object.entries(t.minPrecisionByLabel ?? {})) {
    const v = score.perLabel[label]?.precision ?? 0;
    checks.push({ name: `${label} precision`, actual: round(v), limit: `>= ${floor}`, pass: v >= floor });
  }
  return { pass: checks.every((c) => c.pass), checks };
}

export const round = (x) => Math.round(x * 1000) / 1000;

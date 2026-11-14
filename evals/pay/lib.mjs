/**
 * Score the pay detector (`statesPay` in
 * `engine/web/src/lib/eligibility/quality.mjs`) against a labelled corpus of
 * fictional job-posting snippets.
 *
 * Each row is a snippet and one label: does it state a figure or range for the
 * person's own pay? `statesPay` runs on the snippet exactly as the scan's
 * `qual:` label does, and its answer is compared with the label. The id prefix
 * names the wording family (`pr-` pay range, `nk-` perks, …), and the report
 * breaks errors down by family.
 *
 * The scores describe this corpus only, not real postings.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statesPay } from '../../engine/web/src/lib/eligibility/quality.mjs';

const here = dirname(fileURLToPath(import.meta.url));

export const loadCorpus = () => JSON.parse(readFileSync(join(here, 'corpus.json'), 'utf8'));
export const loadThresholds = () => JSON.parse(readFileSync(join(here, 'thresholds.json'), 'utf8'));

export const familyOf = (id) => id.split('-')[0];

/** Throw on the first malformed row; return the corpus. */
export function validateCorpus(corpus) {
  if (!/^FICTIONAL/.test(corpus?.notice ?? '')) throw new Error('corpus notice must start with FICTIONAL');
  const families = corpus.families ?? {};
  if (!Array.isArray(corpus.rows) || corpus.rows.length === 0) throw new Error('corpus has no rows');
  const ids = new Set();
  const texts = new Set();
  for (const row of corpus.rows) {
    if (typeof row.id !== 'string' || !/^[a-z]{2}-\d{2}$/.test(row.id)) throw new Error(`bad row id ${row.id}`);
    if (ids.has(row.id)) throw new Error(`duplicate row id ${row.id}`);
    ids.add(row.id);
    const family = familyOf(row.id);
    if (!(family in families)) throw new Error(`${row.id}: unknown family ${family}`);
    if (typeof row.text !== 'string' || row.text.trim().length < 3) throw new Error(`${row.id}: text is empty`);
    if (texts.has(row.text)) throw new Error(`${row.id}: duplicate text`);
    texts.add(row.text);
    if (typeof row.pay !== 'boolean') throw new Error(`${row.id}: pay must be true or false`);
    // Families starting with p hold pay rows and families starting with n hold rows without pay.
    if (row.pay !== family.startsWith('p')) throw new Error(`${row.id}: label does not match family ${family}`);
  }
  return corpus;
}

const ratio = (num, den) => (den === 0 ? 1 : num / den);

export function scoreCorpus(corpus) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  const byFamily = {};
  const rows = corpus.rows.map((row) => {
    const actual = statesPay(row.text);
    const family = familyOf(row.id);
    const f = (byFamily[family] ??= { rows: 0, errors: 0 });
    f.rows += 1;
    if (row.pay && actual) tp += 1;
    else if (!row.pay && actual) fp += 1;
    else if (row.pay && !actual) fn += 1;
    else tn += 1;
    if (actual !== row.pay) f.errors += 1;
    return { id: row.id, expect: row.pay, actual };
  });
  for (const f of Object.values(byFamily)) f.accuracy = ratio(f.rows - f.errors, f.rows);
  return {
    total: corpus.rows.length,
    counts: { payRows: tp + fn, noPayRows: fp + tn, tp, fp, fn, tn },
    precision: ratio(tp, tp + fp),
    recall: ratio(tp, tp + fn),
    falsePayRate: ratio(fp, fp + tn),
    accuracy: ratio(tp + tn, corpus.rows.length),
    byFamily,
    rows,
  };
}

/** Apply the thresholds. Every check must pass. */
export function gate(score, t) {
  const checks = [
    { name: 'rows', actual: score.total, limit: `>= ${t.minRows}`, pass: score.total >= t.minRows },
    { name: 'precision', actual: round(score.precision), limit: `>= ${t.minPrecision}`, pass: score.precision >= t.minPrecision },
    { name: 'recall', actual: round(score.recall), limit: `>= ${t.minRecall}`, pass: score.recall >= t.minRecall },
    { name: 'false "pay stated" on rows without pay', actual: score.counts.fp, limit: `<= ${t.maxFalsePay}`, pass: score.counts.fp <= t.maxFalsePay },
    { name: 'missed pay', actual: score.counts.fn, limit: `<= ${t.maxMissedPay}`, pass: score.counts.fn <= t.maxMissedPay },
  ];
  return { pass: checks.every((c) => c.pass), checks };
}

export const round = (x) => Math.round(x * 1000) / 1000;

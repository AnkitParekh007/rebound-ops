import type { ExtractedField, JobExtraction, WorkArrangement } from '@reboundops/contracts';

/**
 * Deterministic, offline extraction of job fields from pasted text.
 *
 * Rules:
 *  - Every value returned comes with the verbatim line it was found on.
 *  - A field is left null rather than guessed when no supporting text exists.
 *  - Salary is only reported when the text contains an explicit amount.
 *  - Nothing is fetched; the posting is never claimed to be verified.
 *
 * The input is untrusted. It is treated purely as text: never evaluated,
 * never interpreted as instructions, and never rendered as HTML.
 */

export const MAX_DESCRIPTION_CHARS = 100_000;
const MAX_FIELD_CHARS = 300;
const MAX_EVIDENCE_CHARS = 500;

export function normalizeDescription(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_DESCRIPTION_CHARS);
}

const clean = (value: string) =>
  value
    .replace(/^[\s*•\-–—#:|]+/, '')
    .replace(/[\s*|]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FIELD_CHARS);

const evidenceOf = (line: string) => line.trim().slice(0, MAX_EVIDENCE_CHARS);

const field = (value: string, line: string): ExtractedField | null => {
  const v = clean(value);
  return v ? { value: v, evidence: evidenceOf(line) } : null;
};

function labelled(lines: readonly string[], labels: RegExp): ExtractedField | null {
  const re = new RegExp(`^\\s*[*•\\-]?\\s*(?:${labels.source})\\s*[:\\-–—|]\\s*(.+)$`, 'i');
  for (const line of lines) {
    const m = re.exec(line);
    if (m?.[1]) {
      const f = field(m[1], line);
      if (f) return f;
    }
  }
  return null;
}

const CURRENCY = String.raw`(?:[$€£¥₹]|USD|EUR|GBP|INR|CAD|AUD|CHF|SGD|NZD|JPY)`;
const AMOUNT = String.raw`\d{1,3}(?:[,.\s]\d{3})*(?:\.\d+)?\s?[kKmM]?`;
const SALARY_RE = new RegExp(
  String.raw`${CURRENCY}\s?${AMOUNT}(?:\s?(?:-|–|—|to)\s?${CURRENCY}?\s?${AMOUNT})?(?:\s?${CURRENCY})?` +
    String.raw`(?:\s?(?:per|/|a)\s?(?:year|yr|annum|hour|hr|month|mo|week))?`,
  'i',
);
const SALARY_CONTEXT = /\b(salary|compensation|pay|base|range|annual|per (year|hour|annum)|ote)\b/i;

function extractSalary(lines: readonly string[]): ExtractedField | null {
  const labelledSalary = labelled(lines, /salary|compensation|pay range|pay|base pay|salary range/);
  if (labelledSalary) {
    const amount = SALARY_RE.exec(labelledSalary.value);
    if (amount) return { value: clean(amount[0]), evidence: labelledSalary.evidence };
    // A "Salary:" label without an explicit amount ("competitive") is not a salary.
  }
  for (const line of lines) {
    const amount = SALARY_RE.exec(line);
    if (amount && SALARY_CONTEXT.test(line)) {
      return { value: clean(amount[0]), evidence: evidenceOf(line) };
    }
  }
  return null;
}

function extractWorkArrangement(
  lines: readonly string[],
): { value: WorkArrangement; evidence: string } | null {
  const rules: [WorkArrangement, RegExp][] = [
    ['hybrid', /\bhybrid\b/i],
    ['remote', /\b(fully remote|remote[- ]first|100% remote|remote)\b/i],
    ['onsite', /\b(on[- ]?site|in[- ]office|in the office)\b/i],
  ];
  for (const [value, re] of rules) {
    const line = lines.find((l) => re.test(l));
    if (line) return { value, evidence: evidenceOf(line) };
  }
  return null;
}

const looksLikeHeading = (line: string) =>
  line.length > 2 &&
  line.length <= 100 &&
  !/[.!?]$/.test(line) &&
  !/^(about|description|overview|responsibilities|requirements|summary|the role|job description)\b/i.test(
    line,
  ) &&
  !/^https?:\/\//i.test(line);

export function extractJob(rawDescription: string, sourceUrl: string | null): JobExtraction {
  const description = normalizeDescription(rawDescription);
  const lines = description
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const warnings: string[] = [];

  let title = labelled(lines, /job title|position title|title|position|role/);
  let employer = labelled(lines, /company|employer|organi[sz]ation|hiring company/);
  const location = labelled(lines, /location|locations|based in|office location|work location/);

  // "Senior Engineer at Example Co" or "Senior Engineer - Example Co" on the first line.
  const first = lines[0];
  if (first && (!title || !employer)) {
    const at = /^(.{2,100}?)\s+(?:at|@)\s+(.{2,80})$/i.exec(first);
    if (at?.[1] && at[2]) {
      title ??= field(at[1], first);
      employer ??= field(at[2], first);
    }
  }
  if (!title && first && looksLikeHeading(first)) {
    title = field(first, first);
  }

  if (!employer) {
    for (const line of lines) {
      const about = /^about\s+(?!the role|the job|you|us\b|this role)(.{2,60})$/i.exec(line);
      if (about?.[1] && !/[.!?]$/.test(about[1])) {
        employer = field(about[1], line);
        break;
      }
      const hiring = /^(.{2,60}?)\s+is (?:hiring|looking for|seeking)\b/i.exec(line);
      if (hiring?.[1]) {
        employer = field(hiring[1], line);
        break;
      }
    }
  }

  const salary = extractSalary(lines);
  const workArrangement = extractWorkArrangement(lines);

  let sourceHost: string | null = null;
  if (sourceUrl) {
    try {
      sourceHost = new URL(sourceUrl).hostname.toLowerCase();
    } catch {
      warnings.push('The source URL could not be parsed and was ignored.');
    }
  }

  if (!description) warnings.push('No description was provided; fields must be entered manually.');
  if (!title) warnings.push('Job title not found in the text — please enter it.');
  if (!employer) warnings.push('Employer not found in the text — please enter it.');
  if (!salary) warnings.push('No explicit salary amount found; salary left blank.');
  warnings.push(
    'Not verified: the posting was not checked against the live site. Confirm details on the official page.',
  );

  return {
    title,
    employer,
    location,
    salary,
    workArrangement,
    sourceUrl: sourceHost ? sourceUrl : null,
    sourceHost,
    description,
    warnings,
  };
}

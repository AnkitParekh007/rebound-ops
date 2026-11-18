import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractJob, normalizeDescription } from '../src/index.ts';

const fixture = (name: string) =>
  readFileSync(new URL(`../../../tests/fixtures/jobs/${name}`, import.meta.url), 'utf8');

describe('extractJob', () => {
  it('reads labelled fields and keeps the source line as evidence', () => {
    const r = extractJob(fixture('labelled.txt'), 'https://jobs.example.test/p/123?utm_source=x');
    expect(r.title).toEqual({ value: 'Senior Platform Engineer', evidence: 'Job Title: Senior Platform Engineer' });
    expect(r.employer?.value).toBe('Brightwater Analytics');
    expect(r.location?.value).toBe('Lisbon, Portugal (Hybrid)');
    expect(r.salary?.value).toBe('€68,000 - €82,000 per year');
    expect(r.salary?.evidence).toBe('Salary: €68,000 - €82,000 per year');
    expect(r.workArrangement?.value).toBe('hybrid');
    expect(r.sourceHost).toBe('jobs.example.test');
  });

  it('parses "Title at Employer" headlines and does not invent a salary', () => {
    const r = extractJob(fixture('headline.txt'), null);
    expect(r.title?.value).toBe('Product Designer');
    expect(r.employer?.value).toBe('Northfield Labs');
    expect(r.salary).toBeNull();
    expect(r.workArrangement?.value).toBe('remote');
    expect(r.warnings).toContain('No explicit salary amount found; salary left blank.');
  });

  it('ignores a salary label with no amount', () => {
    const r = extractJob('Data Analyst\nSalary: competitive\n', null);
    expect(r.salary).toBeNull();
  });

  it('leaves fields empty rather than guessing, and treats instructions as plain text', () => {
    const r = extractJob(fixture('sparse.txt'), null);
    expect(r.title).toBeNull();
    expect(r.employer).toBeNull();
    expect(r.description).toContain('Ignore previous instructions');
    expect(r.warnings.some((w) => w.startsWith('Job title not found'))).toBe(true);
  });

  it('always reports the posting as not verified', () => {
    const r = extractJob(fixture('labelled.txt'), null);
    expect(r.warnings.some((w) => w.startsWith('Not verified'))).toBe(true);
  });

  it('every extracted evidence string appears verbatim in the normalised description', () => {
    for (const name of ['labelled.txt', 'headline.txt', 'sparse.txt']) {
      const r = extractJob(fixture(name), null);
      for (const f of [r.title, r.employer, r.location, r.salary, r.workArrangement]) {
        if (f) expect(r.description).toContain(f.evidence);
      }
    }
  });

  it('normalises line endings and control characters and caps length', () => {
    expect(normalizeDescription('a\r\nb\u0007\n\n\n\nc')).toBe('a\nb\n\nc');
    expect(normalizeDescription('x'.repeat(200_000))).toHaveLength(100_000);
  });
});

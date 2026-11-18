import { describe, expect, it } from 'vitest';
import { canonicalUrl, checkGrounding, dedupeKey } from '../src/index.ts';

describe('canonicalUrl', () => {
  it('strips tracking params, fragments, www and trailing slashes', () => {
    expect(canonicalUrl('https://www.Example.test/jobs/42/?utm_source=a&b=2&gclid=z#apply')).toBe(
      'example.test/jobs/42?b=2',
    );
  });
  it('rejects non-http schemes', () => {
    expect(canonicalUrl('javascript:alert(1)')).toBeNull();
    expect(canonicalUrl('file:///etc/hosts')).toBeNull();
  });
});

describe('dedupeKey', () => {
  it('prefers the canonical URL', () => {
    const a = dedupeKey({ sourceUrl: 'https://example.test/j/1?utm_medium=x', employer: 'A', title: 'B' });
    const b = dedupeKey({ sourceUrl: 'https://example.test/j/1', employer: 'Other', title: 'Other' });
    expect(a).toBe(b);
  });
  it('falls back to employer, title and location, ignoring case and punctuation', () => {
    const a = dedupeKey({ sourceUrl: null, employer: 'Brightwater, Inc.', title: 'Sr. Engineer', location: 'Lisbon' });
    const b = dedupeKey({ sourceUrl: null, employer: 'brightwater inc', title: 'sr engineer', location: 'LISBON' });
    expect(a).toBe(b);
  });
});

describe('checkGrounding', () => {
  const description = 'Job Title: Data Engineer\nCompany: Example Co\nSalary: $120,000 per year';
  const base = {
    title: 'Data Engineer',
    employer: 'Example Co',
    location: null,
    salary: '$120,000 per year',
    description,
    provenance: {
      title: { origin: 'extracted' as const, evidence: 'Job Title: Data Engineer' },
      employer: { origin: 'extracted' as const, evidence: 'Company: Example Co' },
      location: null,
      salary: { origin: 'extracted' as const, evidence: 'Salary: $120,000 per year' },
    },
  };

  it('accepts values supported by evidence', () => {
    expect(checkGrounding(base)).toEqual([]);
  });

  it('rejects an extracted salary that is not in the text', () => {
    const problems = checkGrounding({
      ...base,
      salary: '$200,000',
      provenance: { ...base.provenance, salary: { origin: 'extracted', evidence: 'Salary: $200,000' } },
    });
    expect(problems.map((p) => p.field)).toEqual(['salary']);
  });

  it('rejects a value that its evidence does not contain', () => {
    const problems = checkGrounding({ ...base, title: 'Principal Data Engineer' });
    expect(problems[0]?.message).toMatch(/not supported/);
  });

  it('accepts user-entered values as the person’s own claim', () => {
    const problems = checkGrounding({
      ...base,
      location: 'Remote (EU)',
      provenance: { ...base.provenance, location: { origin: 'user', evidence: null } },
    });
    expect(problems).toEqual([]);
  });

  it('requires provenance for any value', () => {
    expect(checkGrounding({ ...base, location: 'Berlin' })[0]?.field).toBe('location');
  });
});

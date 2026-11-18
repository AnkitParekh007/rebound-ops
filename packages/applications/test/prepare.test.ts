import { describe, expect, it } from 'vitest';
import { Profile, type Job } from '@reboundops/contracts';
import { checklist, draftAnswer, emptyPackage, similarity } from '../src/index.ts';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const job: Job = {
  id: 'j1', title: 'Data Engineer', employer: 'Example Co', location: 'Dublin, Ireland', salary: null, workArrangement: 'hybrid', sourceUrl: 'https://jobs.example.test/1',
  description: 'Data Engineer\nLocation: Dublin, Ireland', provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null },
  verification: { status: 'unverified', checkedAt: null, note: '' }, dedupeKey: 'k', capturedAt: NOW.toISOString(),
};
const profile = Profile.parse({
  displayName: 'Casey Example',
  contact: { email: 'casey@example.test', phone: '+353 1 234 5678', location: 'Dublin', links: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/in/casey-example' }] },
  workAuthorizedCountries: ['Ireland'],
  requiresSponsorship: 'no',
  openToRelocation: 'no',
  workArrangements: ['hybrid', 'remote'],
  experience: [
    { id: 'e1', employer: 'A', title: 'Engineer', start: '2019-06', end: '2022-05', verified: true },
    { id: 'e2', employer: 'B', title: 'Engineer', start: '2022-06', end: null, verified: true },
    { id: 'e3', employer: 'C', title: 'Intern', start: '2010-01', end: '2014-01', verified: false },
  ],
  answers: [{ id: 'a1', question: 'Why do you want to work here?', answer: 'My own words about this.' }],
});
const ask = (q: string, p = profile) => draftAnswer(q, p, job, NOW);

describe('draftAnswer', () => {
  it('reuses saved answers for similar questions', () => {
    expect(ask('Why do you want to work at Example Co?')).toMatchObject({ answer: 'My own words about this.', source: { kind: 'saved_answer' } });
    expect(similarity('Why do you want to work here?', 'What is your salary?')).toBeLessThan(0.3);
  });

  it('answers from stated eligibility facts', () => {
    expect(ask('Are you legally authorized to work in Ireland?')).toMatchObject({ status: 'drafted', answer: 'Yes — I am authorised to work in Ireland.' });
    expect(ask('Will you now or in the future require sponsorship?').answer).toBe('No, I do not require visa sponsorship.');
    expect(ask('Are you willing to relocate?').answer).toBe('No, I am not able to relocate.');
    expect(ask('Are you comfortable with a hybrid schedule?').status).toBe('drafted');
  });

  it('does not claim authorisation for a country not in the profile', () => {
    const r = ask('Do you have the right to work in the United Kingdom?');
    expect(r.status).toBe('needs_input');
    expect(r.note).toContain('United Kingdom');
  });

  it('uses contact facts and links', () => {
    expect(ask('LinkedIn profile URL').answer).toBe('https://www.linkedin.com/in/casey-example');
    expect(ask('Email address').answer).toBe('casey@example.test');
    expect(ask('GitHub').status).toBe('needs_input');
  });

  it('gives total verified years only, never per-skill guesses', () => {
    expect(ask('How many years of experience do you have?')).toMatchObject({ answer: '7 years', source: { kind: 'experience' } }); // 36 + 49 months; unverified internship excluded;
    expect(ask('How many years of experience do you have with Spark?').status).toBe('needs_input');
  });

  it('never drafts salary, notice period or self-identification answers', () => {
    for (const q of ['What are your salary expectations?', 'What is your notice period?', 'Please state your gender', 'Do you have a disability?']) {
      expect(ask(q).status).toBe('needs_input');
    }
    expect(ask('What is your favourite colour?').status).toBe('needs_input');
  });

  it('asks for missing facts instead of assuming', () => {
    expect(ask('Do you require sponsorship?', Profile.parse({})).status).toBe('needs_input');
  });
});

describe('checklist', () => {
  it('is ready only when required items are done', () => {
    const pkg = emptyPackage('a1', NOW);
    const c = checklist({ pkg, job, resume: null, coverLetter: null, eligibility: 'confirmed' });
    expect(c.ready).toBe(false);
    expect(c.applyUrl).toBe('https://jobs.example.test/1');
    const done = checklist({
      pkg: { ...pkg, eligibilityAcknowledged: true, exports: { resume: NOW.toISOString(), cover_letter: null } },
      job: { ...job, verification: { status: 'verified', checkedAt: NOW.toISOString(), note: '' } },
      resume: null, coverLetter: null, eligibility: 'confirmed',
    });
    expect(done.ready).toBe(true);
    expect(done.items.find((i) => i.key === 'cover_letter')!.optional).toBe(true);
  });
});

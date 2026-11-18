import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Profile, type Job } from '@reboundops/contracts';
import {
  applyResumeUpdate,
  buildCoverLetter,
  buildResumeDraft,
  decodeResumeFile,
  docxToText,
  exportDocument,
  parseResumeText,
  pdfTextOf,
  readZip,
  renderDocx,
  renderPdf,
  toYearMonth,
  UnsupportedResumeError,
  writeZip,
  ZipError,
} from '../src/index.ts';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const resumeText = readFileSync(new URL('../../../tests/fixtures/resumes/jordan-fictional.txt', import.meta.url), 'utf8');
const posting = readFileSync(new URL('../../../tests/fixtures/jobs/labelled.txt', import.meta.url), 'utf8');

const job: Job = {
  id: 'j1',
  title: 'Senior Platform Engineer',
  employer: 'Brightwater Analytics',
  location: 'Lisbon, Portugal',
  salary: null,
  workArrangement: 'hybrid',
  sourceUrl: null,
  description: posting,
  provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null },
  verification: { status: 'unverified', checkedAt: null, note: '' },
  dedupeKey: 'k',
  capturedAt: NOW.toISOString(),
};

/** The parsed proposal, as if the person reviewed and verified everything. */
function verifiedProfile(): Profile {
  const { proposal } = parseResumeText(resumeText);
  return Profile.parse({
    displayName: proposal.displayName,
    headline: proposal.headline,
    contact: proposal.contact,
    skills: proposal.skills,
    experience: proposal.experience.map((e) => ({ ...e, verified: true })),
    education: proposal.education.map((e) => ({ ...e, verified: true })),
    certifications: proposal.certifications.map((c) => ({ ...c, verified: true })),
    updatedAt: NOW.toISOString(),
  });
}

describe('resume parsing', () => {
  it('extracts contact, experience, education, skills and certifications as unverified facts', () => {
    const { proposal, warnings } = parseResumeText(resumeText);
    expect(proposal.displayName).toBe('Jordan Fictional');
    expect(proposal.headline).toBe('Platform engineer focused on reliable developer tooling');
    expect(proposal.contact.email).toBe('jordan.fictional@example.test');
    expect(proposal.contact.phone).toBe('+351 000 000 000');
    expect(proposal.contact.location).toBe('Lisbon, Portugal');
    expect(proposal.contact.links.map((l) => l.label)).toEqual(['LinkedIn', 'GitHub']);

    expect(proposal.experience).toHaveLength(2);
    expect(proposal.experience[0]).toMatchObject({ title: 'Senior Platform Engineer', employer: 'Lumenfield Systems', start: '2022-03', end: null, verified: false });
    expect(proposal.experience[0]!.highlights).toHaveLength(3);
    expect(proposal.experience[1]).toMatchObject({ title: 'Software Engineer', employer: 'Northgate Freight', start: '2018-06', end: '2022-02' });

    expect(proposal.education[0]).toMatchObject({ institution: 'University of Porto', qualification: 'BSc Computer Science', end: '2018-12' });
    expect(proposal.skills).toEqual(['TypeScript', 'PostgreSQL', 'Kubernetes', 'Terraform', 'Go']);
    expect(proposal.certifications[0]).toMatchObject({ name: 'Certified Kubernetes Administrator', issuer: 'CNCF', date: '2023-12' });
    expect(warnings.at(-1)).toMatch(/unverified/);
  });

  it('normalises resume dates', () => {
    expect(toYearMonth('September 2020', 'start')).toBe('2020-09');
    expect(toYearMonth('2019/4', 'start')).toBe('2019-04');
    expect(toYearMonth('04.2019', 'start')).toBe('2019-04');
    expect(toYearMonth('2017', 'end')).toBe('2017-12');
    expect(toYearMonth('Present', 'end')).toBeNull();
  });

  it('imports DOCX and Markdown, refuses PDF and binaries', () => {
    const docx = renderDocx(resumeText.split('\n').filter(Boolean).map((text) => ({ type: 'para' as const, text })), { title: 'x' });
    const decoded = decodeResumeFile('cv.docx', docx);
    expect(decoded.text).toContain('Lumenfield Systems');
    expect(decoded.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(parseResumeText(decoded.text).proposal.experience).toHaveLength(2);

    expect(decodeResumeFile('cv.md', Buffer.from('# Ada Example\n- [Site](https://example.test)')).text).toBe('Ada Example\n• Site https://example.test');
    expect(() => decodeResumeFile('cv.pdf', Buffer.from('%PDF-1.7'))).toThrow(UnsupportedResumeError);
    expect(() => decodeResumeFile('cv.txt', Buffer.from([0x41, 0x00, 0x42]))).toThrow(UnsupportedResumeError);
  });
});

describe('zip', () => {
  it('round-trips and enforces size limits', () => {
    const z = writeZip([{ name: 'a.txt', data: 'hello' }, { name: 'b/c.xml', data: 'x'.repeat(10_000) }]);
    const files = readZip(z);
    expect(files.get('a.txt')?.toString()).toBe('hello');
    expect(() => readZip(z, undefined, { maxEntries: 10, maxTotalUncompressed: 1000, maxEntryUncompressed: 1000 })).toThrow(ZipError);
    expect(() => readZip(Buffer.from('not a zip at all, definitely not'))).toThrow(ZipError);
  });
});

describe('tailoring', () => {
  it('builds a resume draft only from verified facts, ordering highlights by relevance without rewording', () => {
    const profile = verifiedProfile();
    const d = buildResumeDraft({ applicationId: 'a1', job, profile, now: NOW });
    expect(d.experience.map((e) => e.employer)).toEqual(['Lumenfield Systems', 'Northgate Freight']);
    const first = d.experience[0]!.highlights;
    expect(first[0]!.text).toMatch(/TypeScript|PostgreSQL/);
    for (const h of d.experience.flatMap((e) => e.highlights)) expect(h.text).toBe(h.originalText);
    const all = profile.experience.flatMap((e) => e.highlights);
    for (const h of d.experience.flatMap((e) => e.highlights)) expect(all).toContain(h.text);
    expect(d.skills.filter((s) => s.matched).map((s) => s.name)).toEqual(['TypeScript', 'PostgreSQL']);
  });

  it('leaves unverified entries out and says so', () => {
    const p = verifiedProfile();
    p.experience[1]!.verified = false;
    const d = buildResumeDraft({ applicationId: 'a1', job, profile: p, now: NOW });
    expect(d.experience).toHaveLength(1);
    expect(d.warnings[0]).toMatch(/1 experience entry is not marked verified/);
  });

  it('tracks edits but does not let facts change', () => {
    const d = buildResumeDraft({ applicationId: 'a1', job, profile: verifiedProfile(), now: NOW });
    const e = d.experience[0]!;
    const h = e.highlights[0]!;
    const next = applyResumeUpdate(d, { summary: 'Edited summary', experience: [{ factId: e.factId, include: true, highlights: [{ id: h.id, text: 'Reworded by me', include: true }] }] }, NOW);
    expect(next.summary.origin).toBe('edited');
    const nh = next.experience[0]!.highlights.find((x) => x.id === h.id)!;
    expect(nh).toMatchObject({ text: 'Reworded by me', origin: 'edited', originalText: h.originalText });
    expect(() => applyResumeUpdate(d, { experience: [{ factId: 'nope', include: true, highlights: [] }] }, NOW)).toThrow(/Unknown experience/);
  });

  it('drafts a cover letter from facts with explicit placeholders and sentence sources', () => {
    const profile = verifiedProfile();
    const resume = buildResumeDraft({ applicationId: 'a1', job, profile, now: NOW });
    const letter = buildCoverLetter({ applicationId: 'a1', job, profile, now: NOW, resume });
    expect(letter.text).toContain('Dear Hiring Team at Brightwater Analytics,');
    expect(letter.text).toContain('I currently work as Senior Platform Engineer at Lumenfield Systems, where I have been since Mar 2022.');
    expect(letter.text).toContain('[[Add a sentence on why Brightwater Analytics');
    expect(letter.text).toContain('The role calls for TypeScript and PostgreSQL');
    expect(letter.sources.every((s) => letter.text.includes(s.sentence))).toBe(true);
  });
});

describe('export', () => {
  const profile = verifiedProfile();
  const resume = buildResumeDraft({ applicationId: 'a1', job, profile, now: NOW });

  for (const format of ['pdf', 'docx'] as const) {
    it(`${format}: keeps education, every employer and date, the most recent employer and links`, () => {
      const r = exportDocument({ kind: 'resume', format, resume, coverLetter: null, profile, employer: job.employer });
      expect(r.check).toMatchObject({ ok: true, missing: [], problems: [] });
      expect(r.check.checked).toEqual(expect.arrayContaining(['Education University of Porto', 'Most recent employer Lumenfield Systems', 'Dates for Northgate Freight']));
      expect(r.check.checked.some((c) => c.includes('linkedin.com'))).toBe(true);
      const text = format === 'pdf' ? pdfTextOf(r.data) : docxToText(r.data);
      expect(text).toContain('Mar 2022 – Present');
      expect(text).toContain('Jun 2018 – Feb 2022');
      expect(r.filename).toBe(`Jordan Fictional Brightwater Analytics Resume.${format}`);
    });
  }

  it('produces a structurally valid PDF with real text', () => {
    const { pdf, unsupported } = renderPdf([{ type: 'title', text: 'Zoë Ünïcode €100 – ok' }, { type: 'para', text: 'word '.repeat(2500) }], { title: 't' });
    const s = pdf.toString('latin1');
    expect(s.startsWith('%PDF-1.4')).toBe(true);
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true);
    const xref = Number(/startxref\n(\d+)/.exec(s)![1]);
    expect(s.slice(xref, xref + 4)).toBe('xref');
    expect(Number(/\/Count (\d+)/.exec(s)![1])).toBeGreaterThanOrEqual(2);
    expect(unsupported).toEqual([]);
    expect(pdfTextOf(pdf)).toContain('Zoë Ünïcode €100 – ok');
    expect(renderPdf([{ type: 'para', text: 'Emoji 🚀' }], { title: 't' }).unsupported).toEqual(['🚀']);
  });

  it('refuses to pass a cover letter with placeholders, and a resume missing the latest role', () => {
    const letter = buildCoverLetter({ applicationId: 'a1', job, profile, now: NOW, resume });
    const r = exportDocument({ kind: 'cover_letter', format: 'pdf', resume, coverLetter: letter, profile, employer: job.employer });
    expect(r.check.ok).toBe(false);
    expect(r.check.problems[0]).toMatch(/Replace 1 placeholder/);

    const filled = { ...letter, text: letter.text.replace(/\[\[[^\]]*\]\]/g, 'Your data platform work matches mine.') };
    expect(exportDocument({ kind: 'cover_letter', format: 'docx', resume, coverLetter: filled, profile, employer: job.employer }).check.ok).toBe(true);

    const noLatest = applyResumeUpdate(resume, { experience: [{ factId: resume.experience[0]!.factId, include: false, highlights: [] }] }, NOW);
    const r2 = exportDocument({ kind: 'resume', format: 'docx', resume: noLatest, coverLetter: null, profile, employer: job.employer });
    expect(r2.check.ok).toBe(false);
    expect(r2.check.problems[0]).toMatch(/most recent role/);
  });
});

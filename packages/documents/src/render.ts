import type { CoverLetterDraft, DocumentKind, ExportCheck, ExportFormat, Profile, ResumeDraft } from '@reboundops/contracts';
import { type Block, formatYearMonth } from './blocks.ts';
import { docxToText, renderDocx } from './docx.ts';
import { pdfTextOf, renderPdf } from './pdf.ts';
import { PLACEHOLDER, sortExperience } from './tailor.ts';

const sep = ' · ';

function contactBlocks(h: ResumeDraft['header']): Block[] {
  const blocks: Block[] = [];
  const contact = [h.email, h.phone, h.location].filter(Boolean).join(sep);
  if (contact) blocks.push({ type: 'meta', text: contact });
  if (h.links.length) blocks.push({ type: 'meta', text: h.links.map((l) => (l.label ? `${l.label}: ${l.url}` : l.url)).join(sep) });
  return blocks;
}

export function resumeBlocks(d: ResumeDraft): Block[] {
  const b: Block[] = [];
  if (d.header.name) b.push({ type: 'title', text: d.header.name });
  b.push(...contactBlocks(d.header));
  if (d.summary.text.trim()) b.push({ type: 'heading', text: 'SUMMARY' }, { type: 'para', text: d.summary.text.trim() });

  const exp = d.experience.filter((e) => e.include);
  if (exp.length) {
    b.push({ type: 'heading', text: 'EXPERIENCE' });
    for (const e of exp) {
      b.push({ type: 'role', text: `${e.title} — ${e.employer}` });
      b.push({ type: 'meta', text: `${formatYearMonth(e.start)} – ${formatYearMonth(e.end)}` });
      for (const h of e.highlights.filter((x) => x.include)) b.push({ type: 'bullet', text: h.text });
    }
  }
  const skills = d.skills.filter((s) => s.include).map((s) => s.name);
  if (skills.length) b.push({ type: 'heading', text: 'SKILLS' }, { type: 'para', text: skills.join(', ') });

  if (d.education.length) {
    b.push({ type: 'heading', text: 'EDUCATION' });
    for (const e of d.education) {
      const what = [e.qualification, e.field].filter(Boolean).join(', ');
      b.push({ type: 'role', text: what ? `${what} — ${e.institution}` : e.institution });
      const dates = e.start ? `${formatYearMonth(e.start)} – ${formatYearMonth(e.end)}` : e.end ? formatYearMonth(e.end) : '';
      if (dates) b.push({ type: 'meta', text: dates });
    }
  }
  if (d.certifications.length) {
    b.push({ type: 'heading', text: 'CERTIFICATIONS' });
    for (const c of d.certifications) {
      b.push({ type: 'bullet', text: [c.name, c.issuer].filter(Boolean).join(' — ') + (c.date ? ` (${formatYearMonth(c.date)})` : '') });
    }
  }
  return b;
}

export function coverLetterBlocks(letter: CoverLetterDraft, header: ResumeDraft['header']): Block[] {
  const b: Block[] = [];
  if (header.name) b.push({ type: 'subtitle', text: header.name });
  b.push(...contactBlocks(header));
  b.push({ type: 'para', text: '' });
  for (const para of letter.text.split(/\n\s*\n/)) {
    for (const line of para.split('\n')) {
      if (/^\s*[-•]\s+/.test(line)) b.push({ type: 'bullet', text: line.replace(/^\s*[-•]\s+/, '') });
      else if (line.trim()) b.push({ type: 'para', text: line.trim() });
    }
    b.push({ type: 'para', text: '' });
  }
  return b;
}

/** Strings that must survive in the exported file, with a human label each. */
export function requiredContent(kind: DocumentKind, resume: ResumeDraft, profile: Profile): { label: string; text: string }[] {
  const req: { label: string; text: string }[] = [];
  if (resume.header.name) req.push({ label: 'Name', text: resume.header.name });
  for (const l of resume.header.links) req.push({ label: `Link ${l.url}`, text: l.url });
  if (kind === 'cover_letter') return req;
  for (const e of resume.experience.filter((x) => x.include)) {
    req.push({ label: `Employer ${e.employer}`, text: e.employer });
    req.push({ label: `Title ${e.title}`, text: e.title });
    req.push({ label: `Dates for ${e.employer}`, text: `${formatYearMonth(e.start)} – ${formatYearMonth(e.end)}` });
  }
  for (const e of resume.education) {
    req.push({ label: `Education ${e.institution}`, text: e.institution });
    if (e.qualification) req.push({ label: `Qualification ${e.qualification}`, text: e.qualification });
    if (e.end) req.push({ label: `Education date ${e.institution}`, text: formatYearMonth(e.end) });
  }
  const last = sortExperience(profile.experience.filter((x) => x.verified))[0];
  if (last) req.push({ label: `Most recent employer ${last.employer}`, text: last.employer });
  return req;
}

const squash = (s: string) => s.normalize('NFC').replace(/\s+/g, '').toLowerCase();

export function verifyContent(extracted: string, required: { label: string; text: string }[], extraProblems: string[] = []): ExportCheck {
  const hay = squash(extracted);
  const missing = required.filter((r) => !hay.includes(squash(r.text))).map((r) => r.label);
  return { ok: missing.length === 0 && extraProblems.length === 0, checked: required.map((r) => r.label), missing, problems: extraProblems };
}

export interface ExportResult {
  data: Buffer;
  mediaType: string;
  filename: string;
  check: ExportCheck;
}

const safeName = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, ' ').slice(0, 60) || 'document';

/** Renders a document and re-reads the output to prove the required facts survived. */
export function exportDocument(args: {
  kind: DocumentKind;
  format: ExportFormat;
  resume: ResumeDraft;
  coverLetter: CoverLetterDraft | null;
  profile: Profile;
  employer: string;
}): ExportResult {
  const { kind, format, resume, coverLetter, profile } = args;
  const problems: string[] = [];
  let blocks: Block[];
  if (kind === 'resume') blocks = resumeBlocks(resume);
  else {
    if (!coverLetter) throw new Error('No cover letter draft.');
    const placeholders = coverLetter.text.match(PLACEHOLDER) ?? [];
    if (placeholders.length) problems.push(`Replace ${placeholders.length} placeholder${placeholders.length === 1 ? '' : 's'}: ${placeholders.join(' ')}`);
    blocks = coverLetterBlocks(coverLetter, resume.header);
  }
  const last = sortExperience(profile.experience.filter((x) => x.verified))[0];
  if (kind === 'resume' && last && !resume.experience.some((e) => e.factId === last.id && e.include)) {
    problems.push(`Your most recent role (${last.title} at ${last.employer}) is excluded; include it so the resume has no unexplained gap.`);
  }

  const title = `${resume.header.name || 'Resume'} — ${kind === 'resume' ? 'Resume' : 'Cover letter'}`;
  let data: Buffer;
  let text: string;
  if (format === 'pdf') {
    const r = renderPdf(blocks, { title });
    if (r.unsupported.length) problems.push(`These characters cannot be shown in the PDF: ${r.unsupported.join(' ')}. Use DOCX or remove them.`);
    data = r.pdf;
    text = pdfTextOf(data);
  } else {
    data = renderDocx(blocks, { title });
    text = docxToText(data);
  }
  const check = verifyContent(text, requiredContent(kind, resume, profile), problems);
  const base = safeName(`${resume.header.name || 'Resume'} ${args.employer} ${kind === 'resume' ? 'Resume' : 'Cover Letter'}`);
  return {
    data,
    mediaType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    filename: `${base}.${format}`,
    check,
  };
}

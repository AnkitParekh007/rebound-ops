import { createHash, randomUUID } from 'node:crypto';
import type { CertificationEntry, EducationEntry, ExperienceEntry, ResumeProposal } from '@reboundops/contracts';
import { docxToText } from './docx.ts';
import { extractPdfText } from './pdf-import.ts';

/**
 * Turns a master resume into a *proposal* of profile facts. Nothing here is
 * trusted: every proposed entry is unverified, and the person reviews and
 * confirms before it is written to their profile.
 */

export class UnsupportedResumeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedResumeError';
  }
}

export interface DecodedResume {
  mediaType: string;
  text: string;
  sha256: string;
  size: number;
}

const MAX_TEXT = 200_000;

export function isPdf(filename: string, bytes: Buffer): boolean {
  return bytes.subarray(0, 5).toString('latin1') === '%PDF-' || filename.toLowerCase().endsWith('.pdf');
}

export interface DecodedResumeWithExtraction extends DecodedResume {
  extraction: { method: 'pdf_text' | 'docx' | 'text'; confidence: 'high' | 'medium' | 'low'; pages: number | null; links: string[] };
  warnings: string[];
}

/** Decodes any supported resume file, including selectable-text PDFs (read locally with pdf.js). */
export async function decodeResumeFileAsync(filename: string, bytes: Buffer): Promise<DecodedResumeWithExtraction> {
  if (isPdf(filename, bytes)) {
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const pdf = await extractPdfText(bytes);
    return {
      mediaType: 'application/pdf',
      text: pdf.text.slice(0, MAX_TEXT),
      sha256,
      size: bytes.length,
      extraction: { method: 'pdf_text', confidence: pdf.confidence, pages: pdf.pages, links: pdf.links },
      warnings: pdf.warnings,
    };
  }
  const d = decodeResumeFile(filename, bytes);
  return { ...d, extraction: { method: d.mediaType.includes('wordprocessingml') ? 'docx' : 'text', confidence: 'high', pages: null, links: [] }, warnings: [] };
}

export function decodeResumeFile(filename: string, bytes: Buffer): DecodedResume {
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  const isZip = bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (isPdf(filename, bytes)) {
    throw new UnsupportedResumeError('PDF files are read with decodeResumeFileAsync.');
  }
  if (ext === 'docx' || isZip) {
    if (!isZip) throw new UnsupportedResumeError('This .docx file is not a valid Word document.');
    return {
      mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      text: docxToText(bytes).slice(0, MAX_TEXT),
      sha256,
      size: bytes.length,
    };
  }
  if (ext === 'doc' || ext === 'rtf' || ext === 'pages' || ext === 'odt') {
    throw new UnsupportedResumeError(`.${ext} files are not supported. Save as .docx or .txt.`);
  }
  if (bytes.includes(0)) throw new UnsupportedResumeError('This file does not look like text.');
  const text = bytes.toString('utf8');
  return { mediaType: ext === 'md' ? 'text/markdown' : 'text/plain', text: (ext === 'md' ? stripMarkdown(text) : text).slice(0, MAX_TEXT), sha256, size: bytes.length };
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '$1 $2')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/`([^`]+)`/g, '$1');
}

/* ---------------- section detection ---------------- */

type SectionKey = 'summary' | 'experience' | 'education' | 'skills' | 'certifications' | 'other';

const HEADINGS: [SectionKey, RegExp][] = [
  ['summary', /^(summary|profile|professional summary|about( me)?|objective)$/i],
  ['experience', /^(experience|work experience|professional experience|employment( history)?|work history|career history)$/i],
  ['education', /^(education|education and training|academic background|qualifications)$/i],
  ['skills', /^(skills|technical skills|core skills|key skills|skills and tools|competencies)$/i],
  ['certifications', /^(certifications?|licen[cs]es( and certifications)?|certificates)$/i],
  ['other', /^(projects|publications|volunteering|volunteer experience|interests|languages|references|awards)$/i],
];

function headingOf(line: string): SectionKey | null {
  const clean = line.replace(/[:\s]+$/, '').trim();
  if (clean.length > 40) return null;
  for (const [key, re] of HEADINGS) if (re.test(clean)) return key;
  return null;
}

/* ---------------- dates ---------------- */

const MONTH_NAMES: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
};
const DATE = String.raw`(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4}[-/.](?:0?[1-9]|1[0-2])|(?:0?[1-9]|1[0-2])[/.]\d{4}|\d{4})`;
const END = String.raw`(?:${DATE}|present|current|now|today)`;
export const DATE_RANGE = new RegExp(String.raw`(${DATE})\s*(?:-|–|—|to|until)\s*(${END})`, 'i');

/** Normalises a resume date to YYYY-MM. Year-only dates become January (start) or December (end). */
export function toYearMonth(raw: string, role: 'start' | 'end'): string | null {
  const s = raw.trim().toLowerCase();
  if (/^(present|current|now|today)$/.test(s)) return null;
  let m = /^([a-z]+)\.?\s+(\d{4})$/.exec(s);
  if (m) {
    const month = MONTH_NAMES[m[1]!.slice(0, 4)] ?? MONTH_NAMES[m[1]!.slice(0, 3)];
    return month ? `${m[2]}-${month}` : null;
  }
  m = /^(\d{4})[-/.](\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${m[2]!.padStart(2, '0')}`;
  m = /^(\d{1,2})[/.](\d{4})$/.exec(s);
  if (m) return `${m[2]}-${m[1]!.padStart(2, '0')}`;
  m = /^(\d{4})$/.exec(s);
  if (m) return `${m[1]}-${role === 'start' ? '01' : '12'}`;
  return null;
}

/* ---------------- parsing ---------------- */

const BULLET = /^\s*(?:[•●▪◦‣∙·*\-–]|\d+[.)])\s+/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{2,4}(?:[\s.-]?\d{2,4}){2,4}/;
const URL_RE = /\bhttps?:\/\/[^\s<>()]+|\b(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com)\/[^\s<>()]+/gi;

function splitRoleLine(text: string): { title: string; employer: string } | null {
  const t = text.replace(/[,|–—-]\s*$/, '').trim();
  if (!t) return null;
  const at = /^(.+?)\s+(?:at|@)\s+(.+)$/i.exec(t);
  if (at) return { title: at[1]!.trim(), employer: at[2]!.trim() };
  const parts = t.split(/\s+[|–—]\s+|\s+-\s+|,\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { title: parts[0]!, employer: parts[1]! };
  return null;
}

const id = () => randomUUID();

export interface ParseResult {
  proposal: ResumeProposal;
  warnings: string[];
}

export function parseResumeText(raw: string): ParseResult {
  const warnings: string[] = [];
  const lines = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.trim());

  const sections: Record<SectionKey | 'header', string[]> = { header: [], summary: [], experience: [], education: [], skills: [], certifications: [], other: [] };
  let current: SectionKey | 'header' = 'header';
  for (const line of lines) {
    const h = headingOf(line.trim());
    if (h) current = h;
    else sections[current].push(line.trim());
  }

  // Header: name, headline, contact.
  const header = sections.header;
  const all = lines.join('\n');
  const email = EMAIL.exec(all)?.[0] ?? '';
  const urls = [...new Set([...all.matchAll(URL_RE)].map((m) => m[0].replace(/[.,;]+$/, '')))];
  const links = urls.slice(0, 10).map((u) => {
    const url = /^https?:/i.test(u) ? u : `https://${u}`;
    const label = /linkedin/i.test(url) ? 'LinkedIn' : /github/i.test(url) ? 'GitHub' : /gitlab/i.test(url) ? 'GitLab' : 'Website';
    return { label, url };
  });
  const headerText = header.join('\n');
  const phoneMatch = PHONE.exec(headerText.replace(EMAIL, ' ').replace(URL_RE, ' '));
  const phone = phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7 ? phoneMatch[0].trim() : '';
  const contactish = (l: string) => EMAIL.test(l) || new RegExp(URL_RE.source, 'i').test(l) || (phone && l.includes(phone));
  const nameLine = header.find((l) => !contactish(l) && l.length <= 60 && !/\d/.test(l));
  const headline = header.find((l) => l !== nameLine && !contactish(l) && l.length <= 120) ?? '';
  const locationLine = header.find((l) => contactish(l))?.split(/[|•·]/).map((s) => s.trim()).find((s) => /^[A-Za-zÀ-ÿ .'-]+,\s*[A-Za-zÀ-ÿ .'-]+$/.test(s)) ?? '';

  // Experience: a line with a date range starts an entry; the role is on that line or the line above.
  const experience: ExperienceEntry[] = [];
  const expLines = sections.experience;
  let currentExp: ExperienceEntry | null = null;
  expLines.forEach((line, i) => {
    const range = DATE_RANGE.exec(line);
    if (range) {
      const before = line.slice(0, range.index).trim();
      const after = line.slice(range.index + range[0].length).replace(/^[\s,|–—-]+/, '').trim();
      const role = splitRoleLine(before) ?? splitRoleLine(after) ?? (i > 0 && !BULLET.test(expLines[i - 1]!) ? splitRoleLine(expLines[i - 1]!) : null);
      const start = toYearMonth(range[1]!, 'start');
      if (!start) return;
      if (currentExp && role && i > 0 && currentExp.highlights.at(-1) === expLines[i - 1]) currentExp.highlights.pop();
      currentExp = {
        id: id(),
        employer: role?.employer ?? '',
        title: role?.title ?? (before || 'Role'),
        start,
        end: toYearMonth(range[2]!, 'end'),
        summary: '',
        highlights: [],
        verified: false,
      };
      if (!role) warnings.push(`Could not tell the job title and employer apart in: "${line.slice(0, 80)}"`);
      experience.push(currentExp);
    } else if (currentExp) {
      if (BULLET.test(line)) currentExp.highlights.push(line.replace(BULLET, '').trim());
      else if (!DATE_RANGE.test(expLines[i + 1] ?? '')) {
        if (currentExp.highlights.length) currentExp.highlights.push(line);
        else currentExp.summary = [currentExp.summary, line].filter(Boolean).join(' ');
      }
    }
  });
  for (const e of experience) {
    if (!e.employer) e.employer = 'Unknown employer';
    e.highlights = e.highlights.filter(Boolean).slice(0, 30);
  }
  if (sections.experience.length && !experience.length) warnings.push('Found an experience section but no date ranges; add roles by hand.');

  // Education: institution lines, optionally with dates.
  const education: EducationEntry[] = [];
  for (const line of sections.education) {
    if (BULLET.test(line) && education.length) continue;
    const range = DATE_RANGE.exec(line);
    const yearOnly = /\b(19|20)\d{2}\b/.exec(line);
    const text = (range ? line.replace(range[0], '') : line).replace(/[,|–—-]\s*$/, '').trim();
    const parts = text.split(/\s+[|–—]\s+|,\s+|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
    const qualIdx = parts.findIndex((p) => /\b(bachelor|master|b\.?sc|m\.?sc|b\.?a|m\.?a|ph\.?d|mba|diploma|degree|certificate|associate|bsc|msc|btech|mtech|b\.?eng|m\.?eng)\b/i.test(p));
    const qualification = qualIdx >= 0 ? parts[qualIdx]! : '';
    const institution = parts.find((p, i) => i !== qualIdx && /\b(university|college|school|institute|academy|polytechnic)\b/i.test(p)) ?? parts.find((_, i) => i !== qualIdx) ?? '';
    if (!institution && !qualification) continue;
    if (!institution && education.length && !education.at(-1)!.qualification) {
      education.at(-1)!.qualification = qualification;
      continue;
    }
    education.push({
      id: id(),
      institution: institution || qualification,
      qualification: institution ? qualification : '',
      field: '',
      start: range ? toYearMonth(range[1]!, 'start') : null,
      end: range ? toYearMonth(range[2]!, 'end') : yearOnly ? toYearMonth(yearOnly[0], 'end') : null,
      verified: false,
    });
  }

  const certifications: CertificationEntry[] = sections.certifications
    .map((l) => l.replace(BULLET, '').trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((l) => {
      const year = /\b((?:19|20)\d{2})\b/.exec(l);
      const [name, issuer] = l.replace(/\(?\b(?:19|20)\d{2}\b\)?/, '').split(/\s+[|–—-]\s+|,\s+/).map((s) => s.trim());
      return { id: id(), name: name || l, issuer: issuer ?? '', date: year ? toYearMonth(year[1]!, 'end') : null, verified: false };
    });

  const skills = [
    ...new Set(
      sections.skills
        .flatMap((l) => l.replace(BULLET, '').replace(/^[^:]{1,30}:\s*/, '').split(/[,;•|]/))
        .map((s) => s.trim())
        .filter((s) => s && s.length <= 60),
    ),
  ].slice(0, 200);

  if (!nameLine) warnings.push('Could not find your name at the top of the resume.');
  if (!experience.length) warnings.push('No work experience entries were detected.');
  warnings.push('Everything imported is marked unverified until you review and confirm it.');

  return {
    proposal: {
      displayName: nameLine ?? '',
      headline: sections.summary[0] && sections.summary[0].length <= 200 && !headline ? sections.summary[0] : headline,
      contact: { email, phone, location: locationLine, links },
      experience,
      education,
      certifications,
      skills,
    },
    warnings,
  };
}

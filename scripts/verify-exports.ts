/**
 * Independent export check: renders a resume from the fictional fixture to PDF
 * and DOCX, then reads them back with tools that are not part of ReboundOps
 * (macOS `textutil` for DOCX, Apple PDFKit via `swift` for PDF) and confirms the
 * key facts survived. Tools that are not installed are reported as skipped.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Profile } from '@reboundops/contracts';
import { buildResumeDraft, exportDocument, parseResumeText } from '@reboundops/documents';

const dir = mkdtempSync(join(tmpdir(), 'rbo-exports-'));
const { proposal } = parseResumeText(readFileSync('tests/fixtures/resumes/jordan-fictional.txt', 'utf8'));
const profile = Profile.parse({
  ...proposal,
  experience: proposal.experience.map((e) => ({ ...e, verified: true })),
  education: proposal.education.map((e) => ({ ...e, verified: true })),
  certifications: proposal.certifications.map((c) => ({ ...c, verified: true })),
});
const job = {
  id: 'j', title: 'Platform Engineer', employer: 'Example', location: null, salary: null, workArrangement: null, sourceUrl: null, description: 'TypeScript',
  provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null },
  verification: { status: 'unverified', checkedAt: null, note: '' }, dedupeKey: 'k', capturedAt: new Date().toISOString(),
} as const;
const resume = buildResumeDraft({ applicationId: 'a', job, profile, now: new Date() });
const expected = ['Jordan Fictional', 'Lumenfield Systems', 'Mar 2022 – Present', 'Northgate Freight', 'Jun 2018 – Feb 2022', 'University of Porto', 'https://www.linkedin.com/in/jordan-fictional-example'];

let failed = false;
const check = (label: string, text: string) => {
  const missing = expected.filter((e) => !text.replace(/\s+/g, ' ').includes(e));
  console.log(`${label}: ${missing.length ? `FAIL — missing ${missing.join(', ')}` : 'PASS'}`);
  if (missing.length) failed = true;
};

for (const format of ['pdf', 'docx'] as const) {
  const r = exportDocument({ kind: 'resume', format, resume, coverLetter: null, profile, employer: 'Example' });
  writeFileSync(join(dir, `resume.${format}`), r.data);
  if (!r.check.ok) {
    console.log(`${format}: internal content check FAILED`);
    failed = true;
  }
}

try {
  check('DOCX via macOS textutil', execFileSync('textutil', ['-convert', 'txt', '-stdout', join(dir, 'resume.docx')], { encoding: 'utf8' }));
} catch {
  console.log('DOCX via macOS textutil: SKIPPED (tool not available)');
}
try {
  const swift = join(dir, 'pdf.swift');
  writeFileSync(swift, 'import PDFKit\nlet d = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!\nprint(d.string ?? "")\n');
  const cache = join(dir, 'mc');
  const out = execFileSync('swift', ['-module-cache-path', cache, swift, join(dir, 'resume.pdf')], { encoding: 'utf8', env: { ...process.env, CLANG_MODULE_CACHE_PATH: cache }, stdio: ['ignore', 'pipe', 'pipe'] });
  check('PDF via Apple PDFKit', out);
} catch {
  console.log('PDF via Apple PDFKit: SKIPPED (swift/PDFKit not available)');
}
rmSync(dir, { recursive: true, force: true });
if (failed) process.exitCode = 1;

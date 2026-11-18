/**
 * PDF resume import: text PDFs (written by ReboundOps' own PDF writer), plus
 * hand-built encrypted, scanned (no text), damaged and link-annotated files.
 * Fictional data only.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeResumeFileAsync, extractPdfText, linesFromItems, parseResumeText, PdfImportError, renderPdf, type Block } from '../src/index.ts';

const resumeText = readFileSync(new URL('../../../tests/fixtures/resumes/jordan-fictional.txt', import.meta.url), 'utf8');

/** Lays the fixture resume out as a document the way a person's exported resume would look. */
function resumePdf(): Buffer {
  const headings = new Set(['Experience', 'Education', 'Skills', 'Certifications']);
  const blocks: Block[] = resumeText
    .split('\n')
    .filter((l) => l.trim())
    .map((line, i) => ({
      type: i === 0 ? 'title' : headings.has(line.trim()) ? 'heading' : line.startsWith('•') ? 'bullet' : 'para',
      text: line.startsWith('•') ? line.slice(1).trim() : line,
    }));
  return renderPdf(blocks, { title: 'Resume' }).pdf;
}

import { buildPdf, font, page, stream } from '../../../tests/helpers/pdf-fixtures.ts';

describe('extractPdfText', () => {
  it('extracts a selectable-text resume in reading order and the parser recovers its sections', async () => {
    const pdf = resumePdf();
    const r = await extractPdfText(pdf);
    expect(r.pages).toBe(1);
    expect(r.confidence).toBe('high');
    expect(r.warnings).toEqual([]);
    for (const s of ['Jordan Fictional', 'Senior Platform Engineer at Lumenfield Systems', 'Mar 2022', 'BSc Computer Science, University of Porto, 2018', 'https://github.com/jordan-fictional-example']) {
      expect(r.text).toContain(s);
    }
    expect(r.text.indexOf('Experience')).toBeLessThan(r.text.indexOf('Education'));

    const { proposal } = parseResumeText(r.text);
    expect(proposal.experience.map((e) => e.employer)).toEqual(expect.arrayContaining(['Lumenfield Systems', 'Northgate Freight']));
    expect(proposal.experience.find((e) => e.employer === 'Lumenfield Systems')).toMatchObject({ title: 'Senior Platform Engineer', start: '2022-03', end: null });
    expect(proposal.skills).toEqual(expect.arrayContaining(['TypeScript', 'PostgreSQL', 'Kubernetes']));
    expect(proposal.education.length).toBeGreaterThan(0);
    // Every imported fact is a proposal awaiting review.
    expect(proposal.experience.every((e) => e.verified === false)).toBe(true);
  });

  it('keeps link-annotation targets even when the visible text is only a label', async () => {
    const content = 'BT /F1 12 Tf 72 760 Td (Alex Example - Product Designer) Tj 0 -20 Td (Portfolio) Tj ET\n' + 'BT /F1 11 Tf 72 700 Td (Experience) Tj 0 -16 Td (Designer at Example Studio, Jan 2020 - Present) Tj 0 -16 Td (Led research for three products and wrote the design system guidelines.) Tj ET';
    const pdf = buildPdf([
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      page('5 0 R', '/Annots [6 0 R]'),
      font,
      stream(content),
      '<< /Type /Annot /Subtype /Link /Rect [72 735 140 750] /A << /S /URI /URI (https://portfolio.example.test/alex) >> >>',
    ]);
    const r = await extractPdfText(pdf);
    expect(r.links).toEqual(['https://portfolio.example.test/alex']);
    expect(r.text).toContain('Links found in the PDF:\nhttps://portfolio.example.test/alex');
  });

  it('detects a scanned / image-only PDF and asks for manual text', async () => {
    const pdf = buildPdf([
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      page('5 0 R'),
      font,
      stream('q 0.2 g 72 72 451 698 re f Q'),
    ]);
    await expect(extractPdfText(pdf)).rejects.toMatchObject({ problem: 'scanned', message: expect.stringMatching(/no selectable text.*paste/i) });
  });

  it('detects a password-protected PDF', async () => {
    const hex32 = 'A'.repeat(64);
    const pdf = buildPdf(
      [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        page('5 0 R'),
        font,
        stream('BT /F1 12 Tf 72 760 Td (secret) Tj ET'),
        `<< /Filter /Standard /V 1 /R 2 /O <${hex32}> /U <${hex32}> /P -4 >>`,
      ],
      '/Encrypt 6 0 R /ID [<00112233445566778899AABBCCDDEEFF> <00112233445566778899AABBCCDDEEFF>] ',
    );
    await expect(extractPdfText(pdf)).rejects.toMatchObject({ problem: 'encrypted' });
  });

  it('rejects damaged and non-PDF files without crashing', async () => {
    await expect(extractPdfText(Buffer.from('hello, not a pdf'))).rejects.toBeInstanceOf(PdfImportError);
    const truncated = resumePdf().subarray(0, 300);
    await expect(extractPdfText(truncated)).rejects.toBeInstanceOf(PdfImportError);
    await expect(extractPdfText(Buffer.from('%PDF-1.7\n%%EOF\n'))).rejects.toBeInstanceOf(PdfImportError);
  });

  it('routes .pdf uploads through the PDF reader and records the extraction method', async () => {
    const d = await decodeResumeFileAsync('cv.pdf', resumePdf());
    expect(d.mediaType).toBe('application/pdf');
    expect(d.extraction).toMatchObject({ method: 'pdf_text', confidence: 'high', pages: 1 });
    const t = await decodeResumeFileAsync('cv.txt', Buffer.from(resumeText));
    expect(t.extraction.method).toBe('text');
  });
});

describe('linesFromItems', () => {
  const item = (s: string, x: number, y: number, width = s.length * 5) => ({ str: s, transform: [10, 0, 0, 10, x, y], width });
  it('orders lines top to bottom and joins runs on the same baseline', () => {
    const { lines } = linesFromItems([item('world', 130, 700), item('second', 72, 680), item('Hello', 72, 700)], 595);
    expect(lines).toEqual(['Hello world', 'second']);
  });
  it('counts wide gaps that suggest a second column', () => {
    const { lines, wideGaps } = linesFromItems([item('Left column', 40, 700, 60), item('Right column', 400, 700, 60)], 595);
    expect(wideGaps).toBe(1);
    expect(lines[0]).toMatch(/Left column\s{3}Right column/);
  });
});

/**
 * Local text extraction from selectable-text PDF resumes.
 *
 * Uses Mozilla's pdf.js (pdfjs-dist, Apache-2.0) purely as a parser: no
 * rendering, no system fonts, no network (the bytes are passed in memory). Nothing leaves the machine. The output is plain text plus an honest
 * account of how well extraction went; it is fed to the same review-first
 * resume parser as DOCX/TXT, so nothing becomes a profile fact without the
 * person confirming it.
 */

export type PdfProblem = 'encrypted' | 'scanned' | 'corrupt' | 'unsupported' | 'too_large';

export class PdfImportError extends Error {
  readonly problem: PdfProblem;
  constructor(problem: PdfProblem, message: string) {
    super(message);
    this.name = 'PdfImportError';
    this.problem = problem;
  }
}

export interface PdfExtraction {
  text: string;
  pages: number;
  /** Web links found in link annotations (kept even when the visible text differs). */
  links: string[];
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

export const MAX_PDF_PAGES = 15;
const MIN_CHARS_PER_PAGE = 40;

interface TextItemLike {
  str: string;
  transform: number[];
  width: number;
  hasEOL?: boolean;
}

function isTextItem(x: unknown): x is TextItemLike {
  return typeof x === 'object' && x !== null && typeof (x as TextItemLike).str === 'string' && Array.isArray((x as TextItemLike).transform);
}

/** Groups positioned text runs into reading-order lines (top to bottom, left to right). */
export function linesFromItems(items: readonly TextItemLike[], pageWidth: number): { lines: string[]; wideGaps: number } {
  const rows: { y: number; parts: { x: number; end: number; s: string }[] }[] = [];
  for (const it of items) {
    if (!it.str) continue;
    const x = it.transform[4] ?? 0;
    const y = it.transform[5] ?? 0;
    const size = Math.abs(it.transform[3] ?? 10) || 10;
    let row = rows.find((r) => Math.abs(r.y - y) <= size * 0.35);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, end: x + (it.width ?? 0), s: it.str });
  }
  rows.sort((a, b) => b.y - a.y);
  let wideGaps = 0;
  const lines = rows.map((r) => {
    r.parts.sort((a, b) => a.x - b.x);
    let out = '';
    let prevEnd: number | null = null;
    for (const p of r.parts) {
      if (prevEnd !== null) {
        const gap = p.x - prevEnd;
        if (gap > pageWidth * 0.18) wideGaps++;
        if (gap > 1 && !out.endsWith(' ') && !p.s.startsWith(' ')) out += gap > pageWidth * 0.18 ? '   ' : ' ';
      }
      out += p.s;
      prevEnd = p.end;
    }
    return out.replace(/\s+$/, '');
  });
  return { lines: lines.filter((l) => l.trim()), wideGaps };
}

const SAFE_LINK = /^(https?:\/\/|mailto:)[^\s]+$/i;

/** Extracts text from a PDF. Throws PdfImportError for encrypted, scanned, corrupt or oversized files. */
export async function extractPdfText(bytes: Uint8Array): Promise<PdfExtraction> {
  if (Buffer.from(bytes.subarray(0, 1024)).indexOf('%PDF-') === -1) throw new PdfImportError('corrupt', 'This file is not a PDF.');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes), // pdf.js takes ownership of the buffer
    disableFontFace: true,
    useSystemFonts: false,
    disableAutoFetch: true,
    disableStream: true,
    stopAtErrors: false,
    verbosity: 0,
  });
  let doc: Awaited<typeof task.promise>;
  try {
    doc = await task.promise;
  } catch (err) {
    const name = (err as { name?: string }).name ?? '';
    if (name === 'PasswordException') {
      throw new PdfImportError('encrypted', 'This PDF is password-protected. Remove the password (for example by printing it to a new PDF) or paste the resume text instead.');
    }
    if (name === 'InvalidPDFException') throw new PdfImportError('corrupt', 'This PDF is damaged or not a valid PDF. Try exporting it again, or paste the text instead.');
    throw new PdfImportError('unsupported', 'This PDF could not be read. Paste the resume text instead.');
  }
  try {
    if (doc.numPages > MAX_PDF_PAGES) {
      throw new PdfImportError('too_large', `This PDF has ${doc.numPages} pages; resumes up to ${MAX_PDF_PAGES} pages are supported. Paste the relevant text instead.`);
    }
    const warnings: string[] = [];
    const pageTexts: string[] = [];
    const links = new Set<string>();
    let wideGapTotal = 0;
    let lineTotal = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const { lines, wideGaps } = linesFromItems((content.items as unknown[]).filter(isTextItem), viewport.width);
      wideGapTotal += wideGaps;
      lineTotal += lines.length;
      pageTexts.push(lines.join('\n'));
      for (const a of (await page.getAnnotations()) as { subtype?: string; url?: string; unsafeUrl?: string }[]) {
        const url = a.url ?? a.unsafeUrl;
        if (a.subtype === 'Link' && typeof url === 'string' && SAFE_LINK.test(url) && url.length <= 500) links.add(url);
      }
      page.cleanup();
    }
    const text = pageTexts.join('\n\n').normalize('NFC');
    const chars = text.replace(/\s/g, '').length;
    if (chars < MIN_CHARS_PER_PAGE * doc.numPages) {
      throw new PdfImportError(
        'scanned',
        chars === 0
          ? 'This PDF has no selectable text — it looks like a scan or an image. ReboundOps does not run OCR; type or paste the resume text instead.'
          : 'This PDF has almost no selectable text — it may be a scan. Type or paste the resume text instead.',
      );
    }
    const replacement = (text.match(/�/g) ?? []).length;
    if (replacement > 5) warnings.push('Some characters could not be decoded (the PDF uses fonts without a text mapping). Check names, dates and symbols carefully.');
    if (lineTotal > 0 && wideGapTotal / lineTotal > 0.25) {
      warnings.push('The PDF looks like it has multiple columns. Lines from different columns may be merged; check each section carefully.');
    }
    // Visible text that is only a label ("LinkedIn") hides the address; keep the real link for review.
    const hidden = [...links].filter((l) => !text.includes(l.replace(/^mailto:/i, '')));
    const fullText = hidden.length ? `${text}\n\nLinks found in the PDF:\n${hidden.join('\n')}` : text;
    let confidence: PdfExtraction['confidence'] = 'high';
    if (warnings.length) confidence = 'medium';
    if (replacement > 50 || chars < 300) confidence = 'low';
    return { text: fullText, pages: doc.numPages, links: [...links], confidence, warnings };
  } finally {
    await task.destroy();
  }
}

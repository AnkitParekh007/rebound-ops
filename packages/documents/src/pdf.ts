import type { Block } from './blocks.ts';

/**
 * Minimal text-only PDF 1.4 writer using the standard Helvetica fonts with
 * WinAnsiEncoding. Every line is real text (selectable, searchable, ATS-readable);
 * there are no images, columns or text-as-graphics.
 */

// Helvetica advance widths (1/1000 em) for ASCII 32..126, from the standard font metrics.
const ASCII_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
  556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
  260, 334, 584,
];

// Unicode → WinAnsi for the 0x80–0x9F block (0xA0–0xFF match Latin-1).
const WIN_ANSI_HIGH: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};
const WIN_ANSI_REVERSE = new Map(Object.entries(WIN_ANSI_HIGH).map(([u, b]) => [b, Number(u)]));
const HIGH_WIDTHS: Record<number, number> = { 0x95: 350, 0x96: 556, 0x97: 1000, 0x85: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x99: 1000 };

function encodeChar(cp: number): number | null {
  if (cp >= 0x20 && cp <= 0x7e) return cp;
  if (cp >= 0xa0 && cp <= 0xff) return cp;
  return WIN_ANSI_HIGH[cp] ?? null;
}

function charWidth(code: number): number {
  if (code >= 32 && code <= 126) return ASCII_WIDTHS[code - 32]!;
  return HIGH_WIDTHS[code] ?? 556;
}

export interface PdfResult {
  pdf: Buffer;
  /** Characters that could not be represented and were replaced with "?". */
  unsupported: string[];
}

const STYLE: Record<Block['type'], { size: number; bold: boolean; before: number; indent: number }> = {
  title: { size: 20, bold: true, before: 0, indent: 0 },
  subtitle: { size: 12, bold: false, before: 2, indent: 0 },
  meta: { size: 9.5, bold: false, before: 2, indent: 0 },
  heading: { size: 11.5, bold: true, before: 14, indent: 0 },
  role: { size: 10.5, bold: true, before: 8, indent: 0 },
  para: { size: 10, bold: false, before: 3, indent: 0 },
  bullet: { size: 10, bold: false, before: 2, indent: 14 },
};

const PAGE = { w: 595.28, h: 841.89, margin: 56 };

export function renderPdf(blocks: readonly Block[], meta: { title: string }): PdfResult {
  const unsupported = new Set<string>();
  const encode = (text: string): number[] => {
    const out: number[] = [];
    for (const ch of text.normalize('NFC')) {
      const code = encodeChar(ch.codePointAt(0)!);
      if (code === null) {
        unsupported.add(ch);
        out.push(0x3f);
      } else out.push(code);
    }
    return out;
  };
  const widthOf = (codes: number[], size: number, bold: boolean) =>
    (codes.reduce((s, c) => s + charWidth(c), 0) * size * (bold ? 1.08 : 1)) / 1000;

  function wrap(text: string, size: number, bold: boolean, maxWidth: number): number[][] {
    const lines: number[][] = [];
    let line: number[] = [];
    const space = encode(' ');
    for (const word of text.split(/\s+/).filter(Boolean)) {
      let w = encode(word);
      const candidate = line.length ? [...line, ...space, ...w] : w;
      if (widthOf(candidate, size, bold) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line.length) lines.push(line);
      line = [];
      // Hard-break words longer than a line (e.g. long URLs).
      while (widthOf(w, size, bold) > maxWidth) {
        let cut = w.length - 1;
        while (cut > 1 && widthOf(w.slice(0, cut), size, bold) > maxWidth) cut--;
        lines.push(w.slice(0, cut));
        w = w.slice(cut);
      }
      line = w;
    }
    if (line.length) lines.push(line);
    return lines.length ? lines : [[]];
  }

  const hex = (codes: number[]) => codes.map((c) => c.toString(16).padStart(2, '0').toUpperCase()).join('');
  const pages: string[] = [];
  let ops: string[] = [];
  let y = PAGE.h - PAGE.margin;
  const newPage = () => {
    pages.push(ops.join('\n'));
    ops = [];
    y = PAGE.h - PAGE.margin;
  };

  for (const block of blocks) {
    const st = STYLE[block.type];
    const lineHeight = st.size * 1.32;
    const x = PAGE.margin + st.indent;
    const maxWidth = PAGE.w - PAGE.margin - x;
    const lines = wrap(block.text, st.size, st.bold, maxWidth);
    y -= st.before;
    lines.forEach((codes, i) => {
      if (y - lineHeight < PAGE.margin) newPage();
      y -= lineHeight;
      const font = st.bold ? 'F2' : 'F1';
      if (block.type === 'bullet' && i === 0) {
        ops.push(`BT /F1 ${st.size} Tf ${(PAGE.margin + 3).toFixed(2)} ${y.toFixed(2)} Td <95> Tj ET`);
      }
      ops.push(`BT /${font} ${st.size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td <${hex(codes)}> Tj ET`);
    });
    if (block.type === 'heading') {
      const ly = y - 3;
      ops.push(`0.6 0.6 0.6 RG 0.6 w ${PAGE.margin} ${ly.toFixed(2)} m ${(PAGE.w - PAGE.margin).toFixed(2)} ${ly.toFixed(2)} l S`);
      y -= 4;
    }
  }
  pages.push(ops.join('\n'));

  // Assemble objects: 1 catalog, 2 pages, 3 F1, 4 F2, 5 info, then (page, content) pairs.
  const objects: string[] = [];
  const pageIds = pages.map((_, i) => 6 + i * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  objects[5] = `<< /Title <FEFF${Buffer.from(meta.title, 'utf16le').swap16().toString('hex').toUpperCase()}> /Producer (ReboundOps) >>`;
  pages.forEach((content, i) => {
    const pageId = pageIds[i]!;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.w} ${PAGE.h}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`;
  });

  let body = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(body, 'latin1');
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(body, 'latin1');
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) body += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { pdf: Buffer.from(body, 'latin1'), unsupported: [...unsupported] };
}

/**
 * Extracts text from PDFs produced by `renderPdf` (uncompressed hex-string
 * Tj operators). Used to verify exported content, not as a general PDF reader.
 */
export function pdfTextOf(pdf: Buffer): string {
  const src = pdf.toString('latin1');
  const lines: string[] = [];
  for (const m of src.matchAll(/<([0-9A-F]*)> Tj/g)) {
    const hexStr = m[1] ?? '';
    let line = '';
    for (let i = 0; i < hexStr.length; i += 2) {
      const b = parseInt(hexStr.slice(i, i + 2), 16);
      line += String.fromCodePoint(WIN_ANSI_REVERSE.get(b) ?? b);
    }
    lines.push(line);
  }
  return lines.join('\n');
}

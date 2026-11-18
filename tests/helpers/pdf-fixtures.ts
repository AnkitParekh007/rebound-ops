/** Hand-built PDF fixtures for tests (no personal data). */

/** Minimal PDF assembler with a correct cross-reference table. */
export function buildPdf(objects: string[], trailerExtra = ''): Buffer {
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R ${trailerExtra}>>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

export const stream = (s: string) => `<< /Length ${Buffer.byteLength(s, 'latin1')} >>\nstream\n${s}\nendstream`;
export const page = (contents: string, extra = '') =>
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contents} /Resources << /Font << /F1 4 0 R >> >> ${extra}>>`;
export const font = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';


/** A one-page PDF whose only content is a filled rectangle: what a scan looks like to a text extractor. */
export function imageOnlyPdf(): Buffer {
  return buildPdf(['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', page('5 0 R'), font, stream('q 0.2 g 72 72 451 698 re f Q')]);
}

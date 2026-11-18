/** Format-neutral document model rendered identically to PDF and DOCX. */
export type BlockType = 'title' | 'subtitle' | 'meta' | 'heading' | 'role' | 'para' | 'bullet';

export interface Block {
  type: BlockType;
  text: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2021-03" → "Mar 2021"; null → "Present" (for end dates). */
export function formatYearMonth(ym: string | null, nullLabel = 'Present'): string {
  if (!ym) return nullLabel;
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1] ?? ''} ${y}`.trim();
}

export function plainText(blocks: readonly Block[]): string {
  return blocks.map((b) => (b.type === 'bullet' ? `• ${b.text}` : b.text)).join('\n');
}

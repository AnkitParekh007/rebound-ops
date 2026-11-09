import type { Intake } from '@reboundops/contracts';
import { nonEmptyLines } from './form-validation';

/**
 * Turns "one claim per line" text into intake evidence. Every claim starts as
 * an unverified, manually entered line; the user confirms or rejects it later.
 */
export function evidenceFromLines(text: string, existing: Intake['evidence'] = []): Intake['evidence'] {
  if (text === existing.map(item => item.claim).join('\n')) return existing;
  const available = [...existing];
  return nonEmptyLines(text).map((claim, i) => {
    const index = available.findIndex(item => item.claim === claim);
    if (index >= 0) return available.splice(index, 1)[0]!;
    return {
      id: crypto.randomUUID(), claim, status: 'unverified',
      source: { kind: 'manual', label: 'User-entered line ' + (i + 1) }
    };
  });
}

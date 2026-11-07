import type { Intake } from '@reboundops/contracts';
import { nonEmptyLines } from './form-validation';

/**
 * Turns "one claim per line" text into intake evidence. Every claim starts as
 * an unverified, manually entered line; the user confirms or rejects it later.
 */
export function evidenceFromLines(text: string): Intake['evidence'] {
  return nonEmptyLines(text).map((claim, i) => ({
    id: crypto.randomUUID(),
    claim,
    status: 'unverified' as const,
    source: { kind: 'manual' as const, label: 'User-entered line ' + (i + 1) }
  }));
}

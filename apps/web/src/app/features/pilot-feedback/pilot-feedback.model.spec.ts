import { describe, expect, it } from 'vitest';
import { blankPilotFeedback, exportPilotFeedback, hasPilotAnswer } from './pilot-feedback.model';

describe('pilot feedback export (private, consent-gated)', () => {
  it('refuses to export without consent or without any answer', () => {
    const blank = blankPilotFeedback();
    expect(hasPilotAnswer(blank)).toBe(false);
    expect(() => exportPilotFeedback({ ...blank, clarity: 'yes' }, 'return', '2026-11-05')).toThrow();
    expect(() => exportPilotFeedback({ ...blank, consent: true }, 'return', '2026-11-05')).toThrow();
  });

  it('exports only questionnaire answers, single-line and length-capped', () => {
    const text = exportPilotFeedback({
      ...blankPilotFeedback(), consent: true, participantCode: 'P01\nInjected: heading',
      useful: 'x'.repeat(900), wouldReturn: 'maybe'
    }, 'shift', '2026-11-05T10:00:00Z');
    expect(text).toContain('- Anonymous participant code: P01 Injected: heading');
    expect(text).toContain('- Route selected in current session: shift');
    expect(text).toContain('- Date (UTC): 2026-11-05\n');
    expect(text.split('\n').find(line => line.startsWith('- Most useful: '))!.length).toBe('- Most useful: '.length + 600);
  });

  it('never echoes an unexpected route value', () => {
    const text = exportPilotFeedback({ ...blankPilotFeedback(), consent: true, clarity: 'no' }, '<script>', '2026-11-05');
    expect(text).toContain('Route selected in current session: not chosen');
  });
});

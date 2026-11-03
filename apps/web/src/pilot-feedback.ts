/**
 * Pilot responses deliberately live only in Angular component memory.
 * This module knows nothing about the session's résumé, evidence, job targets,
 * notes, source documents, or API. The participant controls any export.
 */
export interface PilotFeedback {
  consent: boolean;
  participantCode: string;
  stage: 'first_session' | 'seven_day_followup';
  clarity: '' | 'yes' | 'partly' | 'no';
  privacyUnderstanding: '' | 'yes' | 'partly' | 'no';
  useful: string;
  confusing: string;
  actionOutcome: '' | 'not_attempted' | 'attempted' | 'completed' | 'prefer_not_to_say';
  wouldReturn: '' | 'yes' | 'maybe' | 'no';
}

export function blankPilotFeedback(): PilotFeedback {
  return {
    consent: false,
    participantCode: '',
    stage: 'first_session',
    clarity: '',
    privacyUnderstanding: '',
    useful: '',
    confusing: '',
    actionOutcome: '',
    wouldReturn: ''
  };
}

export function hasPilotAnswer(input: PilotFeedback): boolean {
  return Boolean(input.clarity || input.privacyUnderstanding ||
    input.useful.trim() || input.confusing.trim() ||
    input.actionOutcome || input.wouldReturn);
}

function safeOneLine(input: string, maxLength: number): string {
  return input.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ')
    .trim().slice(0, maxLength) || '(skipped)';
}

export function exportPilotFeedback(
  input: PilotFeedback, routeId: string | undefined, date: string
): string {
  if (!input.consent || !hasPilotAnswer(input)) {
    throw new Error('Feedback must be optional, consented, and contain at least one response.');
  }
  const route = ['return', 'shift', 'bridge'].includes(routeId ?? '') ? routeId : 'not chosen';
  return [
    '# ReboundOps — private pilot feedback', '',
    '> Self-reported answers, not independently verified outcomes. Review and redact before sharing.',
    '> This report contains only answers entered below plus the selected route, not résumé or session data.', '',
    '- Date (UTC): ' + safeOneLine(date, 10),
    '- Anonymous participant code: ' + safeOneLine(input.participantCode, 30),
    '- Study stage: ' + input.stage,
    '- Route selected in current session: ' + route,
    '- Permission to export: explicitly checked by respondent (not permission to publish)', '',
    '## Responses', '',
    '- Direction options understandable: ' + (input.clarity || '(skipped)'),
    '- Privacy/data sharing understandable: ' + (input.privacyUnderstanding || '(skipped)'),
    '- Most useful: ' + safeOneLine(input.useful, 600),
    '- Confusing or not working: ' + safeOneLine(input.confusing, 600),
    '- Real-world action status (self-report): ' + (input.actionOutcome || '(skipped)'),
    '- Would use ReboundOps again: ' + (input.wouldReturn || '(skipped)'), '',
    '## Interpretation cautions', '',
    '- A checked action or self-reported completion is not independent proof of an action.',
    '- This form is for qualitative pilot research, not verified success metrics.',
    '- No response was automatically uploaded to a server or external analytics service.', ''
  ].join('\n');
}

import type { ApplicationView, Contact, FollowUpDraft, FollowUpKind, Profile } from '@reboundops/contracts';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/**
 * Follow-up message drafts built only from saved records. They are never sent:
 * the person copies them or opens their own mail client via mailto.
 */
export function followUpDraft(kind: FollowUpKind, app: ApplicationView, profile: Profile, contact: Contact | null): FollowUpDraft {
  const role = app.job.title;
  const employer = app.job.employer;
  const greeting = contact ? `Hello ${contact.name.split(/\s+/)[0]},` : 'Hello,';
  const name = profile.displayName || '[[Your name]]';
  const applied = app.appliedConfirmedAt ? ` on ${longDate(app.appliedConfirmedAt)}` : '';
  let subject: string;
  let lines: string[];
  switch (kind) {
    case 'after_applying':
      subject = `Following up: ${role} application`;
      lines = [
        greeting,
        `I applied for the ${role} role at ${employer}${applied} and wanted to check whether there is any update on the timeline.`,
        '[[Add one sentence on why you are a strong fit, in your own words]]',
        'Thank you for your time.',
      ];
      break;
    case 'after_interview':
      subject = `${role} interview — follow-up`;
      lines = [greeting, `Thank you again for speaking with me about the ${role} role at ${employer}.`, 'I wanted to check whether there is any news on next steps.', 'Best regards,'];
      break;
    case 'thank_you':
      subject = `Thank you — ${role} interview`;
      lines = [
        greeting,
        `Thank you for taking the time to talk with me about the ${role} role at ${employer}.`,
        '[[Mention something specific from the conversation]]',
        'I enjoyed learning more about the team and remain very interested.',
      ];
      break;
    case 'withdraw':
      subject = `Withdrawing my application — ${role}`;
      lines = [greeting, `I would like to withdraw my application for the ${role} role at ${employer}.`, 'Thank you for your time and consideration.'];
      break;
  }
  const body = [...lines, '', 'Kind regards,', name].join('\n').replace('Best regards,\n\nKind regards,', 'Kind regards,');
  const to = contact?.email || null;
  const placeholders = (`${subject}\n${body}`.match(/\[\[[^\]]*\]\]/g) ?? []).length;
  const mailto = to ? `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null;
  return { kind, to, subject, body, placeholders, mailto };
}

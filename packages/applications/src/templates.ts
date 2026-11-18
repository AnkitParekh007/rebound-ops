import type { ApplicationView, Assessment, Contact, FollowUpDraft, FollowUpTemplate, Profile } from '@reboundops/contracts';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/**
 * Fills a person's own template from saved records. A placeholder with no
 * saved value becomes a visible [[marker]] to fill by hand; nothing is guessed.
 */
export function renderTemplate(t: FollowUpTemplate, app: ApplicationView, profile: Profile, contact: Contact | null): FollowUpDraft {
  const values: Record<string, string | null> = {
    role: app.job.title,
    employer: app.job.employer,
    contactFirstName: contact ? (contact.name.split(/\s+/)[0] ?? null) : null,
    yourName: profile.displayName || null,
    appliedDate: app.appliedConfirmedAt ? longDate(app.appliedConfirmedAt) : null,
  };
  let placeholders = 0;
  const fill = (text: string) =>
    text.replace(/\{(\w+)\}/g, (m, key: string) => {
      if (!(key in values)) return m; // not a placeholder we know: leave the text as written
      const v = values[key];
      if (v) return v;
      placeholders++;
      return `[[${key}]]`;
    });
  const subject = fill(t.subject);
  const body = fill(t.body);
  const existing = (body.match(/\[\[[^\]]+\]\]/g) ?? []).length + (subject.match(/\[\[[^\]]+\]\]/g) ?? []).length;
  return {
    kind: 'after_applying',
    to: contact?.email || null,
    subject,
    body,
    placeholders: Math.max(placeholders, existing),
    mailto: null,
  };
}

/**
 * Preparation prompts for an interview, built from the posting's own
 * qualification lines and the gaps the assessment found. Prompts only; the
 * person writes the answers.
 */
export function interviewPrepPrompts(assessment: Assessment): string[] {
  const out: string[] = [];
  for (const r of assessment.requirements.filter((x) => x.kind === 'required').slice(0, 8)) {
    out.push(r.matchedSkills.length ? `Have a specific example ready for: “${r.text}”.` : `Think about how your experience relates to: “${r.text}”.`);
  }
  for (const m of assessment.missingQualifications.slice(0, 5)) out.push(`Be ready to discuss a gap honestly: ${m}.`);
  for (const c of assessment.eligibility.checks.filter((x) => x.status !== 'confirmed')) out.push(`Clarify if asked: ${c.label.toLowerCase()} — ${c.reason}`);
  if (!out.length) out.push('The posting lists no recognisable qualifications; prepare examples for the main responsibilities it describes.');
  return out;
}

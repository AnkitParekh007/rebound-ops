import type {
  CoverLetterDraft,
  DraftExperience,
  ExperienceEntry,
  Job,
  Profile,
  ResumeDraft,
  ResumeDraftUpdate,
} from '@reboundops/contracts';
import { formatYearMonth } from './blocks.ts';

/**
 * Deterministic tailoring. Drafts are assembled only from the person's
 * verified facts; tailoring selects and orders, it never rewrites. Anything
 * the system cannot know is left as an explicit [[placeholder]].
 */

const STOP = new Set(
  'the and for with you your our are will this that from have has into about who what work team role able across within using use including such other they their them its also more than all any can may must should would well over new per via etc ability experience years year strong excellent good working skills'.split(' '),
);

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9+#]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const mentions = (text: string, term: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escape(term.trim())}(?![\\p{L}\\p{N}])`, term.trim().length <= 3 ? 'u' : 'iu').test(text);

export const PLACEHOLDER = /\[\[[^\]]*\]\]/g;

export function sortExperience<T extends Pick<ExperienceEntry, 'start' | 'end'>>(list: readonly T[]): T[] {
  // Current roles first, then by end date, then start date (most recent first).
  return [...list].sort((a, b) => (b.end ?? '9999-12').localeCompare(a.end ?? '9999-12') || b.start.localeCompare(a.start));
}

export interface TailorInput {
  applicationId: string;
  job: Job;
  profile: Profile;
  now: Date;
}

export function buildResumeDraft({ applicationId, job, profile, now }: TailorInput): ResumeDraft {
  const warnings: string[] = [];
  const jobText = `${job.title}\n${job.description}`;
  const jobTerms = new Set(tokenize(jobText));
  const matchedSkills = profile.skills.filter((s) => mentions(jobText, s));

  const verifiedExp = profile.experience.filter((e) => e.verified);
  const skippedExp = profile.experience.length - verifiedExp.length;
  if (skippedExp) warnings.push(`${skippedExp} experience entr${skippedExp === 1 ? 'y is' : 'ies are'} not marked verified and were left out. Verify them in your profile to include them.`);
  if (!verifiedExp.length) warnings.push('No verified experience yet — the resume has no work history.');

  const experience: DraftExperience[] = sortExperience(verifiedExp).map((e) => {
    const scored = e.highlights.map((text, i) => {
      const words = new Set(tokenize(text));
      const relevance = [...words].filter((w) => jobTerms.has(w)).length + matchedSkills.filter((s) => mentions(text, s)).length;
      return { id: `${e.id}:h${i}`, text, originalText: text, origin: 'fact' as const, include: true, relevance, i };
    });
    scored.sort((a, b) => b.relevance - a.relevance || a.i - b.i);
    return {
      factId: e.id,
      employer: e.employer,
      title: e.title,
      start: e.start,
      end: e.end,
      include: true,
      highlights: scored.map(({ i: _i, ...h }, rank) => ({ ...h, include: rank < 5 })),
    };
  });

  const skills = [
    ...matchedSkills.map((name) => ({ name, matched: true, include: true })),
    ...profile.skills.filter((s) => !matchedSkills.includes(s)).map((name, i) => ({ name, matched: false, include: i < Math.max(0, 15 - matchedSkills.length) })),
  ];

  const unverifiedEdu = profile.education.filter((e) => !e.verified).length + profile.certifications.filter((c) => !c.verified).length;
  if (unverifiedEdu) warnings.push(`${unverifiedEdu} education or certification entr${unverifiedEdu === 1 ? 'y was' : 'ies were'} left out because they are not verified.`);
  if (!profile.headline) warnings.push('Add a headline to your profile to fill the summary, or write one here.');
  if (!profile.displayName) warnings.push('Your name is missing from your profile.');

  const at = now.toISOString();
  return {
    kind: 'resume',
    applicationId,
    generatedAt: at,
    updatedAt: at,
    profileUpdatedAt: profile.updatedAt,
    header: {
      name: profile.displayName,
      headline: profile.headline,
      email: profile.contact.email,
      phone: profile.contact.phone,
      location: profile.contact.location,
      links: profile.contact.links,
    },
    summary: { text: profile.headline, origin: 'profile' },
    experience,
    skills,
    education: sortExperience(
      profile.education.filter((e) => e.verified).map((e) => ({ ...e, start: e.start ?? '0000-01', end: e.end })),
    ).map(({ id, verified: _v, start, ...rest }) => ({ ...rest, start: start === '0000-01' ? null : start, factId: id })),
    certifications: profile.certifications.filter((c) => c.verified).map(({ id, verified: _v, ...rest }) => ({ ...rest, factId: id })),
    warnings,
  };
}

export class DraftUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DraftUpdateError';
  }
}

/** Applies user edits. Facts (employers, titles, dates, education) cannot be changed here — only selection and wording. */
export function applyResumeUpdate(draft: ResumeDraft, update: ResumeDraftUpdate, now: Date): ResumeDraft {
  const next: ResumeDraft = structuredClone(draft);
  if (update.summary !== undefined) {
    next.summary = { text: update.summary, origin: update.summary === draft.header.headline ? 'profile' : 'edited' };
  }
  if (update.experience) {
    for (const u of update.experience) {
      const exp = next.experience.find((e) => e.factId === u.factId);
      if (!exp) throw new DraftUpdateError(`Unknown experience ${u.factId}.`);
      exp.include = u.include;
      for (const hu of u.highlights) {
        const h = exp.highlights.find((x) => x.id === hu.id);
        if (!h) throw new DraftUpdateError(`Unknown highlight ${hu.id}.`);
        const text = hu.text.trim();
        if (!text) throw new DraftUpdateError('A highlight cannot be empty; exclude it instead.');
        h.text = text;
        h.include = hu.include;
        h.origin = text === h.originalText ? 'fact' : 'edited';
      }
    }
  }
  if (update.skills) {
    for (const u of update.skills) {
      const s = next.skills.find((x) => x.name === u.name);
      if (!s) throw new DraftUpdateError(`Unknown skill ${u.name}.`);
      s.include = u.include;
    }
  }
  next.updatedAt = now.toISOString();
  return next;
}

const listJoin = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

export function buildCoverLetter(input: TailorInput & { resume: ResumeDraft }): CoverLetterDraft {
  const { applicationId, job, profile, now, resume } = input;
  const sources: CoverLetterDraft['sources'] = [];
  const warnings: string[] = [];
  const add = (sentence: string, kind: CoverLetterDraft['sources'][number]['source']['kind'], refId: string | null = null) => {
    sources.push({ sentence, source: { kind, refId } });
    return sentence;
  };

  const paragraphs: string[] = [];
  paragraphs.push(add(`Dear Hiring Team at ${job.employer},`, 'job', job.id));
  paragraphs.push(add(`I am writing to apply for the ${job.title} position at ${job.employer}.`, 'job', job.id));

  const latest = resume.experience.find((e) => e.include);
  if (latest) {
    const s = latest.end
      ? `Most recently, I worked as ${latest.title} at ${latest.employer} (${formatYearMonth(latest.start)} – ${formatYearMonth(latest.end)}).`
      : `I currently work as ${latest.title} at ${latest.employer}, where I have been since ${formatYearMonth(latest.start)}.`;
    const highlights = latest.highlights.filter((h) => h.include).slice(0, 2);
    const block = [add(s, 'experience', latest.factId)];
    if (highlights.length) {
      block.push(add('In that role:', 'template'));
      for (const h of highlights) block.push(add(`- ${h.text}`, 'experience', latest.factId));
    }
    paragraphs.push(block.join('\n'));
  } else {
    warnings.push('No verified experience to reference.');
    paragraphs.push(add('[[Describe your most relevant experience]]', 'template'));
  }

  const matched = resume.skills.filter((s) => s.matched && s.include).map((s) => s.name).slice(0, 5);
  if (matched.length) paragraphs.push(add(`The role calls for ${listJoin(matched)}, which I have worked with.`, 'skill'));
  paragraphs.push(add(`[[Add a sentence on why ${job.employer} and this role interest you]]`, 'template'));
  paragraphs.push(add('Thank you for considering my application. I would welcome the chance to discuss how I can contribute.', 'template'));
  paragraphs.push(add(`Kind regards,\n${profile.displayName || '[[Your name]]'}`, profile.displayName ? 'profile' : 'template'));

  warnings.push('Replace every [[placeholder]] before exporting. ReboundOps will not fill them in for you.');
  const at = now.toISOString();
  return { kind: 'cover_letter', applicationId, generatedAt: at, updatedAt: at, text: paragraphs.join('\n\n'), sources, edited: false, warnings };
}

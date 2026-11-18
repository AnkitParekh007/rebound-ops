import type {
  ApplicationPackage,
  ChecklistItem,
  CoverLetterDraft,
  Job,
  Profile,
  ResumeDraft,
  ScreeningAnswer,
} from '@reboundops/contracts';
import { canonicalCountries, detectCountries, experienceYears, jobCountries } from '@reboundops/job-intelligence';

/**
 * Screening-answer drafting. An answer is drafted only when a saved answer or a
 * verified/stated profile fact supports it; otherwise it is marked
 * "needs_input" with a reason. Nothing is guessed.
 */

const STOP = new Set('a an the of to in for and or with you your do are is be have has will would can what how please describe any this that'.split(' '));
const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w)),
  );

/** Overlap of question terms, 0–1 (Dice coefficient). */
export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return (2 * common) / (ta.size + tb.size);
}

type Draft = Pick<ScreeningAnswer, 'answer' | 'status' | 'source' | 'note'>;

const needs = (note: string): Draft => ({ answer: '', status: 'needs_input', source: { kind: 'none', detail: '' }, note });
const fromProfile = (answer: string, detail: string, note = 'Drafted from your profile — check it before submitting.'): Draft => ({
  answer,
  status: 'drafted',
  source: { kind: 'profile', detail },
  note,
});

export function draftAnswer(question: string, profile: Profile, job: Job, now: Date): Draft {
  const q = question.toLowerCase();

  // 1. A saved answer to a closely matching question wins: it is the person's own wording.
  let best: { score: number; answer: (typeof profile.answers)[number] } | null = null;
  for (const a of profile.answers) {
    const score = similarity(question, a.question);
    if (score >= 0.6 && (!best || score > best.score)) best = { score, answer: a };
  }
  if (best && best.answer.answer.trim()) {
    return { answer: best.answer.answer, status: 'drafted', source: { kind: 'saved_answer', detail: best.answer.question }, note: 'From your saved answers.' };
  }

  // 2. Questions that need information ReboundOps does not hold.
  if (/\b(salary|compensation|pay expectation|expected pay|rate)\b/.test(q)) return needs('Salary expectations are yours to state; ReboundOps does not suggest figures.');
  if (/\b(notice period|start date|when can you start|earliest start|availability to start)\b/.test(q)) return needs('Add your notice period or start date.');
  if (/\b(gender|ethnicity|race|disability|veteran|sexual orientation|religion|pronouns)\b/.test(q)) {
    return needs('Voluntary self-identification questions are left for you to answer (or decline).');
  }

  // 3. Contact details and links.
  if (/\blinkedin\b/.test(q)) {
    const link = profile.contact.links.find((l) => /linkedin\.com/i.test(l.url));
    return link ? fromProfile(link.url, 'Profile link: LinkedIn') : needs('Add your LinkedIn URL to your profile.');
  }
  if (/\b(github|gitlab)\b/.test(q)) {
    const link = profile.contact.links.find((l) => /github\.com|gitlab\.com/i.test(l.url));
    return link ? fromProfile(link.url, 'Profile link') : needs('Add your GitHub/GitLab URL to your profile.');
  }
  if (/\b(portfolio|website|personal site)\b/.test(q)) {
    const link = profile.contact.links.find((l) => !/linkedin\.com|github\.com|gitlab\.com/i.test(l.url));
    return link ? fromProfile(link.url, 'Profile link') : needs('Add a portfolio or website link to your profile.');
  }
  if (/\b(e-?mail)\b/.test(q)) return profile.contact.email ? fromProfile(profile.contact.email, 'Contact email') : needs('Add your email to your profile.');
  if (/\b(phone|mobile|telephone)\b/.test(q)) return profile.contact.phone ? fromProfile(profile.contact.phone, 'Contact phone') : needs('Add your phone number to your profile.');
  if (/\b(full name|your name|legal name)\b/.test(q)) return profile.displayName ? fromProfile(profile.displayName, 'Name') : needs('Add your name to your profile.');

  // 4. Eligibility facts the person stated.
  if (/\bsponsor/.test(q)) {
    if (profile.requiresSponsorship === 'yes') return fromProfile('Yes, I will require visa sponsorship.', 'Needs sponsorship: yes');
    if (profile.requiresSponsorship === 'no') return fromProfile('No, I do not require visa sponsorship.', 'Needs sponsorship: no');
    return needs('State in your profile whether you need visa sponsorship.');
  }
  if (/\b(authori[sz]ed|eligible|right|legally (?:able|permitted))\b.*\bwork\b|\bwork (?:permit|authori[sz]ation)\b/.test(q)) {
    const authorized = canonicalCountries(profile.workAuthorizedCountries);
    const mentioned = detectCountries(question);
    const targets = mentioned.length ? mentioned : jobCountries(job, job.description.split('\n')).countries;
    if (!targets.length) return needs('The question and posting do not name a country; answer it yourself.');
    if (!authorized.length) return needs('Add the countries where you are authorised to work to your profile.');
    const yes = targets.filter((c) => authorized.includes(c));
    if (yes.length === targets.length) return fromProfile(`Yes — I am authorised to work in ${yes.join(' and ')}.`, `Authorised to work in: ${authorized.join(', ')}`);
    return needs(`Your profile does not list ${targets.filter((c) => !authorized.includes(c)).join(', ')} as a country you are authorised to work in. Answer this yourself.`);
  }
  if (/\brelocat/.test(q)) {
    if (profile.openToRelocation === 'yes') return fromProfile('Yes, I am open to relocating.', 'Open to relocation: yes');
    if (profile.openToRelocation === 'no') return fromProfile('No, I am not able to relocate.', 'Open to relocation: no');
    return needs('State your relocation preference in your profile.');
  }
  if (/\b(on-?site|in the office|in-office|hybrid|commute)\b/.test(q)) {
    const arr = /hybrid/.test(q) ? 'hybrid' : 'onsite';
    if (!profile.workArrangements.length) return needs('Set your work arrangement preferences in your profile.');
    return profile.workArrangements.includes(arr)
      ? fromProfile(`Yes, ${arr === 'hybrid' ? 'a hybrid arrangement' : 'working on-site'} works for me.`, `Accepts: ${profile.workArrangements.join(', ')}`)
      : needs(`Your preferences don't include ${arr}; answer this yourself.`);
  }
  if (/\bremote\b/.test(q)) {
    if (!profile.workArrangements.length) return needs('Set your work arrangement preferences in your profile.');
    return fromProfile(profile.workArrangements.includes('remote') ? 'Yes, I am comfortable working remotely.' : 'I prefer hybrid or on-site work.', `Accepts: ${profile.workArrangements.join(', ')}`);
  }

  // 5. Years of experience: only the total across verified roles; never per-skill guesses.
  if (/\byears?\b.*\bexperience\b|\bexperience\b.*\byears?\b/.test(q)) {
    const generic = !/\b(with|in|using|of)\s+(?!experience|work|professional|relevant|total|industry)\w/.test(q.replace(/years? of experience/, ''));
    const verified = profile.experience.filter((e) => e.verified);
    if (!verified.length) return needs('Add and verify your work experience first.');
    if (!generic) return needs('ReboundOps only knows your total years, not years with a specific skill. Answer this yourself.');
    const { years } = experienceYears({ ...profile, experience: verified }, now);
    const whole = Math.floor(years);
    return { answer: `${whole} year${whole === 1 ? '' : 's'}`, status: 'drafted', source: { kind: 'experience', detail: `${verified.length} verified roles` }, note: 'Total across your verified roles (overlaps merged).' };
  }

  return needs('No saved answer or profile fact covers this question.');
}

export function emptyPackage(applicationId: string, now: Date): ApplicationPackage {
  return { kind: 'package', applicationId, updatedAt: now.toISOString(), officialApplyUrl: null, eligibilityAcknowledged: false, answers: [], exports: { resume: null, cover_letter: null } };
}

export function checklist(args: {
  pkg: ApplicationPackage;
  job: Job;
  resume: ResumeDraft | null;
  coverLetter: CoverLetterDraft | null;
  eligibility: 'confirmed' | 'unconfirmed' | 'ineligible';
}): { items: ChecklistItem[]; applyUrl: string | null; ready: boolean } {
  const { pkg, job, resume, eligibility } = args;
  const applyUrl = pkg.officialApplyUrl ?? job.sourceUrl;
  const open = pkg.answers.filter((a) => a.status !== 'reviewed');
  const items: ChecklistItem[] = [
    {
      key: 'resume',
      label: 'Resume exported',
      done: !!pkg.exports.resume,
      detail: pkg.exports.resume ? `Last exported ${pkg.exports.resume.slice(0, 10)}.` : resume ? 'Download the tailored resume (PDF or DOCX).' : 'Generate and download a tailored resume.',
      optional: false,
    },
    {
      key: 'cover_letter',
      label: 'Cover letter exported',
      done: !!pkg.exports.cover_letter,
      detail: pkg.exports.cover_letter ? `Last exported ${pkg.exports.cover_letter.slice(0, 10)}.` : 'Optional unless the employer asks for one.',
      optional: true,
    },
    {
      key: 'eligibility',
      label: 'Eligibility reviewed',
      done: pkg.eligibilityAcknowledged,
      detail:
        eligibility === 'ineligible'
          ? 'The assessment found a stated requirement that conflicts with your profile. Review it before applying.'
          : eligibility === 'unconfirmed'
            ? 'Some eligibility points are unconfirmed. Review them and confirm with the employer if needed.'
            : 'Eligibility is confirmed from your profile.',
      optional: false,
    },
    {
      key: 'answers',
      label: 'Screening answers reviewed',
      done: open.length === 0,
      detail: pkg.answers.length === 0 ? 'Add the questions from the application form, if any.' : open.length ? `${open.length} answer${open.length === 1 ? '' : 's'} still to review.` : 'All answers reviewed by you.',
      optional: pkg.answers.length === 0,
    },
    {
      key: 'official_link',
      label: 'Official application link',
      done: !!applyUrl,
      detail: applyUrl ? 'Apply on the employer’s own site or the ATS it links to.' : 'Add the official application URL.',
      optional: false,
    },
    {
      key: 'posting_checked',
      label: 'Posting checked on the official site',
      done: job.verification.status === 'verified',
      detail: job.verification.status === 'verified' ? `You confirmed it on ${job.verification.checkedAt?.slice(0, 10)}.` : 'Open the official posting and confirm the details still match.',
      optional: false,
    },
  ];
  const ready = items.every((i) => i.done || i.optional);
  return { items, applyUrl, ready };
}

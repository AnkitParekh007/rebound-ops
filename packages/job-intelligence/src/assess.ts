import type {
  Assessment,
  CriterionKey,
  EligibilityCheck,
  EligibilityStatus,
  Evidence,
  FitCriterion,
  Job,
  Profile,
  WorkArrangement,
} from '@reboundops/contracts';
import { canonicalCountries, detectCountries } from './countries.ts';
import { normalizeDescription } from './extract.ts';

/**
 * Transparent, deterministic fit and eligibility assessment.
 *
 * Fit is a weighted 0–5 rubric. A criterion is scored only when both the
 * posting and the profile give enough information; otherwise it is left
 * unscored and the missing profile detail is named. Eligibility is reported
 * separately and is only "ineligible" when a stated job requirement
 * contradicts something the person stated about themselves.
 */
export const RUBRIC_VERSION = 'fit-2026.1';

export const RUBRIC: Readonly<Record<CriterionKey, { label: string; weight: number; guide: string }>> = {
  role: { label: 'Role alignment', weight: 0.3, guide: '5 = title matches a target role; 3 = partial overlap; 1 = unrelated.' },
  skills: { label: 'Skills mentioned', weight: 0.3, guide: '5 = five or more of your skills appear; 1 = none appear.' },
  experience: { label: 'Experience level', weight: 0.2, guide: '5 = you meet the stated years; 1 = under half.' },
  location: { label: 'Location & arrangement', weight: 0.2, guide: '5 = in a preferred country or remote you accept; 1 = would require a move you ruled out.' },
};

export const DISCLAIMER =
  'A rule-based estimate from the text you saved and your own profile. It is not a prediction of hiring outcomes; check requirements on the official posting.';

export interface AssessInput {
  applicationId: string;
  job: Job;
  profile: Profile;
  /** Extra target roles (e.g. from onboarding goals). */
  goalRoles?: readonly string[];
  now: Date;
}

/* ---------------- helpers ---------------- */

const SENIORITY = new Set(['senior', 'sr', 'junior', 'jr', 'lead', 'principal', 'staff', 'head', 'chief', 'associate', 'intern', 'i', 'ii', 'iii', 'iv', 'of', 'and', 'the', 'a', 'an', 'for', 'to', 'in', 'with']);

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9+#]+/)
    .filter((w) => w && !SENIORITY.has(w));

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function termRegex(term: string): RegExp {
  const t = term.trim();
  // Short tokens like "Go", "R", "C" are matched case-sensitively to avoid ordinary words.
  const flags = t.length <= 3 ? 'u' : 'iu';
  return new RegExp(`(?<![\\p{L}\\p{N}])${escape(t)}(?![\\p{L}\\p{N}])`, flags);
}

const dedupe = (list: string[]) => [...new Set(list.map((s) => s.trim()).filter(Boolean))];

function linesOf(description: string): string[] {
  return normalizeDescription(description)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

const jobEv = (text: string): Evidence => ({ source: 'job', text: text.slice(0, 300) });
const profileEv = (text: string): Evidence => ({ source: 'profile', text });

function criterion(
  key: CriterionKey,
  score: number | null,
  rationale: string,
  evidence: Evidence[] = [],
  missing: string[] = [],
): FitCriterion {
  return { key, label: RUBRIC[key].label, weight: RUBRIC[key].weight, score, rationale, evidence, missing };
}

/* ---------------- criteria ---------------- */

function scoreRole(job: Job, targets: string[]): FitCriterion {
  if (!targets.length) {
    return criterion('role', null, 'No target roles in your profile to compare with.', [], ['Target roles']);
  }
  const titleWords = new Set(words(job.title));
  const titleNorm = words(job.title).join(' ');
  let best = { score: 1, target: targets[0]! };
  for (const target of targets) {
    const tw = words(target);
    if (!tw.length) continue;
    let s: number;
    if (titleNorm.includes(tw.join(' '))) s = 5;
    else {
      const overlap = tw.filter((w) => titleWords.has(w)).length / tw.length;
      s = overlap >= 0.67 ? 4 : overlap >= 0.34 ? 3 : overlap > 0 ? 2 : 1;
    }
    if (s > best.score) best = { score: s, target };
  }
  const rationale =
    best.score === 5
      ? `The title matches your target role "${best.target}".`
      : best.score >= 3
        ? `The title partly overlaps your target role "${best.target}".`
        : best.score === 2
          ? `The title shares only a word with "${best.target}".`
          : 'The title does not match any of your target roles.';
  return criterion('role', best.score, rationale, [jobEv(`Title: ${job.title}`), profileEv(`Target roles: ${targets.join(', ')}`)]);
}

function scoreSkills(lines: string[], skills: readonly string[]): FitCriterion {
  if (!skills.length) return criterion('skills', null, 'No skills in your profile to compare with.', [], ['Skills']);
  if (!lines.length) return criterion('skills', null, 'No job description saved to compare skills against.');
  const matched: { skill: string; line: string }[] = [];
  for (const skill of skills) {
    const re = termRegex(skill);
    const line = lines.find((l) => re.test(l));
    if (line) matched.push({ skill, line });
  }
  const n = matched.length;
  const score = n === 0 ? 1 : n === 1 ? 2 : n === 2 ? 3 : n <= 4 ? 4 : 5;
  const rationale =
    n === 0
      ? `None of your ${skills.length} listed skills appear in the posting.`
      : `${n} of your ${skills.length} listed skills appear in the posting: ${matched.map((m) => m.skill).join(', ')}.`;
  const evidence = dedupe(matched.map((m) => m.line)).slice(0, 5).map(jobEv);
  return criterion('skills', score, rationale, evidence);
}

const YEARS_RE = /(\d{1,2})\s*\+?\s*(?:(?:-|–|to)\s*\d{1,2}\s*\+?\s*)?(?:years?|yrs?)\b/i;
/** "5+ years with X", "3 years of hands-on …" — years followed by a word that implies experience. */
const YEARS_OF_RE = new RegExp(
  YEARS_RE.source + String.raw`['’]?\s+(?:of\s+)?(?:experience|exp\b|with|in|working|building|professional|hands-on|industry|relevant|commercial)`,
  'i',
);

export function requiredYears(lines: string[]): { years: number; line: string } | null {
  let best: { years: number; line: string } | null = null;
  for (const line of lines) {
    const m = /experience|exp\b/i.test(line) ? YEARS_RE.exec(line) : YEARS_OF_RE.exec(line);
    if (m?.[1]) {
      const years = Number(m[1]);
      if (years > 0 && years <= 40 && (!best || years < best.years)) best = { years, line };
    }
  }
  return best;
}

/** Total years covered by experience entries, with overlaps merged. */
export function experienceYears(profile: Profile, now: Date): { years: number; includesUnverified: boolean } {
  const toMonth = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    return (y ?? 0) * 12 + ((m ?? 1) - 1);
  };
  const nowMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const ranges = profile.experience
    .map((e) => [toMonth(e.start), e.end ? toMonth(e.end) + 1 : nowMonth + 1] as const)
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let cur: [number, number] | null = null;
  for (const [s, e] of ranges) {
    if (!cur || s > cur[1]) {
      if (cur) total += cur[1] - cur[0];
      cur = [s, e];
    } else cur[1] = Math.max(cur[1], e);
  }
  if (cur) total += cur[1] - cur[0];
  return { years: total / 12, includesUnverified: profile.experience.some((e) => !e.verified) };
}

function scoreExperience(lines: string[], profile: Profile, now: Date): FitCriterion {
  const req = requiredYears(lines);
  if (!req) return criterion('experience', null, 'The posting does not state a number of years of experience.');
  if (!profile.experience.length) {
    return criterion('experience', null, `The posting asks for ${req.years}+ years; your profile has no experience entries.`, [jobEv(req.line)], ['Work experience']);
  }
  const { years, includesUnverified } = experienceYears(profile, now);
  const have = Math.floor(years * 10) / 10;
  const ratio = years / req.years;
  const score = ratio >= 1 ? 5 : ratio >= 0.75 ? 3 : ratio >= 0.5 ? 2 : 1;
  const caveat = includesUnverified ? ' Includes entries you have not marked as verified.' : '';
  return criterion(
    'experience',
    score,
    `The posting asks for about ${req.years} years; your entries cover about ${have} years.${caveat}`,
    [jobEv(req.line), profileEv(`${profile.experience.length} experience entr${profile.experience.length === 1 ? 'y' : 'ies'}, about ${have} years`)],
  );
}

const LOCATION_LINE = /\b(location|based in|based out of|office|reside|relocat|work from|on[- ]?site|hybrid|remote)\b/i;

export function jobCountries(job: Job, lines: string[]): { countries: string[]; evidence: string | null } {
  if (job.location) {
    const c = detectCountries(job.location);
    if (c.length) return { countries: c, evidence: `Location: ${job.location}` };
  }
  for (const line of lines) {
    if (!LOCATION_LINE.test(line)) continue;
    const c = detectCountries(line);
    if (c.length) return { countries: c, evidence: line };
  }
  return { countries: [], evidence: null };
}

function arrangementOf(job: Job, lines: string[]): WorkArrangement | null {
  if (job.workArrangement) return job.workArrangement;
  const text = lines.join('\n');
  if (/\bhybrid\b/i.test(text)) return 'hybrid';
  if (/\b(fully remote|remote[- ]first|100% remote)\b/i.test(text)) return 'remote';
  if (/\b(on[- ]?site|in[- ]office)\b/i.test(text)) return 'onsite';
  return null;
}

function scoreLocation(job: Job, lines: string[], profile: Profile): FitCriterion {
  const arrangement = arrangementOf(job, lines);
  const { countries, evidence } = jobCountries(job, lines);
  const prefs = canonicalCountries(profile.preferredCountries);
  const ev: Evidence[] = [];
  if (evidence) ev.push(jobEv(evidence));
  if (arrangement) ev.push(jobEv(`Work arrangement: ${arrangement}`));

  if (arrangement === 'remote') {
    if (!profile.workArrangements.length) {
      return criterion('location', null, 'The role is remote, but your arrangement preferences are not set.', ev, ['Work arrangement preference']);
    }
    ev.push(profileEv(`You accept: ${profile.workArrangements.join(', ')}`));
    return profile.workArrangements.includes('remote')
      ? criterion('location', 5, 'The role is remote, which you accept.', ev)
      : criterion('location', 3, 'The role is remote, but you prefer hybrid or on-site work.', ev);
  }

  if (!countries.length) {
    return criterion('location', null, 'The posting does not state a country, so location fit cannot be judged.', ev);
  }
  if (!prefs.length) {
    return criterion('location', null, `The role is in ${countries.join(', ')}; your preferred countries are not set.`, ev, ['Preferred countries']);
  }
  ev.push(profileEv(`Preferred countries: ${prefs.join(', ')}`));
  const arrangementMismatch =
    arrangement !== null && profile.workArrangements.length > 0 && !profile.workArrangements.includes(arrangement);

  if (countries.some((c) => prefs.includes(c))) {
    return arrangementMismatch
      ? criterion('location', 4, `The role is in a preferred country (${countries.join(', ')}), but it is ${arrangement}, which is not among your preferences.`, ev)
      : criterion('location', 5, `The role is in a preferred country (${countries.join(', ')}).`, ev);
  }
  switch (profile.openToRelocation) {
    case 'yes':
      ev.push(profileEv('Open to relocation: yes'));
      return criterion('location', 3, `The role is in ${countries.join(', ')}, outside your preferred countries, and you are open to relocating.`, ev);
    case 'no':
      ev.push(profileEv('Open to relocation: no'));
      return criterion('location', 1, `The role is in ${countries.join(', ')}, outside your preferred countries, and you are not open to relocating.`, ev);
    default:
      return criterion('location', 2, `The role is in ${countries.join(', ')}, outside your preferred countries.`, ev, ['Relocation preference']);
  }
}

/* ---------------- eligibility ---------------- */

const NO_SPONSOR = [
  /\b(?:no|not|unable to|cannot|can't|can not|will not|won't|do not|does not|don't|doesn't|are not able to)\b[^.\n]{0,40}\bsponsor/i,
  /\bsponsorship\b[^.\n]{0,20}\b(?:not|un)\s?available\b/i,
  /\bwithout (?:the need for )?(?:visa )?sponsorship\b/i,
];
const SPONSOR_OFFERED = /\b(?:visa sponsorship (?:is )?(?:available|provided|offered)|sponsorship (?:is )?available|we (?:can |will |are able to )?sponsor)\b/i;
const AUTH_LINE = /\b(?:authori[sz]ed|authori[sz]ation|eligible|eligibility|right|permit(?:ted)?)\b[^.\n]{0,20}\bto work\b|\bwork (?:permit|authori[sz]ation|visa)\b|\bright to work\b/i;
const CREDENTIAL_LINE =
  /\b(?:security clearance|clearance (?:is )?required|must (?:hold|have|possess)[^.\n]{0,60}\b(?:licen[cs]e|certifi\w*|registration|clearance)|(?:licen[cs]e|certification|registration) (?:is )?required)\b/i;

function workAuthorization(job: Job, lines: string[], profile: Profile): EligibilityCheck {
  const label = 'Work authorisation';
  const authLine = lines.find((l) => AUTH_LINE.test(l) && detectCountries(l).length);
  const loc = jobCountries(job, lines);
  const required = authLine ? detectCountries(authLine) : loc.countries;
  const reqEvidence = authLine ?? loc.evidence;
  const noSponsorLine = lines.find((l) => NO_SPONSOR.some((re) => re.test(l)));
  const offeredLine = noSponsorLine ? undefined : lines.find((l) => SPONSOR_OFFERED.test(l));
  const authorized = canonicalCountries(profile.workAuthorizedCountries);
  const ev: Evidence[] = [];
  if (reqEvidence) ev.push(jobEv(reqEvidence));
  if (noSponsorLine) ev.push(jobEv(noSponsorLine));
  if (offeredLine) ev.push(jobEv(offeredLine));

  const check = (status: EligibilityStatus, reason: string, missing: string[] = []): EligibilityCheck => ({
    key: 'work_authorization',
    label,
    status,
    reason,
    evidence: ev,
    missing,
  });

  if (!required.length) {
    return check(
      'unconfirmed',
      arrangementOf(job, lines) === 'remote'
        ? 'The posting does not say which countries remote candidates must be based in. Confirm with the employer.'
        : 'The posting does not state a country, so work authorisation cannot be checked.',
    );
  }
  const where = required.join(' / ');
  const match = required.find((c) => authorized.includes(c));
  if (match) {
    ev.push(profileEv(`You are authorised to work in: ${authorized.join(', ')}`));
    return check('confirmed', `You stated you are authorised to work in ${match}.`);
  }
  if (!authorized.length && profile.requiresSponsorship === 'unknown') {
    return check('unconfirmed', `The role requires the right to work in ${where}; your profile does not say where you are authorised to work.`, [
      'Countries where you are authorised to work',
      'Whether you need visa sponsorship',
    ]);
  }
  if (authorized.length) ev.push(profileEv(`You are authorised to work in: ${authorized.join(', ')}`));
  if (profile.requiresSponsorship === 'yes') ev.push(profileEv('You need visa sponsorship: yes'));

  if (noSponsorLine) {
    if (profile.requiresSponsorship === 'yes') {
      return check('ineligible', `The posting says it cannot sponsor visas, and you stated you need sponsorship to work in ${where}.`);
    }
    if (profile.requiresSponsorship === 'unknown') {
      return check('unconfirmed', `The posting says it cannot sponsor visas for ${where}.`, ['Whether you need visa sponsorship']);
    }
  }
  if (profile.requiresSponsorship === 'no') {
    return check('unconfirmed', `You said you do not need sponsorship, but ${where} is not in your list of countries you are authorised to work in.`, [
      `Whether you are authorised to work in ${where}`,
    ]);
  }
  if (offeredLine) {
    return check('unconfirmed', `The posting mentions visa sponsorship for ${where}. Confirm the details with the employer.`);
  }
  if (profile.requiresSponsorship === 'yes') {
    return check('unconfirmed', `You need sponsorship for ${where}, and the posting does not say whether it sponsors.`);
  }
  return check('unconfirmed', `Not yet confirmed that you can work in ${where}.`, ['Whether you need visa sponsorship']);
}

function credentials(lines: string[]): EligibilityCheck | null {
  const found = lines.filter((l) => CREDENTIAL_LINE.test(l)).slice(0, 3);
  if (!found.length) return null;
  return {
    key: 'credentials',
    label: 'Required credentials',
    status: 'unconfirmed',
    reason: 'The posting lists a required licence, certification or clearance. ReboundOps does not track credentials yet, so confirm you hold it.',
    evidence: found.map(jobEv),
    missing: found.map((l) => `Confirm you hold: "${l.slice(0, 120)}"`),
  };
}

/* ---------------- entry point ---------------- */

const RANK: Record<EligibilityStatus, number> = { confirmed: 0, unconfirmed: 1, ineligible: 2 };

export function assess(input: AssessInput): Assessment {
  const { job, profile, now } = input;
  const lines = linesOf(job.description);
  const targets = dedupe([...profile.targetRoles, ...(input.goalRoles ?? [])]);

  const criteria = [
    scoreRole(job, targets),
    scoreSkills(lines, profile.skills),
    scoreExperience(lines, profile, now),
    scoreLocation(job, lines, profile),
  ];
  const scored = criteria.filter((c): c is FitCriterion & { score: number } => c.score !== null);
  const weight = scored.reduce((s, c) => s + c.weight, 0);
  const overall = scored.length >= 2 && weight > 0 ? Math.round((scored.reduce((s, c) => s + c.score * c.weight, 0) / weight) * 2) / 2 : null;

  const checks = [workAuthorization(job, lines, profile), credentials(lines)].filter((c): c is EligibilityCheck => c !== null);
  const status = checks.reduce<EligibilityStatus>((worst, c) => (RANK[c.status] > RANK[worst] ? c.status : worst), 'confirmed');

  return {
    applicationId: input.applicationId,
    rubricVersion: RUBRIC_VERSION,
    assessedAt: now.toISOString(),
    fit: { overall, scoredCriteria: scored.length, totalCriteria: criteria.length, criteria },
    eligibility: { status, checks },
    missingInfo: dedupe([...criteria.flatMap((c) => c.missing), ...checks.flatMap((c) => c.missing)]),
    disclaimer: DISCLAIMER,
  };
}

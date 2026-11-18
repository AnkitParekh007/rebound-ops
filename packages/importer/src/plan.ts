import { createHash } from 'node:crypto';
import {
  ExportBundle,
  ImportFile,
  ImportJob,
  type ApplicationStatus,
  type ImportPreview,
  type Profile,
} from '@reboundops/contracts';
import { dedupeKey, normalizeDescription } from '@reboundops/job-intelligence';

/**
 * Read-only import planning. Input is parsed and validated into a plan; nothing
 * is written here. Applying the plan is a separate, confirmed step.
 */

export class ImportFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportFormatError';
  }
}

export interface PlannedJob {
  index: number;
  job: ImportJob;
  dedupeKey: string;
  status: ApplicationStatus;
}

export interface ImportPlan {
  sourceFormat: 'reboundops-import' | 'reboundops-export';
  sha256: string;
  profilePatch: Partial<Profile>;
  preview: Omit<ImportPreview, 'token' | 'expiresAt'>;
  jobs: PlannedJob[];
}

const MAX_DEPTH = 12;
function depthOf(v: unknown, d = 0): number {
  if (d > MAX_DEPTH) return d;
  if (v && typeof v === 'object') {
    let max = d;
    for (const x of Object.values(v)) max = Math.max(max, depthOf(x, d + 1));
    return max;
  }
  return d;
}

const issueText = (issues: { path: PropertyKey[]; message: string }[]) =>
  issues.slice(0, 3).map((i) => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`).join('; ');

/** Converts ReboundOps' own export bundle into the neutral import shape. */
function fromExport(bundle: ExportBundle): unknown {
  const p = bundle.profile;
  const apps = new Map(bundle.applications.map((a) => [a.jobId, a]));
  return {
    format: 'reboundops-import',
    formatVersion: 1,
    source: 'reboundops-export',
    exportedAt: bundle.exportedAt,
    profile: {
      displayName: p.displayName,
      headline: p.headline,
      email: p.contact.email,
      phone: p.contact.phone,
      location: p.contact.location,
      links: p.contact.links.map((l) => ({ label: l.label, url: l.url })),
      targetRoles: p.targetRoles,
      preferredCountries: p.preferredCountries,
      workArrangements: p.workArrangements,
      openToRelocation: p.openToRelocation,
      workAuthorizedCountries: p.workAuthorizedCountries,
      requiresSponsorship: p.requiresSponsorship,
      skills: p.skills,
      experience: p.experience.map((e) => ({ employer: e.employer, title: e.title, start: e.start, end: e.end, summary: e.summary, highlights: e.highlights })),
      education: p.education.map((e) => ({ institution: e.institution, qualification: e.qualification, field: e.field, start: e.start, end: e.end })),
      answers: p.answers.map((a) => ({ question: a.question, answer: a.answer })),
    },
    jobs: bundle.jobs.map((j) => {
      const app = apps.get(j.id);
      const activity = app ? bundle.activity.filter((a) => a.applicationId === app.id).sort((a, b) => a.at.localeCompare(b.at)) : [];
      return {
        externalId: j.id,
        title: j.title,
        employer: j.employer,
        location: j.location,
        salary: j.salary,
        sourceUrl: j.sourceUrl,
        description: j.description,
        capturedAt: j.capturedAt,
        status: app?.status ?? 'discovered',
        appliedAt: app?.appliedConfirmedAt ?? null,
        history: activity.filter((a) => a.kind === 'status_changed' && a.to).map((a) => ({ at: a.at, status: a.to!, ...(a.note ? { note: a.note } : {}) })),
        notes: activity.filter((a) => a.kind === 'note' && a.note).map((a) => ({ at: a.at, text: a.note })),
      };
    }),
  };
}

export function planImport(content: string, existing: { profile: Profile; dedupeKeys: ReadonlySet<string> }): ImportPlan {
  const sha256 = createHash('sha256').update(content, 'utf8').digest('hex');
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new ImportFormatError('The file is not valid JSON.');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ImportFormatError('The file must contain a JSON object.');
  if (depthOf(raw) > MAX_DEPTH) throw new ImportFormatError('The file is nested too deeply.');

  const format = (raw as { format?: unknown }).format;
  let sourceFormat: ImportPlan['sourceFormat'];
  if (format === 'reboundops-export') {
    const b = ExportBundle.safeParse(raw);
    if (!b.success) throw new ImportFormatError(`Not a valid ReboundOps export: ${issueText(b.error.issues)}`);
    raw = fromExport(b.data);
    sourceFormat = 'reboundops-export';
  } else if (format === 'reboundops-import') {
    sourceFormat = 'reboundops-import';
  } else {
    throw new ImportFormatError('Unrecognised file. Expected "format": "reboundops-import" (see docs/IMPORT_FORMAT.md) or a ReboundOps export.');
  }

  const file = ImportFile.safeParse(raw);
  if (!file.success) throw new ImportFormatError(`The file does not match the import format: ${issueText(file.error.issues)}`);
  const warnings: string[] = [];

  // Profile: fill empty fields only; append new list items; everything imported is unverified.
  const p = file.data.profile ?? {};
  const cur = existing.profile;
  const patch: Partial<Profile> = {};
  const fieldsToFill: string[] = [];
  const fill = <K extends 'displayName' | 'headline'>(key: K, value: string | undefined) => {
    if (value && !cur[key]) {
      patch[key] = value;
      fieldsToFill.push(key);
    }
  };
  fill('displayName', p.displayName);
  fill('headline', p.headline);
  const contact = { ...cur.contact };
  for (const k of ['email', 'phone', 'location'] as const) {
    if (p[k] && !contact[k]) {
      contact[k] = p[k]!;
      fieldsToFill.push(k);
    }
  }
  const haveUrls = new Set(contact.links.map((l) => l.url));
  const newLinks = (p.links ?? []).filter((l) => !haveUrls.has(l.url)).map((l) => ({ label: l.label ?? '', url: l.url }));
  if (newLinks.length) fieldsToFill.push('links');
  contact.links = [...contact.links, ...newLinks].slice(0, 10);
  patch.contact = contact;

  const lower = (xs: readonly string[]) => new Set(xs.map((x) => x.toLowerCase()));
  const addList = (key: 'targetRoles' | 'preferredCountries' | 'workAuthorizedCountries', incoming: string[] | undefined) => {
    const have = lower(cur[key]);
    const add = (incoming ?? []).filter((x) => !have.has(x.toLowerCase()));
    if (add.length) {
      patch[key] = [...cur[key], ...add];
      fieldsToFill.push(key);
    }
  };
  addList('targetRoles', p.targetRoles);
  addList('preferredCountries', p.preferredCountries);
  addList('workAuthorizedCountries', p.workAuthorizedCountries);
  if (p.workArrangements?.length && !cur.workArrangements.length) {
    patch.workArrangements = [...new Set(p.workArrangements)];
    fieldsToFill.push('workArrangements');
  }
  if (p.openToRelocation && cur.openToRelocation === 'unknown') {
    patch.openToRelocation = p.openToRelocation;
    fieldsToFill.push('openToRelocation');
  }
  if (p.requiresSponsorship && cur.requiresSponsorship === 'unknown') {
    patch.requiresSponsorship = p.requiresSponsorship;
    fieldsToFill.push('requiresSponsorship');
  }
  const haveSkills = lower(cur.skills);
  const skillsToAdd = [...new Set((p.skills ?? []).filter((s) => !haveSkills.has(s.toLowerCase())))];
  if (skillsToAdd.length) patch.skills = [...cur.skills, ...skillsToAdd].slice(0, 200);

  const expKey = (e: { employer: string; title: string; start: string }) => `${e.employer.toLowerCase()}|${e.title.toLowerCase()}|${e.start}`;
  const haveExp = new Set(cur.experience.map(expKey));
  const expToAdd = (p.experience ?? []).filter((e) => !haveExp.has(expKey(e)));
  if (expToAdd.length) {
    patch.experience = [
      ...cur.experience,
      ...expToAdd.map((e, i) => ({ id: `imp-exp-${sha256.slice(0, 8)}-${i}`, employer: e.employer, title: e.title, start: e.start, end: e.end ?? null, summary: e.summary ?? '', highlights: (e.highlights ?? []).filter(Boolean), verified: false })),
    ].slice(0, 60);
  }
  const haveEdu = new Set(cur.education.map((e) => e.institution.toLowerCase()));
  const eduToAdd = (p.education ?? []).filter((e) => !haveEdu.has(e.institution.toLowerCase()));
  if (eduToAdd.length) {
    patch.education = [
      ...cur.education,
      ...eduToAdd.map((e, i) => ({ id: `imp-edu-${sha256.slice(0, 8)}-${i}`, institution: e.institution, qualification: e.qualification ?? '', field: e.field ?? '', start: e.start ?? null, end: e.end ?? null, verified: false })),
    ].slice(0, 30);
  }
  const haveQ = lower(cur.answers.map((a) => a.question));
  const answersToAdd = (p.answers ?? []).filter((a) => !haveQ.has(a.question.toLowerCase()));
  if (answersToAdd.length) {
    patch.answers = [...cur.answers, ...answersToAdd.map((a, i) => ({ id: `imp-ans-${sha256.slice(0, 8)}-${i}`, question: a.question, answer: a.answer }))].slice(0, 100);
  }
  if (expToAdd.length || eduToAdd.length) warnings.push('Imported experience and education are marked unverified until you review them.');

  // Jobs: validate each record on its own so one bad record does not block the rest.
  const jobs: PlannedJob[] = [];
  const toAdd: ImportPreview['jobs']['toAdd'] = [];
  const duplicates: ImportPreview['jobs']['duplicates'] = [];
  const rejected: ImportPreview['jobs']['rejected'] = [];
  const seen = new Set<string>();
  (file.data.jobs ?? []).forEach((rawJob, index) => {
    const r = ImportJob.safeParse(rawJob);
    if (!r.success) {
      rejected.push({ index, reason: issueText(r.error.issues) });
      return;
    }
    const job = r.data;
    const key = dedupeKey({ sourceUrl: job.sourceUrl ?? null, employer: job.employer, title: job.title, location: job.location ?? null });
    if (existing.dedupeKeys.has(key)) {
      duplicates.push({ index, title: job.title, employer: job.employer, reason: 'Already in ReboundOps.' });
      return;
    }
    if (seen.has(key)) {
      duplicates.push({ index, title: job.title, employer: job.employer, reason: 'Appears more than once in the file.' });
      return;
    }
    seen.add(key);
    const status = job.status ?? job.history?.at(-1)?.status ?? 'discovered';
    jobs.push({ index, job: { ...job, description: normalizeDescription(job.description ?? '') }, dedupeKey: key, status });
    toAdd.push({ index, title: job.title, employer: job.employer, status });
  });
  if (jobs.some((j) => ['applied', 'interviewing', 'offer'].includes(j.status) && !j.job.appliedAt)) {
    warnings.push('Some imported applications are past "applied" without a submission date; their submission date is taken from their history or capture date.');
  }
  warnings.push('Imported postings are marked unverified. Your original file is not changed.');

  return {
    sourceFormat,
    sha256,
    profilePatch: patch,
    jobs,
    preview: {
      sourceFormat,
      sha256,
      profile: { fieldsToFill, skillsToAdd, experienceToAdd: expToAdd.length, educationToAdd: eduToAdd.length, answersToAdd: answersToAdd.length },
      jobs: { toAdd, duplicates, rejected },
      warnings,
    },
  };
}

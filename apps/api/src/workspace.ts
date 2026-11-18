import { randomUUID } from 'node:crypto';
import {
  type ActivityEntry,
  type Assessment,
  type ApplicationPackage,
  type PackageView,
  type CoverLetterDraft,
  type DocumentKind,
  type DocumentsBundle,
  type ExportFormat,
  type ResumeDraft,
  type ResumeFile,
  type ResumeImportResult,
  type AssessmentSummary,
  type Application,
  type ApplicationView,
  type DashboardSummary,
  type ExportBundle,
  type Job,
  type JobCreateResult,
  type JobExtraction,
  type OnboardingState,
  type Profile,
  AddQuestionsRequest,
  AnswerUpdate,
  CoverLetterUpdate,
  PackageUpdate,
  GenerateDocumentsRequest,
  JobCreate,
  MAX_RESUME_BYTES,
  ResumeDraftUpdate,
  ResumeImportRequest,
  JobExtractRequest,
  NoteRequest,
  OnboardingUpdate,
  ProfileUpdate,
  StatusTransitionRequest,
} from '@reboundops/contracts';
import {
  allowedTransitions,
  checkTransition,
  defaultOnboarding,
  defaultProfile,
  mergeOnboarding,
  normalizeList,
  summarize,
} from '@reboundops/core';
import { assess, checkGrounding, dedupeKey, extractJob, normalizeDescription, RUBRIC, RUBRIC_VERSION } from '@reboundops/job-intelligence';
import type { Store } from '@reboundops/storage';
import { checklist, draftAnswer, emptyPackage } from '@reboundops/applications';
import {
  applyResumeUpdate,
  buildCoverLetter,
  buildResumeDraft,
  decodeResumeFile,
  DraftUpdateError,
  exportDocument,
  parseResumeText,
  type ExportResult,
  UnsupportedResumeError,
  ZipError,
} from '@reboundops/documents';
import { AppError, notFound } from './errors.ts';

export interface WorkspaceOptions {
  now?: () => Date;
  newId?: () => string;
}

/**
 * Application service: orchestrates domain rules (core, job-intelligence)
 * over persistence (storage). Inputs are `unknown` and validated here so
 * every caller — HTTP, CLI, tests — gets identical guarantees.
 */
export class Workspace {
  private readonly now: () => Date;
  private readonly newId: () => string;
  private readonly store: Store;

  constructor(store: Store, options: WorkspaceOptions = {}) {
    this.store = store;
    this.now = options.now ?? (() => new Date());
    this.newId = options.newId ?? randomUUID;
  }

  get schemaVersion(): number {
    return this.store.schemaVersion;
  }

  /* ---------- onboarding ---------- */

  getOnboarding(): OnboardingState {
    return this.store.getOnboarding() ?? defaultOnboarding();
  }

  updateOnboarding(input: unknown): OnboardingState {
    const update = OnboardingUpdate.parse(input);
    if (update.goals) update.goals.targetRoles = normalizeList(update.goals.targetRoles);
    return this.store.saveOnboarding(mergeOnboarding(this.getOnboarding(), update, this.now()));
  }

  /* ---------- profile ---------- */

  getProfile(): Profile {
    return this.store.getProfile() ?? defaultProfile();
  }

  saveProfile(input: unknown): Profile {
    const p = ProfileUpdate.parse(input);
    const seenIds = new Set<string>();
    for (const e of p.experience) {
      if (seenIds.has(e.id)) throw new AppError(422, 'invalid_profile', `Duplicate experience id ${e.id}.`);
      seenIds.add(e.id);
      if (e.end && e.end < e.start) {
        throw new AppError(422, 'invalid_profile', `Experience "${e.title}" ends before it starts.`);
      }
    }
    return this.store.saveProfile({
      ...p,
      targetRoles: normalizeList(p.targetRoles),
      preferredCountries: normalizeList(p.preferredCountries),
      workAuthorizedCountries: normalizeList(p.workAuthorizedCountries),
      skills: normalizeList(p.skills),
      workArrangements: [...new Set(p.workArrangements)],
      updatedAt: this.now().toISOString(),
    });
  }

  /* ---------- jobs ---------- */

  extractJob(input: unknown): JobExtraction {
    const req = JobExtractRequest.parse(input);
    if (!req.description.trim() && !req.sourceUrl) {
      throw new AppError(422, 'empty_job', 'Paste a job description or a job URL.');
    }
    return extractJob(req.description, req.sourceUrl);
  }

  createJob(input: unknown): JobCreateResult {
    const req = JobCreate.parse(input);
    const description = normalizeDescription(req.description);
    const candidate = { ...req, description };

    const problems = checkGrounding(candidate);
    if (problems.length) {
      throw new AppError(422, 'ungrounded_fields', 'Some extracted fields are not supported by the description.', problems);
    }

    const key = dedupeKey(candidate);
    const existing = this.store.findJobsByDedupeKey(key);
    if (existing.length && !req.allowDuplicate) {
      throw new AppError(409, 'duplicate_job', 'This job looks like one you already saved.', {
        existingJobIds: existing.map((j) => j.id),
      });
    }

    const at = this.now().toISOString();
    const job: Job = {
      id: this.newId(),
      title: req.title,
      employer: req.employer,
      location: req.location || null,
      salary: req.salary || null,
      workArrangement: req.workArrangement,
      sourceUrl: req.sourceUrl,
      description,
      provenance: req.provenance,
      verification: {
        status: 'unverified',
        checkedAt: null,
        note: 'Entered manually; not checked against the live posting.',
      },
      dedupeKey: key,
      capturedAt: at,
    };
    const app: Application = {
      id: this.newId(),
      jobId: job.id,
      status: 'discovered',
      createdAt: at,
      updatedAt: at,
      statusChangedAt: at,
      appliedConfirmedAt: null,
    };

    this.store.transaction(() => {
      this.store.insertJob(job);
      this.store.upsertApplication(app);
      this.store.addActivity(this.activity(app.id, 'created', null, 'discovered', 'Saved from manual job intake.', at));
    });
    return { job, application: this.getApplication(app.id) };
  }

  getJob(id: string): Job {
    return this.store.getJob(id) ?? (() => { throw notFound('Job'); })();
  }

  /* ---------- applications ---------- */

  listApplications(): ApplicationView[] {
    const jobs = new Map(this.store.listJobs().map((j) => [j.id, j]));
    const activity = new Map<string, ActivityEntry[]>();
    for (const entry of this.store.listActivity()) {
      const list = activity.get(entry.applicationId) ?? [];
      list.push(entry);
      activity.set(entry.applicationId, list);
    }
    return this.store.listApplications().flatMap((app) => {
      const job = jobs.get(app.jobId);
      return job
        ? [{ ...app, job, activity: activity.get(app.id) ?? [], allowedNext: [...allowedTransitions(app.status)] }]
        : [];
    });
  }

  getApplication(id: string): ApplicationView {
    const app = this.store.getApplication(id);
    if (!app) throw notFound('Application');
    const job = this.store.getJob(app.jobId);
    if (!job) throw notFound('Job');
    return { ...app, job, activity: this.store.listActivity(id), allowedNext: [...allowedTransitions(app.status)] };
  }

  transition(id: string, input: unknown): ApplicationView {
    const req = StatusTransitionRequest.parse(input);
    const app = this.store.getApplication(id);
    if (!app) throw notFound('Application');

    const check = checkTransition(app.status, req.to, req.confirmSubmitted);
    if (!check.ok) {
      const status = check.code === 'confirmation_required' ? 428 : 409;
      throw new AppError(status, check.code, check.message);
    }

    const at = this.now().toISOString();
    const next: Application = {
      ...app,
      status: req.to,
      updatedAt: at,
      statusChangedAt: at,
      appliedConfirmedAt: req.to === 'applied' ? at : app.appliedConfirmedAt,
    };
    let note = req.note;
    if (req.to === 'applied') {
      const view = this.getPackage(id);
      const required = view.checklist.filter((i) => !i.optional);
      const done = required.filter((i) => i.done).length;
      note = [note, `You confirmed you submitted this application. Checklist: ${done} of ${required.length} required items complete.`].filter(Boolean).join(' ');
    }
    this.store.transaction(() => {
      this.store.upsertApplication(next);
      this.store.addActivity(this.activity(id, 'status_changed', app.status, req.to, note, at));
    });
    return this.getApplication(id);
  }

  addNote(id: string, input: unknown): ApplicationView {
    const { note } = NoteRequest.parse(input);
    const app = this.store.getApplication(id);
    if (!app) throw notFound('Application');
    const at = this.now().toISOString();
    this.store.transaction(() => {
      this.store.upsertApplication({ ...app, updatedAt: at });
      this.store.addActivity(this.activity(id, 'note', null, null, note, at));
    });
    return this.getApplication(id);
  }

  /* ---------- resume import ---------- */

  /** Stores the original (deduplicated by hash) and returns an unverified proposal for review. */
  importResume(input: unknown): ResumeImportResult {
    const req = ResumeImportRequest.parse(input);
    let filename: string;
    let bytes: Buffer;
    if ('text' in req) {
      filename = 'pasted-resume.txt';
      bytes = Buffer.from(req.text, 'utf8');
    } else {
      filename = req.filename.replace(/[\\/]/g, '_');
      bytes = Buffer.from(req.contentBase64, 'base64');
    }
    if (!bytes.length) throw new AppError(422, 'empty_file', 'The file is empty.');
    if (bytes.length > MAX_RESUME_BYTES) throw new AppError(413, 'file_too_large', 'Resume files must be 5 MB or smaller.');

    let decoded;
    try {
      decoded = decodeResumeFile(filename, bytes);
    } catch (err) {
      if (err instanceof UnsupportedResumeError) throw new AppError(415, 'unsupported_resume', err.message);
      if (err instanceof ZipError) throw new AppError(422, 'invalid_document', `Could not read this document: ${err.message}`);
      throw new AppError(422, 'invalid_document', 'Could not read this document.');
    }
    const existing = this.store.findResumeFileBySha(decoded.sha256);
    const file: ResumeFile =
      existing ??
      this.store.insertResumeFile(
        { id: this.newId(), filename, mediaType: decoded.mediaType, sha256: decoded.sha256, size: decoded.size, importedAt: this.now().toISOString() },
        bytes,
      );
    const { proposal, warnings } = parseResumeText(decoded.text);
    if (existing) warnings.unshift('This exact file was imported before; the stored original was reused.');
    return { file, text: decoded.text, proposal, warnings };
  }

  listResumeFiles(): ResumeFile[] {
    return this.store.listResumeFiles();
  }

  getResumeOriginal(id: string): { meta: ResumeFile; data: Buffer } {
    return this.store.getResumeFile(id) ?? (() => { throw notFound('Resume file'); })();
  }

  /* ---------- tailored documents ---------- */

  getDocuments(applicationId: string): DocumentsBundle {
    this.getApplication(applicationId);
    const resume = this.store.getResumeDraft(applicationId);
    const coverLetter = this.store.getCoverLetterDraft(applicationId);
    const profile = this.getProfile();
    const changed = !!resume && !!profile.updatedAt && (!resume.profileUpdatedAt || profile.updatedAt > resume.profileUpdatedAt);
    return { resume, coverLetter, profileChangedSinceDraft: changed };
  }

  generateDocuments(applicationId: string, input: unknown): DocumentsBundle {
    const { overwrite } = GenerateDocumentsRequest.parse(input ?? {});
    const app = this.getApplication(applicationId);
    const existing = this.getDocuments(applicationId);
    const edited = (existing.resume && existing.resume.updatedAt !== existing.resume.generatedAt) || existing.coverLetter?.edited;
    if (edited && !overwrite) {
      throw new AppError(409, 'drafts_edited', 'You have edited these drafts. Regenerating will replace your edits.');
    }
    const profile = this.getProfile();
    const now = this.now();
    const resume = buildResumeDraft({ applicationId, job: app.job, profile, now });
    const coverLetter = buildCoverLetter({ applicationId, job: app.job, profile, now, resume });
    this.store.transaction(() => {
      this.store.putDocument(resume);
      this.store.putDocument(coverLetter);
      this.store.addActivity(this.activity(applicationId, 'note', null, null, 'Generated tailored resume and cover letter drafts.', now.toISOString()));
    });
    return this.getDocuments(applicationId);
  }

  private requireResume(applicationId: string): ResumeDraft {
    const draft = this.store.getResumeDraft(applicationId);
    if (!draft) throw new AppError(404, 'no_draft', 'Generate drafts first.');
    return draft;
  }

  updateResumeDraft(applicationId: string, input: unknown): DocumentsBundle {
    const update = ResumeDraftUpdate.parse(input);
    try {
      this.store.putDocument(applyResumeUpdate(this.requireResume(applicationId), update, this.now()));
    } catch (err) {
      if (err instanceof DraftUpdateError) throw new AppError(422, 'invalid_draft_update', err.message);
      throw err;
    }
    return this.getDocuments(applicationId);
  }

  updateCoverLetter(applicationId: string, input: unknown): DocumentsBundle {
    const { text } = CoverLetterUpdate.parse(input);
    const current = this.store.getCoverLetterDraft(applicationId);
    if (!current) throw new AppError(404, 'no_draft', 'Generate drafts first.');
    const next: CoverLetterDraft = { ...current, text, edited: text !== current.text || current.edited, sources: text === current.text ? current.sources : [], updatedAt: this.now().toISOString() };
    this.store.putDocument(next);
    return this.getDocuments(applicationId);
  }

  exportDocument(applicationId: string, kind: DocumentKind, format: ExportFormat): ExportResult {
    const app = this.getApplication(applicationId);
    const result = exportDocument({
      kind,
      format,
      resume: this.requireResume(applicationId),
      coverLetter: this.store.getCoverLetterDraft(applicationId),
      profile: this.getProfile(),
      employer: app.job.employer,
    });
    if (result.check.ok) {
      const pkg = this.packageOf(applicationId);
      this.store.putDocument({ ...pkg, exports: { ...pkg.exports, [kind]: this.now().toISOString() }, updatedAt: this.now().toISOString() });
    } else {
      throw new AppError(422, 'export_check_failed', [...result.check.problems, ...result.check.missing.map((m) => `Missing from export: ${m}`)].join(' '), result.check);
    }
    return result;
  }

  /* ---------- application package (M4) ---------- */

  private packageOf(applicationId: string): ApplicationPackage {
    return this.store.getPackage(applicationId) ?? emptyPackage(applicationId, this.now());
  }

  getPackage(applicationId: string): PackageView {
    const app = this.getApplication(applicationId);
    const pkg = this.packageOf(applicationId);
    const eligibility = this.assessApplication(applicationId).eligibility.status;
    const c = checklist({ pkg, job: app.job, resume: this.store.getResumeDraft(applicationId), coverLetter: this.store.getCoverLetterDraft(applicationId), eligibility });
    return { package: pkg, checklist: c.items, applyUrl: c.applyUrl, ready: c.ready };
  }

  updatePackage(applicationId: string, input: unknown): PackageView {
    const u = PackageUpdate.parse(input);
    const app = this.getApplication(applicationId);
    const at = this.now().toISOString();
    const pkg = this.packageOf(applicationId);
    this.store.transaction(() => {
      this.store.putDocument({
        ...pkg,
        officialApplyUrl: u.officialApplyUrl === undefined ? pkg.officialApplyUrl : u.officialApplyUrl,
        eligibilityAcknowledged: u.eligibilityAcknowledged ?? pkg.eligibilityAcknowledged,
        updatedAt: at,
      });
      if (u.postingCheckedByUser !== undefined && u.postingCheckedByUser !== (app.job.verification.status === 'verified')) {
        this.store.updateJob({
          ...app.job,
          verification: u.postingCheckedByUser
            ? { status: 'verified', checkedAt: at, note: 'You confirmed the details on the official posting.' }
            : { status: 'unverified', checkedAt: null, note: 'Entered manually; not checked against the live posting.' },
        });
        this.store.addActivity(this.activity(applicationId, 'note', null, null, u.postingCheckedByUser ? 'You confirmed the posting details on the official site.' : 'Posting marked as not verified.', at));
      }
    });
    return this.getPackage(applicationId);
  }

  addQuestions(applicationId: string, input: unknown): PackageView {
    const { questions } = AddQuestionsRequest.parse(input);
    const app = this.getApplication(applicationId);
    const profile = this.getProfile();
    const pkg = this.packageOf(applicationId);
    const now = this.now();
    const added = questions.map((q) => ({ id: this.newId(), question: q.trim(), ...draftAnswer(q, profile, app.job, now) }));
    if (pkg.answers.length + added.length > 100) throw new AppError(422, 'too_many_questions', 'An application can hold up to 100 questions.');
    this.store.putDocument({ ...pkg, answers: [...pkg.answers, ...added], updatedAt: now.toISOString() });
    return this.getPackage(applicationId);
  }

  updateAnswer(applicationId: string, answerId: string, input: unknown): PackageView {
    const u = AnswerUpdate.parse(input);
    const pkg = this.packageOf(applicationId);
    const current = pkg.answers.find((a) => a.id === answerId);
    if (!current) throw notFound('Answer');
    if (u.reviewed && !u.answer.trim()) throw new AppError(422, 'empty_answer', 'Write an answer before marking it reviewed.');
    const changed = u.answer !== current.answer;
    const next = {
      ...current,
      answer: u.answer,
      status: u.reviewed ? ('reviewed' as const) : u.answer.trim() ? ('drafted' as const) : ('needs_input' as const),
      source: changed ? { kind: 'user' as const, detail: 'Written or edited by you' } : current.source,
    };
    this.store.transaction(() => {
      this.store.putDocument({ ...pkg, answers: pkg.answers.map((a) => (a.id === answerId ? next : a)), updatedAt: this.now().toISOString() });
      if (u.saveToProfile && u.answer.trim()) {
        const profile = this.getProfile();
        const same = profile.answers.find((a) => a.question.trim().toLowerCase() === current.question.trim().toLowerCase());
        const answers = same
          ? profile.answers.map((a) => (a.id === same.id ? { ...a, answer: u.answer } : a))
          : [...profile.answers, { id: this.newId(), question: current.question, answer: u.answer }];
        this.store.saveProfile({ ...profile, answers, updatedAt: this.now().toISOString() });
      }
    });
    return this.getPackage(applicationId);
  }

  removeAnswer(applicationId: string, answerId: string): PackageView {
    const pkg = this.packageOf(applicationId);
    if (!pkg.answers.some((a) => a.id === answerId)) throw notFound('Answer');
    this.store.putDocument({ ...pkg, answers: pkg.answers.filter((a) => a.id !== answerId), updatedAt: this.now().toISOString() });
    return this.getPackage(applicationId);
  }

  /* ---------- assessment ---------- */

  /** Recomputed on demand from the saved job and the current profile (deterministic). */
  assessApplication(id: string): Assessment {
    const app = this.getApplication(id);
    return assess({
      applicationId: app.id,
      job: app.job,
      profile: this.getProfile(),
      goalRoles: this.getOnboarding().goals.targetRoles,
      now: this.now(),
    });
  }

  assessmentSummaries(): AssessmentSummary[] {
    const profile = this.getProfile();
    const goalRoles = this.getOnboarding().goals.targetRoles;
    const now = this.now();
    return this.listApplications().map((app) => {
      const a = assess({ applicationId: app.id, job: app.job, profile, goalRoles, now });
      return { applicationId: app.id, overall: a.fit.overall, eligibility: a.eligibility.status };
    });
  }

  rubric() {
    return {
      version: RUBRIC_VERSION,
      criteria: Object.entries(RUBRIC).map(([key, r]) => ({ key, ...r })),
    };
  }

  /* ---------- insight & export ---------- */

  dashboard(): DashboardSummary {
    return summarize(this.listApplications(), this.now());
  }

  exportAll(): ExportBundle {
    return {
      format: 'reboundops-export',
      formatVersion: 1,
      exportedAt: this.now().toISOString(),
      schemaVersion: this.store.schemaVersion,
      onboarding: this.getOnboarding(),
      profile: this.getProfile(),
      jobs: this.store.listJobs(),
      applications: this.store.listApplications(),
      activity: this.store.listActivity(),
    };
  }

  private activity(
    applicationId: string,
    kind: ActivityEntry['kind'],
    from: ActivityEntry['from'],
    to: ActivityEntry['to'],
    note: string,
    at: string,
  ): ActivityEntry {
    return { id: this.newId(), applicationId, at, kind, from, to, note };
  }
}

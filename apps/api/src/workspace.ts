import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  type ActivityEntry,
  type AiSettings,
  type AiSettingsView,
  type Assessment,
  type ImportPreview,
  type ImportResult,
  type RewriteResult,
  type Contact,
  type DeletedItem,
  AssistRequest,
  type AssistResult,
  FollowUpTemplate,
  type FollowUpSuggestion,
  InterviewNote,
  InterviewNoteInput,
  FitWeights,
  type FollowUpDraft,
  type Reminder,
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
  ImportCommitRequest,
  ImportPreviewRequest,
  AiSettingsUpdate,
  ProviderId,
  RewriteRequest,
  AnswerUpdate,
  ContactInput,
  CoverLetterUpdate,
  FollowUpKind,
  ReminderInput,
  ReminderUpdate,
  PackageUpdate,
  GenerateDocumentsRequest,
  JobCreate,
  JobUpdate,
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
  addDays,
  followUpPriorities,
  allowedTransitions,
  checkTransition,
  isReopen,
  STATUS_LABELS,
  defaultOnboarding,
  defaultProfile,
  mergeOnboarding,
  normalizeList,
  summarize,
} from '@reboundops/core';
import { assess, checkGrounding, DEFAULT_FIT_WEIGHTS, dedupeKey, extractJob, findDuplicates, normalizeDescription, RUBRIC, RUBRIC_VERSION } from '@reboundops/job-intelligence';
import { checkPasswordStrength, encryptBackupFile, type Store } from '@reboundops/storage';
import { ImportFormatError, planImport, type ImportPlan } from '@reboundops/importer';
import { checklist, draftAnswer, emptyPackage, followUpDraft, interviewPrepPrompts, renderTemplate } from '@reboundops/applications';
import { ADAPTERS } from '@reboundops/job-sources';
import {
  AiConfigError,
  AiProviderError,
  createProvider,
  keyFor,
  ollamaBaseUrl,
  PROVIDERS,
  suggestRewrite,
  runAssist,
  type AiProvider,
  type FetchLike,
} from '@reboundops/ai-providers';
import {
  applyResumeUpdate,
  buildCoverLetter,
  buildResumeDraft,
  decodeResumeFileAsync,
  type DecodedResumeWithExtraction,
  DraftUpdateError,
  PdfImportError,
  exportDocument,
  parseResumeText,
  type ExportResult,
  UnsupportedResumeError,
  ZipError,
} from '@reboundops/documents';
import { AppError, notFound } from './errors.ts';
import { DiscoveryService } from './discovery.ts';
import { RestoreService } from './restore.ts';
import { API_VERSION } from './version.ts';
import type { FetchLike as SourceFetch } from '@reboundops/job-sources';

/** RFC 4180 CSV; cells that a spreadsheet would treat as a formula are prefixed with an apostrophe. */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    let t = String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

const SaveDiscoveredRequest = z.object({ employer: z.string().trim().min(1).max(300).optional(), allowDuplicate: z.boolean().default(false) });

/** How long deleted contacts and reminders stay restorable. */
export const UNDO_DAYS = 30;

export interface WorkspaceOptions {
  now?: () => Date;
  newId?: () => string;
  /** Environment used for provider API keys (defaults to process.env). */
  env?: Record<string, string | undefined>;
  /** Transport for AI providers (tests inject a mock; nothing is sent otherwise). */
  aiFetch?: FetchLike;
  /** Transport for official job-board requests (tests inject a mock). */
  sourceFetch?: SourceFetch;
}

/**
 * Application service: orchestrates domain rules (core, job-intelligence)
 * over persistence (storage). Inputs are `unknown` and validated here so
 * every caller — HTTP, CLI, tests — gets identical guarantees.
 */
export class Workspace {
  private readonly now: () => Date;
  private readonly newId: () => string;
  private store: Store;
  private readonly env: Record<string, string | undefined>;
  private readonly aiFetch: FetchLike | undefined;
  discovery: DiscoveryService;
  readonly restore: RestoreService;
  private readonly sourceFetch: SourceFetch | undefined;
  private readonly stagedImports = new Map<string, { plan: ImportPlan; expires: number }>();

  constructor(store: Store, options: WorkspaceOptions = {}) {
    this.store = store;
    this.env = options.env ?? process.env;
    this.aiFetch = options.aiFetch;
    this.sourceFetch = options.sourceFetch;
    this.discovery = this.makeDiscovery();
    this.restore = new RestoreService({ getStore: () => this.store, replaceStore: (next) => this.replaceStore(next), now: () => this.now() });
    this.now = options.now ?? (() => new Date());
    this.newId = options.newId ?? randomUUID;
  }

  private makeDiscovery(): DiscoveryService {
    return new DiscoveryService({
      store: this.store,
      now: () => this.now(),
      newId: () => this.newId(),
      fetch: this.sourceFetch,
      getProfile: () => this.getProfile(),
      getOnboarding: () => this.getOnboarding(),
      getWeights: () => this.getFitWeights(),
    });
  }

  /** The open store (it changes after an in-app restore). */
  get currentStore(): Store {
    return this.store;
  }

  /** Used by the in-app restore after it has swapped the database file. */
  private replaceStore(next: Store): void {
    this.store = next;
    this.discovery = this.makeDiscovery();
    this.stagedImports.clear();
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
    if (Object.values(req.provenance).some((p) => p?.origin === 'source')) {
      throw new AppError(422, 'invalid_provenance', 'Only jobs saved through Discover can carry job-board provenance.');
    }
    const description = normalizeDescription(req.description);
    const candidate = { ...req, description };

    const problems = checkGrounding(candidate);
    if (problems.length) {
      throw new AppError(422, 'ungrounded_fields', 'Some extracted fields are not supported by the description.', problems);
    }

    const key = dedupeKey(candidate);
    const matches = findDuplicates(candidate, this.store.listJobs());
    if (matches.length && !req.allowDuplicate) {
      throw new AppError(409, 'duplicate_job', 'This job looks like one you already saved.', {
        existingJobIds: [...new Set(matches.map((m) => m.jobId))],
        matches,
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

  /** Edits job details. Changed fields become the person's own claim (provenance "user"). */
  updateJob(id: string, input: unknown): Job {
    const u = JobUpdate.parse(input);
    const job = this.getJob(id);
    const next: Job = { ...job, provenance: { ...job.provenance } };
    const userProv = { origin: 'user' as const, evidence: null };
    if (u.title !== undefined && u.title !== job.title) { next.title = u.title; next.provenance.title = userProv; }
    if (u.employer !== undefined && u.employer !== job.employer) { next.employer = u.employer; next.provenance.employer = userProv; }
    if (u.location !== undefined && (u.location || null) !== job.location) { next.location = u.location || null; next.provenance.location = next.location ? userProv : null; }
    if (u.salary !== undefined && (u.salary || null) !== job.salary) { next.salary = u.salary || null; next.provenance.salary = next.salary ? userProv : null; }
    if (u.workArrangement !== undefined) next.workArrangement = u.workArrangement;
    if (u.sourceUrl !== undefined) next.sourceUrl = u.sourceUrl;
    next.dedupeKey = dedupeKey(next);
    const app = this.store.listApplications().find((a) => a.jobId === id);
    this.store.transaction(() => {
      this.store.updateJob(next);
      if (app) this.store.addActivity(this.activity(app.id, 'note', null, null, 'Job details edited by you.', this.now().toISOString()));
    });
    return next;
  }

  /** Permanently deletes an application and everything attached to it. The caller confirms first. */
  deleteApplication(id: string): void {
    const app = this.store.getApplication(id);
    if (!app) throw notFound('Application');
    this.store.deleteJob(app.jobId);
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
        ? [{ ...app, job, activity: activity.get(app.id) ?? [], allowedNext: [...allowedTransitions(app.status, { previouslySubmitted: app.appliedConfirmedAt !== null })] }]
        : [];
    });
  }

  getApplication(id: string): ApplicationView {
    const app = this.store.getApplication(id);
    if (!app) throw notFound('Application');
    const job = this.store.getJob(app.jobId);
    if (!job) throw notFound('Job');
    return { ...app, job, activity: this.store.listActivity(id), allowedNext: [...allowedTransitions(app.status, { previouslySubmitted: app.appliedConfirmedAt !== null })] };
  }

  transition(id: string, input: unknown): ApplicationView {
    const req = StatusTransitionRequest.parse(input);
    const app = this.store.getApplication(id);
    if (!app) throw notFound('Application');

    const previouslySubmitted = app.appliedConfirmedAt !== null;
    const check = checkTransition(app.status, req.to, req.confirmSubmitted, { previouslySubmitted });
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
      // The first confirmed submission time is kept for good; later moves never overwrite it.
      appliedConfirmedAt: app.appliedConfirmedAt ?? (req.to === 'applied' ? at : null),
    };
    let note = req.note;
    const reopened = isReopen(app.status, req.to);
    if (reopened) {
      note = [note, `Reopened from ${STATUS_LABELS[app.status]}. Earlier history is kept.`].filter(Boolean).join(' ');
    }
    if (req.to === 'applied' && previouslySubmitted) {
      note = [note, `Original submission date kept (${app.appliedConfirmedAt!.slice(0, 10)}).`].filter(Boolean).join(' ');
    } else if (req.to === 'applied') {
      const view = this.getPackage(id);
      const required = view.checklist.filter((i) => !i.optional);
      const done = required.filter((i) => i.done).length;
      note = [note, `You confirmed you submitted this application. Checklist: ${done} of ${required.length} required items complete.`].filter(Boolean).join(' ');
    }
    this.store.transaction(() => {
      this.store.upsertApplication(next);
      this.store.addActivity(this.activity(id, reopened ? 'reopened' : 'status_changed', app.status, req.to, note, at));
      if (req.to === 'applied' && !previouslySubmitted && !this.store.listReminders(id).some((r) => !r.done)) {
        this.store.upsertReminder({ id: this.newId(), applicationId: id, dueOn: addDays(this.now(), 7), label: 'Follow up if you have not heard back', done: false, doneAt: null, createdAt: at });
      }
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
  async importResume(input: unknown): Promise<ResumeImportResult> {
    const req = ResumeImportRequest.parse(input);
    let filename: string;
    let bytes: Buffer;
    let manualText: string | undefined;
    if ('text' in req) {
      filename = 'pasted-resume.txt';
      bytes = Buffer.from(req.text, 'utf8');
    } else {
      filename = req.filename.replace(/[\\/]/g, '_');
      bytes = Buffer.from(req.contentBase64, 'base64');
      manualText = req.manualText;
    }
    if (!bytes.length) throw new AppError(422, 'empty_file', 'The file is empty.');
    if (bytes.length > MAX_RESUME_BYTES) throw new AppError(413, 'file_too_large', 'Resume files must be 5 MB or smaller.');

    let decoded: DecodedResumeWithExtraction;
    const extraWarnings: string[] = [];
    try {
      decoded = await decodeResumeFileAsync(filename, bytes);
    } catch (err) {
      if (err instanceof PdfImportError) {
        // The text could not be read, but the person typed it: keep the original and use their text.
        if (manualText && err.problem !== 'too_large') {
          decoded = {
            mediaType: 'application/pdf',
            text: manualText,
            sha256: createHash('sha256').update(bytes).digest('hex'),
            size: bytes.length,
            extraction: { method: 'pdf_text', confidence: 'high', pages: null, links: [] },
            warnings: [],
          };
          extraWarnings.push('Text was entered by you because the PDF text could not be read; the original PDF is kept.');
        } else {
          throw new AppError(422, `pdf_${err.problem}`, err.message);
        }
      } else if (err instanceof UnsupportedResumeError) throw new AppError(415, 'unsupported_resume', err.message);
      else if (err instanceof ZipError) throw new AppError(422, 'invalid_document', `Could not read this document: ${err.message}`);
      else throw new AppError(422, 'invalid_document', 'Could not read this document.');
    }
    const existing = this.store.findResumeFileBySha(decoded.sha256);
    const file: ResumeFile =
      existing ??
      this.store.insertResumeFile(
        { id: this.newId(), filename, mediaType: decoded.mediaType, sha256: decoded.sha256, size: decoded.size, importedAt: this.now().toISOString() },
        bytes,
      );
    const { proposal, warnings } = parseResumeText(decoded.text);
    warnings.unshift(...decoded.warnings, ...extraWarnings);
    if (existing) warnings.unshift('This exact file was imported before; the stored original was reused.');
    const method = 'text' in req ? 'pasted' : extraWarnings.length ? 'manual_entry' : decoded.extraction.method;
    let confidence = decoded.extraction.confidence;
    // Few recognised sections means the structure was probably not recovered.
    const found = proposal.experience.length + proposal.education.length + proposal.skills.length;
    if (found === 0 && confidence === 'high') {
      confidence = 'low';
      warnings.push('No experience, education or skills sections were recognised. Add them by hand in your profile.');
    }
    return { file, text: decoded.text, proposal, warnings, extraction: { ...decoded.extraction, method, confidence } };
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

  /* ---------- contacts, reminders, follow-ups (M5) ---------- */

  listContacts(applicationId: string): Contact[] {
    this.getApplication(applicationId);
    return this.store.listContacts(applicationId);
  }

  saveContact(applicationId: string, contactId: string | null, input: unknown): Contact {
    this.getApplication(applicationId);
    const c = ContactInput.parse(input);
    const at = this.now().toISOString();
    const existing = contactId ? this.store.listContacts(applicationId).find((x) => x.id === contactId) : undefined;
    if (contactId && !existing) throw notFound('Contact');
    return this.store.transaction(() => {
      const saved = this.store.upsertContact({ ...c, id: existing?.id ?? this.newId(), applicationId, createdAt: existing?.createdAt ?? at, updatedAt: at });
      this.store.addActivity(
        this.activity(applicationId, 'contact', null, null, existing ? `Updated contact ${saved.name}.` : `Added contact ${saved.name}${saved.role ? ` (${saved.role})` : ''}.`, at),
      );
      return saved;
    });
  }

  /** Soft-deletes a contact; it can be restored for UNDO_DAYS. */
  deleteContact(applicationId: string, contactId: string): DeletedItem {
    const c = this.store.listContacts(applicationId).find((x) => x.id === contactId);
    if (!c) throw notFound('Contact');
    const at = this.now().toISOString();
    this.store.transaction(() => {
      this.store.deleteContact(contactId, at);
      this.store.addActivity(this.activity(applicationId, 'contact', null, null, `Removed contact ${c.name}.`, at));
    });
    return { id: contactId, kind: 'contact', label: c.name, deletedAt: at, undoUntil: this.undoUntil(at) };
  }

  restoreContact(applicationId: string, contactId: string): Contact {
    const d = this.store.getDeletedContact(contactId);
    if (!d || d.contact.applicationId !== applicationId) throw notFound('Deleted contact');
    const at = this.now().toISOString();
    return this.store.transaction(() => {
      const c = this.store.restoreContact(contactId)!;
      this.store.addActivity(this.activity(applicationId, 'contact', null, null, `Restored contact ${c.name}.`, at));
      return c;
    });
  }

  private undoUntil(at: string): string {
    return new Date(Date.parse(at) + UNDO_DAYS * 86_400_000).toISOString();
  }

  /** Permanently removes items deleted longer than UNDO_DAYS ago. */
  purgeExpiredDeletes(): number {
    return this.store.purgeDeleted(new Date(this.now().getTime() - UNDO_DAYS * 86_400_000).toISOString());
  }

  listReminders(applicationId: string): Reminder[] {
    this.getApplication(applicationId);
    return this.store.listReminders(applicationId);
  }

  addReminder(applicationId: string, input: unknown): Reminder {
    this.getApplication(applicationId);
    const r = ReminderInput.parse(input);
    const at = this.now().toISOString();
    return this.store.transaction(() => {
      const saved = this.store.upsertReminder({ ...r, priority: r.priority ?? 'normal', notes: r.notes ?? '', id: this.newId(), applicationId, done: false, doneAt: null, createdAt: at });
      this.store.addActivity(this.activity(applicationId, 'reminder', null, null, `Reminder set for ${saved.dueOn}: ${saved.label}.`, at));
      return saved;
    });
  }

  updateReminder(applicationId: string, reminderId: string, input: unknown): Reminder {
    const u = ReminderUpdate.parse(input);
    const r = this.store.listReminders(applicationId).find((x) => x.id === reminderId);
    if (!r) throw notFound('Reminder');
    const at = this.now().toISOString();
    return this.store.transaction(() => {
      const next = this.store.upsertReminder({
        ...r,
        dueOn: u.dueOn ?? r.dueOn,
        label: u.label ?? r.label,
        priority: u.priority ?? r.priority,
        notes: u.notes ?? r.notes,
        done: u.done ?? r.done,
        doneAt: u.done === undefined ? r.doneAt : u.done ? at : null,
      });
      if (u.done && !r.done) this.store.addActivity(this.activity(applicationId, 'reminder', null, null, `Done: ${r.label}.`, at));
      else if (u.done === false && r.done) this.store.addActivity(this.activity(applicationId, 'reminder', null, null, `Reopened reminder: ${r.label}.`, at));
      else if (u.dueOn && u.dueOn !== r.dueOn) this.store.addActivity(this.activity(applicationId, 'reminder', null, null, `Reminder moved from ${r.dueOn} to ${u.dueOn}: ${next.label}.`, at));
      return next;
    });
  }

  deleteReminder(applicationId: string, reminderId: string): DeletedItem {
    const r = this.store.listReminders(applicationId).find((x) => x.id === reminderId);
    if (!r) throw notFound('Reminder');
    const at = this.now().toISOString();
    this.store.transaction(() => {
      this.store.deleteReminder(reminderId, at);
      this.store.addActivity(this.activity(applicationId, 'reminder', null, null, `Removed reminder: ${r.label}.`, at));
    });
    return { id: reminderId, kind: 'reminder', label: r.label, deletedAt: at, undoUntil: this.undoUntil(at) };
  }

  restoreReminder(applicationId: string, reminderId: string): Reminder {
    const d = this.store.getDeletedReminder(reminderId);
    if (!d || d.reminder.applicationId !== applicationId) throw notFound('Deleted reminder');
    const at = this.now().toISOString();
    return this.store.transaction(() => {
      const r = this.store.restoreReminder(reminderId)!;
      this.store.addActivity(this.activity(applicationId, 'reminder', null, null, `Restored reminder: ${r.label}.`, at));
      return r;
    });
  }

  followUp(applicationId: string, kindRaw: unknown, contactId: unknown, templateId?: unknown): FollowUpDraft {
    const app = this.getApplication(applicationId);
    const contacts = this.store.listContacts(applicationId);
    const contact = typeof contactId === 'string' && contactId ? contacts.find((c) => c.id === contactId) ?? null : contacts[0] ?? null;
    if (typeof contactId === 'string' && contactId && !contact) throw notFound('Contact');
    if (typeof templateId === 'string' && templateId) {
      const t = this.followUpTemplates().find((x) => x.id === templateId);
      if (!t) throw notFound('Template');
      return renderTemplate(t, app, this.getProfile(), contact);
    }
    const kind = FollowUpKind.parse(kindRaw ?? 'after_applying');
    return followUpDraft(kind, app, this.getProfile(), contact);
  }

  /* ---------- follow-up templates, interviews, prioritisation (v0.2.0) ---------- */

  followUpTemplates(): FollowUpTemplate[] {
    return this.store.getSetting('followup_templates', z.array(FollowUpTemplate)) ?? [];
  }

  saveFollowUpTemplates(input: unknown): FollowUpTemplate[] {
    const list = z.array(FollowUpTemplate.omit({ id: true }).extend({ id: z.string().min(1).max(64).optional() })).max(30).parse(input);
    const saved = list.map((t) => ({ ...t, id: t.id ?? this.newId() }));
    this.store.putSetting('followup_templates', saved, this.now().toISOString());
    return saved;
  }

  followUpSuggestions(): FollowUpSuggestion[] {
    return followUpPriorities(this.listApplications(), this.store.listReminders(), this.now());
  }

  listInterviews(applicationId: string): InterviewNote[] {
    this.getApplication(applicationId);
    return this.store.listInterviewNotes(applicationId);
  }

  saveInterview(applicationId: string, interviewId: string | null, input: unknown): InterviewNote {
    this.getApplication(applicationId);
    const raw = (input ?? {}) as Record<string, unknown>;
    // Only fields the person sent change; schema defaults must not wipe saved notes.
    const u = Object.fromEntries(Object.entries(InterviewNoteInput.parse(raw)).filter(([k]) => k in raw));
    const at = this.now().toISOString();
    const existing = interviewId ? this.store.listInterviewNotes(applicationId).find((n) => n.id === interviewId) : undefined;
    if (interviewId && !existing) throw notFound('Interview');
    return this.store.transaction(() => {
      const saved = this.store.upsertInterviewNote(
        InterviewNote.parse({ ...(existing ?? {}), ...u, id: existing?.id ?? this.newId(), applicationId, createdAt: existing?.createdAt ?? at, updatedAt: at }),
      );
      const when = saved.scheduledFor ? ` on ${saved.scheduledFor.slice(0, 10)}` : '';
      if (!existing) this.store.addActivity(this.activity(applicationId, 'interview', null, null, `Interview added: ${saved.stage}${when}.`, at));
      else if (existing.outcome !== saved.outcome) this.store.addActivity(this.activity(applicationId, 'interview', null, null, `${saved.stage}: outcome recorded as ${saved.outcome.replace('_', ' ')}.`, at));
      else if (existing.scheduledFor !== saved.scheduledFor) this.store.addActivity(this.activity(applicationId, 'interview', null, null, `${saved.stage} moved${when}.`, at));
      return saved;
    });
  }

  deleteInterview(applicationId: string, interviewId: string): void {
    const n = this.store.listInterviewNotes(applicationId).find((x) => x.id === interviewId);
    if (!n) throw notFound('Interview');
    const at = this.now().toISOString();
    this.store.transaction(() => {
      this.store.deleteInterviewNote(interviewId);
      this.store.addActivity(this.activity(applicationId, 'interview', null, null, `Removed interview notes: ${n.stage}.`, at));
    });
  }

  /** Preparation prompts from the posting's qualifications and the assessment's gaps (deterministic). */
  interviewPrep(applicationId: string): { prompts: string[] } {
    return { prompts: interviewPrepPrompts(this.assessApplication(applicationId)) };
  }

  /** Tracking data as CSV (spreadsheet-safe). */
  exportCsv(kind: 'applications' | 'activity'): { data: string; filename: string } {
    const apps = this.listApplications();
    const day = this.now().toISOString().slice(0, 10);
    if (kind === 'applications') {
      const rows = apps.map((a) => [a.id, a.job.title, a.job.employer, a.job.location ?? '', a.status, a.createdAt, a.statusChangedAt, a.appliedConfirmedAt ?? '', a.job.sourceUrl ?? '', a.job.source?.provider ?? '', a.job.source?.availability ?? '']);
      return { data: toCsv(['application_id', 'title', 'employer', 'location', 'status', 'saved_at', 'status_changed_at', 'submitted_at', 'posting_url', 'source', 'listing'], rows), filename: `reboundops-applications-${day}.csv` };
    }
    const rows = apps.flatMap((a) => a.activity.map((e) => [e.at, a.id, a.job.title, a.job.employer, e.kind, e.from ?? '', e.to ?? '', e.note]));
    rows.sort((x, y) => String(y[0]).localeCompare(String(x[0])));
    return { data: toCsv(['at', 'application_id', 'title', 'employer', 'kind', 'from', 'to', 'note'], rows), filename: `reboundops-activity-${day}.csv` };
  }

  /* ---------- import (M8) ---------- */

  /** Validates and stages an import. Nothing is written until commitImport. */
  previewImport(input: unknown): ImportPreview {
    const req = ImportPreviewRequest.parse(input);
    const dedupeKeys = new Set(this.store.listJobs().map((j) => j.dedupeKey));
    let plan: ImportPlan;
    try {
      plan = planImport(req.content, { profile: this.getProfile(), dedupeKeys });
    } catch (err) {
      if (err instanceof ImportFormatError) throw new AppError(422, 'invalid_import', err.message);
      throw err;
    }
    const now = this.now().getTime();
    for (const [k, v] of this.stagedImports) if (v.expires < now) this.stagedImports.delete(k);
    const token = this.newId();
    const expires = now + 15 * 60_000;
    this.stagedImports.set(token, { plan, expires });
    return { token, expiresAt: new Date(expires).toISOString(), ...plan.preview };
  }

  commitImport(input: unknown): ImportResult {
    const { token } = ImportCommitRequest.parse(input);
    const staged = this.stagedImports.get(token);
    if (!staged || staged.expires < this.now().getTime()) throw new AppError(410, 'import_expired', 'This import preview expired. Preview the file again.');
    this.stagedImports.delete(token);
    const { plan } = staged;
    const at = this.now().toISOString();
    const source = plan.sourceFormat === 'reboundops-export' ? 'a ReboundOps export' : 'an earlier version';
    let jobsAdded = 0;
    let skipped = plan.preview.jobs.duplicates.length;

    this.store.transaction(() => {
      const profileChanged = Object.keys(plan.profilePatch).length > 0;
      if (profileChanged) this.store.saveProfile({ ...this.getProfile(), ...plan.profilePatch, updatedAt: at });
      const existingKeys = new Set(this.store.listJobs().map((j) => j.dedupeKey));
      for (const { job: j, dedupeKey: key, status } of plan.jobs) {
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }
        existingKeys.add(key);
        const captured = j.capturedAt ?? j.history?.[0]?.at ?? at;
        const user = { origin: 'user' as const, evidence: null };
        const jobId = this.newId();
        this.store.insertJob({
          id: jobId,
          title: j.title,
          employer: j.employer,
          location: j.location ?? null,
          salary: j.salary ?? null,
          workArrangement: null,
          sourceUrl: j.sourceUrl ?? null,
          description: j.description ?? '',
          provenance: { title: user, employer: user, location: j.location ? user : null, salary: j.salary ? user : null },
          verification: { status: 'unverified', checkedAt: null, note: `Imported from ${source}; not checked against the live posting.` },
          dedupeKey: key,
          capturedAt: captured,
        });
        const history = [...(j.history ?? [])].sort((a, b) => a.at.localeCompare(b.at));
        const submitted = ['applied', 'interviewing', 'offer'].includes(status) || history.some((h) => h.status === 'applied');
        const appliedAt = j.appliedAt ?? (submitted ? (history.find((h) => h.status === 'applied')?.at ?? captured) : null);
        const appId = this.newId();
        this.store.upsertApplication({
          id: appId,
          jobId,
          status,
          createdAt: captured,
          updatedAt: at,
          statusChangedAt: history.at(-1)?.at ?? captured,
          appliedConfirmedAt: appliedAt,
        });
        this.store.addActivity(this.activity(appId, 'created', null, history[0]?.status ?? status, `Imported from ${source}.`, captured));
        let prev = history[0]?.status ?? status;
        for (const h of history.slice(1)) {
          this.store.addActivity(this.activity(appId, 'status_changed', prev, h.status, h.note ?? '', h.at));
          prev = h.status;
        }
        if (prev !== status) this.store.addActivity(this.activity(appId, 'status_changed', prev, status, 'Status at import.', at));
        for (const n of j.notes ?? []) this.store.addActivity(this.activity(appId, 'note', null, null, n.text, n.at));
        for (const c of j.contacts ?? []) {
          this.store.upsertContact({ id: this.newId(), applicationId: appId, name: c.name, role: c.role ?? '', email: c.email ?? '', phone: c.phone ?? '', notes: c.notes ?? '', createdAt: at, updatedAt: at });
        }
        for (const r of j.reminders ?? []) {
          this.store.upsertReminder({ id: this.newId(), applicationId: appId, dueOn: r.dueOn, label: r.label, done: r.done ?? false, doneAt: r.done ? at : null, createdAt: at, priority: r.priority ?? 'normal', notes: '' });
        }
        jobsAdded++;
      }
      return profileChanged;
    });
    return { jobsAdded, profileUpdated: Object.keys(plan.profilePatch).length > 0, skipped, rejected: plan.preview.jobs.rejected.length };
  }

  /* ---------- optional AI (M6) ---------- */

  private aiSettings(): AiSettings {
    return this.store.getAiSettings() ?? { provider: null, model: '', baseUrl: '', consent: {} };
  }

  getAiSettings(): AiSettingsView {
    const settings = this.aiSettings();
    const aiMode = this.getOnboarding().aiMode;
    const providers = ProviderId.options.map((id) => ({
      id,
      label: PROVIDERS[id].label,
      local: PROVIDERS[id].local,
      keyConfigured: PROVIDERS[id].local || keyFor(id, this.env) !== null,
      keyEnvVar: PROVIDERS[id].keyEnv[0] ?? null,
      defaultModel: PROVIDERS[id].defaultModel,
    }));
    const { active, reason } = this.aiStatus(settings, aiMode);
    return { settings, aiMode, active, reason, providers };
  }

  private aiStatus(s: AiSettings, aiMode: string): { active: boolean; reason: string } {
    if (aiMode === 'off') return { active: false, reason: 'AI is turned off. Everything works without it.' };
    if (!s.provider) return { active: false, reason: 'No provider chosen.' };
    const meta = PROVIDERS[s.provider];
    if (aiMode === 'local' && !meta.local) return { active: false, reason: 'Local-only mode allows only a model on this computer.' };
    if (!meta.local && !s.consent[s.provider]) return { active: false, reason: `You have not agreed to send text to ${meta.label}.` };
    if (!meta.local && !keyFor(s.provider, this.env)) return { active: false, reason: `${meta.keyEnv[0]} is not set.` };
    if (!s.model && !meta.defaultModel) return { active: false, reason: 'Choose a model.' };
    return { active: true, reason: `Using ${meta.label}.` };
  }

  updateAiSettings(input: unknown): AiSettingsView {
    const u = AiSettingsUpdate.parse(input);
    const current = this.aiSettings();
    const at = this.now().toISOString();
    if (u.provider === 'ollama') {
      try {
        ollamaBaseUrl(u.baseUrl);
      } catch (err) {
        throw new AppError(422, 'invalid_ai_settings', (err as Error).message);
      }
    }
    const consent = { ...current.consent };
    if (u.provider && !PROVIDERS[u.provider].local) {
      if (u.consentToCloud) consent[u.provider] = consent[u.provider] ?? at;
      else delete consent[u.provider];
    }
    this.store.saveAiSettings({ provider: u.provider, model: u.model, baseUrl: u.baseUrl, consent }, at);
    return this.getAiSettings();
  }

  private provider(): AiProvider {
    const s = this.aiSettings();
    const status = this.aiStatus(s, this.getOnboarding().aiMode);
    if (!status.active || !s.provider) throw new AppError(409, 'ai_unavailable', status.reason);
    try {
      return createProvider({ provider: s.provider, model: s.model, baseUrl: s.baseUrl }, this.env, this.aiFetch);
    } catch (err) {
      if (err instanceof AiConfigError) throw new AppError(409, 'ai_unavailable', err.message);
      throw err;
    }
  }

  async testAi(): Promise<{ ok: boolean; detail: string }> {
    return this.provider().health();
  }

  async rewrite(input: unknown): Promise<RewriteResult> {
    const req = RewriteRequest.parse(input);
    const provider = this.provider();
    if (!provider.local && !req.confirmSend) {
      throw new AppError(428, 'confirm_send', `Confirm that this text may be sent to ${PROVIDERS[provider.id].label}.`);
    }
    const profile = this.getProfile();
    const allowedTerms = [
      ...profile.skills,
      ...profile.experience.flatMap((e) => [e.employer, e.title]),
      ...profile.education.map((e) => e.institution),
      ...profile.certifications.map((c) => c.name),
    ];
    try {
      const r = await suggestRewrite(provider, { text: req.text, purpose: req.purpose, ...(req.jobTitle ? { jobTitle: req.jobTitle } : {}), allowedTerms });
      return { ...r, provider: provider.id, model: provider.model, local: provider.local };
    } catch (err) {
      if (err instanceof AiProviderError) throw new AppError(502, 'ai_failed', `${err.message} Your text was not changed.`);
      throw err;
    }
  }

  /**
   * Optional AI help for one application. Sends only what the task needs,
   * checks the output against the records, and returns a suggestion to review.
   */
  async assist(applicationId: string, input: unknown): Promise<AssistResult> {
    const req = AssistRequest.parse(input);
    const app = this.getApplication(applicationId);
    const provider = this.provider();
    if (!provider.local && !req.confirmSend) {
      throw new AppError(428, 'confirm_send', `Confirm that this application's details may be sent to ${PROVIDERS[provider.id].label}.`);
    }
    if ((req.task === 'screening_answer' || req.task === 'cover_letter') && !req.input?.trim()) {
      throw new AppError(400, 'input_required', req.task === 'screening_answer' ? 'Enter the screening question.' : 'Paste the cover letter text to improve.');
    }
    const profile = this.getProfile();
    const verified = [
      ...profile.experience.filter((e) => e.verified).map((e) => `${e.title} at ${e.employer} (${e.start} – ${e.end ?? 'present'}). ${e.summary} ${e.highlights.join(' ')}`.trim()),
      ...profile.education.filter((e) => e.verified).map((e) => `${e.qualification} ${e.field}, ${e.institution}`.trim()),
      ...profile.certifications.filter((c) => c.verified).map((c) => `${c.name}${c.issuer ? `, ${c.issuer}` : ''}`),
      ...profile.skillExperience.map((x) => `${x.years} years with ${x.skill}`),
    ];
    const needsProfile = ['missing_skills', 'tailoring', 'screening_answer'].includes(req.task);
    const contact = this.store.listContacts(applicationId)[0];
    const ctx = {
      jobTitle: app.job.title,
      employer: app.job.employer,
      jobDescription: app.job.description,
      profileFacts: needsProfile ? verified : [],
      profileSkills: needsProfile ? profile.skills : [],
      ...(req.input ? { input: req.input } : {}),
      extraAllowed: [profile.displayName, contact?.name ?? '', app.appliedConfirmedAt?.slice(0, 10) ?? ''].filter(Boolean),
    };
    const sent = ['job title, employer and description', ...(needsProfile ? ['your skills and verified profile entries'] : []), ...(req.input ? ['the text you entered'] : [])];
    const assessment = this.assessApplication(applicationId);
    const baseline =
      req.task === 'missing_skills'
        ? assessment.missingQualifications
        : req.task === 'interview_prep'
          ? interviewPrepPrompts(assessment)
          : req.task === 'screening_answer' && req.input
            ? [draftAnswer(req.input, profile, app.job, this.now()).answer].filter(Boolean)
            : [];
    try {
      const out = await runAssist(provider, req.task, ctx);
      return { task: req.task, ...out, sent, provider: provider.id, model: provider.model, local: provider.local, baseline };
    } catch (err) {
      if (err instanceof AiProviderError) throw new AppError(502, 'ai_failed', `${err.message} Nothing was changed; the non-AI tools still work.`);
      throw err;
    }
  }

  /* ---------- discovery through official job boards (v0.2.0) ---------- */

  /** Saves a discovered posting to the tracker. Pay is read from the posting endpoint where the provider publishes it there. */
  async saveDiscovered(id: string, input: unknown): Promise<JobCreateResult> {
    const req = SaveDiscoveredRequest.parse(input ?? {});
    const p = this.discovery.get(id);
    if (p.savedJobId && this.store.getJob(p.savedJobId)) {
      throw new AppError(409, 'already_saved', 'This posting is already in your tracker.', { existingJobIds: [p.savedJobId] });
    }
    let detail = null;
    if (ADAPTERS[p.source].fetchPosting && this.discovery.consented()) {
      try {
        detail = (await this.discovery.recheck(p)).posting;
      } catch {
        detail = null; // keep the listing data; pay stays unknown
      }
    }
    const at = this.now().toISOString();
    const job = this.discovery.jobFrom(p, detail, req.employer ?? null, this.newId(), at);
    const matches = findDuplicates(job, this.store.listJobs());
    if (matches.length && !req.allowDuplicate) {
      throw new AppError(409, 'duplicate_job', 'This job looks like one you already saved.', { existingJobIds: [...new Set(matches.map((m) => m.jobId))], matches });
    }
    const app: Application = { id: this.newId(), jobId: job.id, status: 'discovered', createdAt: at, updatedAt: at, statusChangedAt: at, appliedConfirmedAt: null };
    this.store.transaction(() => {
      this.store.insertJob(job);
      this.store.upsertApplication(app);
      this.store.addActivity(this.activity(app.id, 'created', null, 'discovered', `Saved from the official ${ADAPTERS[p.source].info.label} board (retrieved ${p.retrievedAt.slice(0, 10)}).`, at));
      this.store.linkDiscoveredToJob(p.id, job.id);
    });
    return { job, application: this.getApplication(app.id) };
  }

  /** Re-checks whether a saved job's posting is still listed by its provider. */
  async checkPosting(jobId: string): Promise<Job> {
    const job = this.store.getJob(jobId);
    if (!job) throw notFound('Job');
    if (!job.source) throw new AppError(422, 'no_source', 'This job was not saved from a job board; open its link to check it yourself.');
    const { posting, checkedAt } = await this.discovery.recheck({ source: job.source.provider, board: job.source.board, postingId: job.source.postingId });
    const availability = posting ? 'listed' : 'not_listed';
    const next: Job = { ...job, source: { ...job.source, availability, lastCheckedAt: checkedAt } };
    const app = this.store.listApplications().find((a) => a.jobId === jobId);
    this.store.transaction(() => {
      this.store.updateJob(next);
      if (app) {
        this.store.addActivity(
          this.activity(app.id, 'note', null, null, posting ? `Posting still listed on ${ADAPTERS[job.source!.provider].info.label} (${checkedAt.slice(0, 16).replace('T', ' ')} UTC).` : `Posting no longer listed on ${ADAPTERS[job.source!.provider].info.label} as of ${checkedAt.slice(0, 10)}.`, checkedAt),
        );
      }
    });
    return next;
  }

  /* ---------- assessment ---------- */

  /** The person's importance weights for fit criteria (1 = normal, 0 = ignore). */
  getFitWeights(): FitWeights {
    return { ...DEFAULT_FIT_WEIGHTS, ...(this.store.getSetting('fit_weights', FitWeights) ?? {}) };
  }

  setFitWeights(input: unknown): FitWeights {
    const w = FitWeights.parse({ ...this.getFitWeights(), ...(input as object) });
    if (Object.values(w).every((v) => v === 0)) throw new AppError(400, 'invalid_weights', 'At least one criterion must count.');
    this.store.putSetting('fit_weights', w, this.now().toISOString());
    return w;
  }

  /** Recomputed on demand from the saved job and the current profile (deterministic). */
  assessApplication(id: string): Assessment {
    const app = this.getApplication(id);
    return assess({
      applicationId: app.id,
      job: app.job,
      profile: this.getProfile(),
      goalRoles: this.getOnboarding().goals.targetRoles,
      now: this.now(),
      weights: this.getFitWeights(),
    });
  }

  assessmentSummaries(): AssessmentSummary[] {
    const profile = this.getProfile();
    const goalRoles = this.getOnboarding().goals.targetRoles;
    const now = this.now();
    const weights = this.getFitWeights();
    return this.listApplications().map((app) => {
      const a = assess({ applicationId: app.id, job: app.job, profile, goalRoles, now, weights });
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
    return summarize(this.listApplications(), this.now(), 10, this.store.listReminders());
  }

  /** A consistent snapshot of the whole database (everything, including drafts and resume originals). */
  backup(): { data: Buffer; filename: string } {
    if (this.store.path === ':memory:') throw new AppError(409, 'backup_unavailable', 'This workspace is not stored on disk.');
    const file = join(dirname(this.store.path), `.backup-${this.newId()}.sqlite`);
    try {
      this.store.backupTo(file);
      return { data: readFileSync(file), filename: `reboundops-backup-${this.now().toISOString().slice(0, 10)}.sqlite` };
    } finally {
      rmSync(file, { force: true });
    }
  }

  /** A password-protected backup (scrypt + AES-256-GCM). The password is used once and not kept. */
  backupEncrypted(input: unknown): { data: Buffer; filename: string } {
    const { password } = z.object({ password: z.string().max(1024) }).parse(input);
    try {
      checkPasswordStrength(password);
    } catch (err) {
      throw new AppError(400, 'weak_password', (err as Error).message);
    }
    if (this.store.path === ':memory:') throw new AppError(409, 'backup_unavailable', 'This workspace is not stored on disk.');
    const dir = dirname(this.store.path);
    const plain = join(dir, `.backup-${this.newId()}.sqlite`);
    const enc = join(dir, `.backup-${this.newId()}.rbobak`);
    try {
      this.store.backupTo(plain);
      encryptBackupFile(plain, enc, password, { schemaVersion: this.store.schemaVersion, appVersion: API_VERSION, createdAt: this.now().toISOString() });
      return { data: readFileSync(enc), filename: `reboundops-backup-${this.now().toISOString().slice(0, 10)}.rbobak` };
    } finally {
      rmSync(plain, { force: true });
      rmSync(enc, { force: true });
    }
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
      contacts: this.store.listContacts(),
      reminders: this.store.listReminders(),
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

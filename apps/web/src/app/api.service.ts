import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, throwError, type Observable } from 'rxjs';
import type {
  DeletedItem,
  FollowUpTemplate,
  InterviewNote,
  DiscoveredPostingView,
  DiscoveryRequest,
  DiscoveryResult,
  JobSourceInfo,
  FitWeights,
  AiSettingsUpdate,
  AiSettingsView,
  ApplicationStatus,
  ApplicationView,
  Assessment,
  AssessmentSummary,
  Contact,
  ContactInput,
  DashboardSummary,
  FollowUpDraft,
  ImportPreview,
  ImportResult,
  FollowUpKind,
  Reminder,
  ReminderInput,
  ReminderUpdate,
  PackageUpdate,
  PackageView,
  DocumentKind,
  DocumentsBundle,
  ExportFormat,
  ResumeDraftUpdate,
  RewriteRequest,
  RewriteResult,
  ResumeImportRequest,
  ResumeImportResult,
  Health,
  JobCreate,
  JobCreateResult,
  JobExtraction,
  JobUpdate,
  Job,
  OnboardingState,
  OnboardingUpdate,
  Profile,
  ProfileUpdate,
} from '@reboundops/contracts';

/** A failed API call, normalised so pages can show a helpful message. */
export interface RestoreStage {
  stageId: string;
  size: number;
  encrypted: boolean;
  meta: { createdAt: string; schemaVersion: number; appVersion: string } | null;
  currentCounts: Record<string, number>;
}
export interface RestoreCheck {
  schemaVersion: number;
  counts: Record<string, number>;
  encrypted: boolean;
  compatible: boolean;
  currentCounts: Record<string, number>;
}
export interface RestoreOutcome {
  restored: boolean;
  counts: Record<string, number>;
  recoveryBackup: string;
  previousDatabase: string | null;
  instructions: string;
}

export class ApiProblem extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  private async call<T>(request: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        const body = err.error as { error?: { code?: string; message?: string; details?: unknown } } | null;
        if (body?.error?.message) {
          throw new ApiProblem(err.status, body.error.code ?? 'error', body.error.message, body.error.details);
        }
        if (err.status === 0) {
          throw new ApiProblem(0, 'offline', 'The local ReboundOps service is not reachable. Is it running?');
        }
        throw new ApiProblem(err.status, 'http_error', `Request failed (${err.status}).`);
      }
      throw err;
    }
  }

  health() {
    return this.call(this.http.get<Health>(`${this.base}/health`));
  }
  onboarding() {
    return this.call(this.http.get<OnboardingState>(`${this.base}/onboarding`));
  }
  updateOnboarding(update: OnboardingUpdate) {
    return this.call(this.http.put<OnboardingState>(`${this.base}/onboarding`, update));
  }
  profile() {
    return this.call(this.http.get<Profile>(`${this.base}/profile`));
  }
  saveProfile(profile: ProfileUpdate) {
    return this.call(this.http.put<Profile>(`${this.base}/profile`, profile));
  }
  extractJob(description: string, sourceUrl: string | null) {
    return this.call(this.http.post<JobExtraction>(`${this.base}/jobs/extract`, { description, sourceUrl }));
  }
  createJob(job: JobCreate) {
    return this.call(this.http.post<JobCreateResult>(`${this.base}/jobs`, job));
  }
  applications() {
    return this.call(this.http.get<ApplicationView[]>(`${this.base}/applications`));
  }
  application(id: string) {
    return this.call(this.http.get<ApplicationView>(`${this.base}/applications/${encodeURIComponent(id)}`));
  }
  transition(id: string, to: ApplicationStatus, confirmSubmitted = false, note = '') {
    return this.call(
      this.http.post<ApplicationView>(`${this.base}/applications/${encodeURIComponent(id)}/transitions`, {
        to,
        confirmSubmitted,
        note,
      }),
    );
  }
  addNote(id: string, note: string) {
    return this.call(
      this.http.post<ApplicationView>(`${this.base}/applications/${encodeURIComponent(id)}/notes`, { note }),
    );
  }
  assessment(id: string) {
    return this.call(this.http.get<Assessment>(`${this.base}/applications/${encodeURIComponent(id)}/assessment`));
  }
  assessments() {
    return this.call(this.http.get<AssessmentSummary[]>(`${this.base}/assessments`));
  }
  importResume(req: ResumeImportRequest) {
    return this.call(this.http.post<ResumeImportResult>(`${this.base}/resume/import`, req));
  }
  documents(id: string) {
    return this.call(this.http.get<DocumentsBundle>(`${this.docs(id)}`));
  }
  generateDocuments(id: string, overwrite = false) {
    return this.call(this.http.post<DocumentsBundle>(`${this.docs(id)}/generate`, { overwrite }));
  }
  updateResumeDraft(id: string, update: ResumeDraftUpdate) {
    return this.call(this.http.put<DocumentsBundle>(`${this.docs(id)}/resume`, update));
  }
  updateCoverLetter(id: string, text: string) {
    return this.call(this.http.put<DocumentsBundle>(`${this.docs(id)}/cover_letter`, { text }));
  }
  /** Downloads an export; a failed content check surfaces as an ApiProblem with the reasons. */
  async exportDocument(id: string, kind: DocumentKind, format: ExportFormat): Promise<{ blob: Blob; filename: string }> {
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.docs(id)}/${kind}/export`, { params: { format }, responseType: 'blob', observe: 'response' }),
      );
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `document.${format}`;
      return { blob: res.body!, filename };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.error instanceof Blob) {
        try {
          const body = JSON.parse(await err.error.text()) as { error?: { code?: string; message?: string; details?: unknown } };
          throw new ApiProblem(err.status, body.error?.code ?? 'error', body.error?.message ?? 'Export failed.', body.error?.details);
        } catch (inner) {
          if (inner instanceof ApiProblem) throw inner;
        }
      }
      throw new ApiProblem(err instanceof HttpErrorResponse ? err.status : 0, 'export_failed', 'Export failed.');
    }
  }
  package(id: string) {
    return this.call(this.http.get<PackageView>(`${this.pkg(id)}`));
  }
  updatePackage(id: string, update: PackageUpdate) {
    return this.call(this.http.put<PackageView>(`${this.pkg(id)}`, update));
  }
  addQuestions(id: string, questions: string[]) {
    return this.call(this.http.post<PackageView>(`${this.pkg(id)}/questions`, { questions }));
  }
  updateAnswer(id: string, answerId: string, answer: string, reviewed: boolean, saveToProfile = false) {
    return this.call(this.http.put<PackageView>(`${this.pkg(id)}/answers/${encodeURIComponent(answerId)}`, { answer, reviewed, saveToProfile }));
  }
  removeAnswer(id: string, answerId: string) {
    return this.call(this.http.delete<PackageView>(`${this.pkg(id)}/answers/${encodeURIComponent(answerId)}`));
  }
  contacts(id: string) {
    return this.call(this.http.get<Contact[]>(`${this.app(id)}/contacts`));
  }
  saveContact(id: string, contact: ContactInput, contactId?: string) {
    return contactId
      ? this.call(this.http.put<Contact>(`${this.app(id)}/contacts/${encodeURIComponent(contactId)}`, contact))
      : this.call(this.http.post<Contact>(`${this.app(id)}/contacts`, contact));
  }
  deleteContact(id: string, contactId: string) {
    return this.call(this.http.delete<DeletedItem>(`${this.app(id)}/contacts/${encodeURIComponent(contactId)}`));
  }
  restoreContact(id: string, contactId: string) {
    return this.call(this.http.post<Contact>(`${this.app(id)}/contacts/${encodeURIComponent(contactId)}/restore`, {}));
  }
  reminders(id: string) {
    return this.call(this.http.get<Reminder[]>(`${this.app(id)}/reminders`));
  }
  addReminder(id: string, r: ReminderInput) {
    return this.call(this.http.post<Reminder>(`${this.app(id)}/reminders`, r));
  }
  updateReminder(id: string, reminderId: string, u: ReminderUpdate) {
    return this.call(this.http.put<Reminder>(`${this.app(id)}/reminders/${encodeURIComponent(reminderId)}`, u));
  }
  deleteReminder(id: string, reminderId: string) {
    return this.call(this.http.delete<DeletedItem>(`${this.app(id)}/reminders/${encodeURIComponent(reminderId)}`));
  }
  restoreReminder(id: string, reminderId: string) {
    return this.call(this.http.post<Reminder>(`${this.app(id)}/reminders/${encodeURIComponent(reminderId)}/restore`, {}));
  }
  jobSources() {
    return this.call(this.http.get<{ sources: JobSourceInfo[]; consent: boolean }>(`${this.base}/discovery/sources`));
  }
  setDiscoveryConsent(granted: boolean) {
    return this.call(this.http.put<{ consent: boolean }>(`${this.base}/discovery/consent`, { granted }));
  }
  discover(req: DiscoveryRequest) {
    return this.call(this.http.post<DiscoveryResult>(`${this.base}/discovery/search`, req));
  }
  recentDiscovered(params: Record<string, string> = {}) {
    return this.call(this.http.get<DiscoveredPostingView[]>(`${this.base}/discovery/recent`, { params }));
  }
  saveDiscovered(id: string, body: { employer?: string; allowDuplicate?: boolean } = {}) {
    return this.call(this.http.post<JobCreateResult>(`${this.base}/discovery/${encodeURIComponent(id)}/save`, body));
  }
  checkPosting(jobId: string) {
    return this.call(this.http.post<Job>(`${this.base}/jobs/${encodeURIComponent(jobId)}/check-posting`, {}));
  }
  /** Password-protected backup as a file (the password is sent once in the body and not kept). */
  async encryptedBackup(password: string): Promise<{ blob: Blob; filename: string }> {
    try {
      const res = await firstValueFrom(this.http.post(`${this.base}/backup/encrypted`, { password }, { responseType: 'blob', observe: 'response' }));
      const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? 'reboundops-backup.rbobak';
      return { blob: res.body!, filename: name };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.error instanceof Blob) {
        try {
          const body = JSON.parse(await err.error.text()) as { error?: { code?: string; message?: string } };
          if (body.error?.message) throw new ApiProblem(err.status, body.error.code ?? 'error', body.error.message);
        } catch (inner) {
          if (inner instanceof ApiProblem) throw inner;
        }
      }
      return this.call(throwError(() => err));
    }
  }
  stageRestore(file: ArrayBuffer) {
    return this.call(this.http.post<RestoreStage>(`${this.base}/restore/stage`, file, { headers: { 'content-type': 'application/octet-stream' } }));
  }
  verifyRestore(stageId: string, password?: string) {
    return this.call(this.http.post<RestoreCheck>(`${this.base}/restore/${encodeURIComponent(stageId)}/verify`, password ? { password } : {}));
  }
  applyRestore(stageId: string, password: string | undefined, confirm: string) {
    return this.call(this.http.post<RestoreOutcome>(`${this.base}/restore/${encodeURIComponent(stageId)}/apply`, { ...(password ? { password } : {}), confirm }));
  }
  cancelRestore(stageId: string) {
    return this.call(this.http.delete<void>(`${this.base}/restore/${encodeURIComponent(stageId)}`));
  }
  interviews(id: string) {
    return this.call(this.http.get<InterviewNote[]>(`${this.app(id)}/interviews`));
  }
  saveInterview(id: string, body: Partial<InterviewNote>, interviewId?: string) {
    return interviewId
      ? this.call(this.http.put<InterviewNote>(`${this.app(id)}/interviews/${encodeURIComponent(interviewId)}`, body))
      : this.call(this.http.post<InterviewNote>(`${this.app(id)}/interviews`, body));
  }
  deleteInterview(id: string, interviewId: string) {
    return this.call(this.http.delete<void>(`${this.app(id)}/interviews/${encodeURIComponent(interviewId)}`));
  }
  interviewPrep(id: string) {
    return this.call(this.http.get<{ prompts: string[] }>(`${this.app(id)}/interview-prep`));
  }
  followUpTemplates() {
    return this.call(this.http.get<FollowUpTemplate[]>(`${this.base}/follow-up/templates`));
  }
  saveFollowUpTemplates(list: Omit<FollowUpTemplate, 'id'>[] | FollowUpTemplate[]) {
    return this.call(this.http.put<FollowUpTemplate[]>(`${this.base}/follow-up/templates`, list));
  }
  followUpWithTemplate(id: string, templateId: string, contactId?: string) {
    const params: Record<string, string> = { templateId };
    if (contactId) params['contactId'] = contactId;
    return this.call(this.http.get<FollowUpDraft>(`${this.app(id)}/follow-up`, { params }));
  }
  fitWeights() {
    return this.call(this.http.get<FitWeights>(`${this.base}/assessment/weights`));
  }
  saveFitWeights(w: Partial<FitWeights>) {
    return this.call(this.http.put<FitWeights>(`${this.base}/assessment/weights`, w));
  }
  followUp(id: string, kind: FollowUpKind, contactId?: string) {
    const params: Record<string, string> = { kind };
    if (contactId) params['contactId'] = contactId;
    return this.call(this.http.get<FollowUpDraft>(`${this.app(id)}/follow-up`, { params }));
  }
  private app(id: string) {
    return `${this.base}/applications/${encodeURIComponent(id)}`;
  }
  private pkg(id: string) {
    return `${this.base}/applications/${encodeURIComponent(id)}/package`;
  }
  private docs(id: string) {
    return `${this.base}/applications/${encodeURIComponent(id)}/documents`;
  }
  aiSettings() {
    return this.call(this.http.get<AiSettingsView>(`${this.base}/settings/ai`));
  }
  updateAiSettings(u: AiSettingsUpdate) {
    return this.call(this.http.put<AiSettingsView>(`${this.base}/settings/ai`, u));
  }
  testAi() {
    return this.call(this.http.post<{ ok: boolean; detail: string }>(`${this.base}/settings/ai/test`, {}));
  }
  rewrite(req: RewriteRequest) {
    return this.call(this.http.post<RewriteResult>(`${this.base}/ai/rewrite`, req));
  }
  updateJob(jobId: string, u: JobUpdate) {
    return this.call(this.http.put<Job>(`${this.base}/jobs/${encodeURIComponent(jobId)}`, u));
  }
  deleteApplication(id: string) {
    return this.call(this.http.delete<void>(`${this.base}/applications/${encodeURIComponent(id)}`));
  }
  previewImport(filename: string, content: string) {
    return this.call(this.http.post<ImportPreview>(`${this.base}/import/preview`, { filename, content }));
  }
  commitImport(token: string) {
    return this.call(this.http.post<ImportResult>(`${this.base}/import/commit`, { token, confirm: true }));
  }
  dashboard() {
    return this.call(this.http.get<DashboardSummary>(`${this.base}/dashboard`));
  }
}

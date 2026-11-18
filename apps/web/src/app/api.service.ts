import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, type Observable } from 'rxjs';
import type {
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
    return this.call(this.http.delete<void>(`${this.app(id)}/contacts/${encodeURIComponent(contactId)}`));
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
    return this.call(this.http.delete<void>(`${this.app(id)}/reminders/${encodeURIComponent(reminderId)}`));
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
  dashboard() {
    return this.call(this.http.get<DashboardSummary>(`${this.base}/dashboard`));
  }
}

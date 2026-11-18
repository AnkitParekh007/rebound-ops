import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, type Observable } from 'rxjs';
import type {
  ApplicationStatus,
  ApplicationView,
  DashboardSummary,
  Health,
  JobCreate,
  JobCreateResult,
  JobExtraction,
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
  dashboard() {
    return this.call(this.http.get<DashboardSummary>(`${this.base}/dashboard`));
  }
}

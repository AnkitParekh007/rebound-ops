import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Intake, Session } from '@reboundops/contracts';
import type {
  AiAnalyzeResult, AiPreview, AiStatus, CorrectionSource, EvidenceStatus, HealthResponse,
  PersistenceMode, PersistenceStatus, RequirementStatus, RouteId, SavedSessionSummary, SourceKind
} from './api-types';

/**
 * Typed, stateless gateway to the localhost API: one method per endpoint.
 * Holds no session state. Optimistic concurrency is explicit: every mutation
 * takes the `expectedRevision` the caller last saw.
 */
@Injectable({ providedIn: 'root' })
export class SessionApiService {
  private readonly http = inject(HttpClient);
  private static readonly base = '/api/sessions/';

  private path(id: string, ...segments: string[]): string {
    return SessionApiService.base + [id, ...segments].join('/');
  }

  // ---- status ----
  health(): Promise<HealthResponse> {
    return firstValueFrom(this.http.get<HealthResponse>('/api/health'));
  }
  persistenceStatus(): Promise<PersistenceStatus> {
    return firstValueFrom(this.http.get<PersistenceStatus>('/api/persistence/status'));
  }
  savedSessions(): Promise<SavedSessionSummary[]> {
    return firstValueFrom(this.http.get<SavedSessionSummary[]>('/api/sessions/saved'));
  }
  testAiConnection(): Promise<{ connected: boolean; checkedAt: string }> {
    return firstValueFrom(this.http.post<{ connected: boolean; checkedAt: string }>('/api/ai/test-connection', { consent: true }));
  }
  aiStatus(): Promise<AiStatus> {
    return firstValueFrom(this.http.get<AiStatus>('/api/ai/status'));
  }

  // ---- session lifecycle ----
  create(intake: Intake): Promise<Session> {
    return firstValueFrom(this.http.post<Session>('/api/sessions', { intake }));
  }
  get(id: string): Promise<Session> {
    return firstValueFrom(this.http.get<Session>(this.path(id)));
  }
  restore(snapshot: unknown): Promise<Session> {
    return firstValueFrom(this.http.post<Session>('/api/sessions/restore', { session: snapshot }));
  }
  delete(id: string, expectedRevision: number): Promise<void> {
    return firstValueFrom(this.http.request<void>('DELETE', this.path(id), { body: { expectedRevision } }));
  }
  setPersistence(id: string, expectedRevision: number, mode: PersistenceMode): Promise<Session> {
    return firstValueFrom(this.http.put<Session>(this.path(id, 'persistence'), { expectedRevision, mode }));
  }
  exportMarkdown(id: string): Promise<string> {
    return firstValueFrom(this.http.get(this.path(id, 'export'), { responseType: 'text' }));
  }

  // ---- intake & evidence ----
  replaceIntake(id: string, expectedRevision: number, intake: Intake): Promise<Session> {
    return firstValueFrom(this.http.put<Session>(this.path(id, 'intake'), { expectedRevision, intake }));
  }
  decideEvidence(id: string, expectedRevision: number, evidenceId: string, status: EvidenceStatus): Promise<Session> {
    return firstValueFrom(this.http.put<Session>(this.path(id, 'evidence', evidenceId), { expectedRevision, status }));
  }
  correctEvidence(
    id: string, expectedRevision: number, evidenceId: string,
    correction: { claim: string; reason: string; source: CorrectionSource }
  ): Promise<Session> {
    return firstValueFrom(this.http.put<Session>(
      this.path(id, 'evidence', evidenceId, 'correction'), { expectedRevision, ...correction }));
  }
  addSourceDocument(
    id: string, expectedRevision: number, document: { kind: SourceKind; label: string; body: string }
  ): Promise<Session> {
    return firstValueFrom(this.http.post<Session>(this.path(id, 'documents'), { expectedRevision, ...document }));
  }
  removeSourceDocument(id: string, expectedRevision: number, documentId: string): Promise<Session> {
    return firstValueFrom(this.http.request<Session>('DELETE', this.path(id, 'documents', documentId),
      { body: { expectedRevision } }));
  }

  // ---- job targets ----
  addJobTarget(
    id: string, expectedRevision: number, target: { title: string; sourceUrl: string; requirements: string[] }
  ): Promise<Session> {
    return firstValueFrom(this.http.post<Session>(this.path(id, 'targets'), { expectedRevision, ...target }));
  }
  removeJobTarget(id: string, expectedRevision: number, targetId: string): Promise<Session> {
    return firstValueFrom(this.http.request<Session>('DELETE', this.path(id, 'targets', targetId),
      { body: { expectedRevision } }));
  }
  reviewRequirement(
    id: string, expectedRevision: number, targetId: string, requirementId: string,
    status: RequirementStatus, evidenceIds: string[]
  ): Promise<Session> {
    return firstValueFrom(this.http.put<Session>(
      this.path(id, 'targets', targetId, 'requirements', requirementId),
      { expectedRevision, status, evidenceIds }));
  }

  // ---- route, plan & review ----
  selectRoute(id: string, expectedRevision: number, routeId: RouteId): Promise<Session> {
    return firstValueFrom(this.http.put<Session>(this.path(id, 'route'), { expectedRevision, routeId }));
  }
  setActionCompleted(id: string, expectedRevision: number, actionId: string, completed: boolean): Promise<Session> {
    return firstValueFrom(this.http.put<Session>(this.path(id, 'actions', actionId), { expectedRevision, completed }));
  }
  recordReview(id: string, expectedRevision: number, notes: string): Promise<Session> {
    return firstValueFrom(this.http.put<Session>(this.path(id, 'review'), { expectedRevision, notes }));
  }

  // ---- optional AI (preview is local; analyze requires explicit consent) ----
  previewAi(id: string, targetId: string): Promise<AiPreview> {
    return firstValueFrom(this.http.post<AiPreview>(this.path(id, 'ai', 'preview'), { targetId }));
  }
  analyzeAi(id: string, preview: AiPreview): Promise<AiAnalyzeResult> {
    return firstValueFrom(this.http.post<AiAnalyzeResult>(this.path(id, 'ai', 'analyze'), {
      targetId: preview.payload.target.id, previewHash: preview.previewHash,
      expectedRevision: preview.sessionRevision, consent: true
    }));
  }
}

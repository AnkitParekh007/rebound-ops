import { Component, ChangeDetectionStrategy, inject, signal, type OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import type { Intake, Session, RouteId, Evidence, AiPayload, AiAnalysis } from '@reboundops/contracts';
import { blankPilotFeedback, exportPilotFeedback, hasPilotAnswer, type PilotFeedback } from './pilot-feedback.js';

type Draft = Omit<Intake, 'evidence'>;

const sample: Draft = {
  role: 'Senior Frontend Engineer',
  location: 'India / remote',
  weeklyHours: 6,
  urgency: 'quarter',
  priorities: 'Prefer hands-on product work. Avoid a long retraining period.',
  shiftTarget: 'AI application engineer',
  bridgeTarget: 'Frontend architecture consulting'
};
const sampleEvidence = [
  'Led a component library migration (fictional résumé item 1)',
  'Improved CI build performance (fictional résumé item 2)',
  'Mentored engineers on frontend testing (fictional résumé item 3)'
].join('\n');

@Component({
  selector: 'rb-root',
  standalone: true,
  imports: [FormsModule, JsonPipe],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly session = signal<Session | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly apiAvailable = signal(false);
  readonly persistenceStatus = signal<{
    available: boolean; savedCount: number; warnings: string[];
  } | null>(null);
  readonly savedSessions = signal<Array<{
    id: string; role: string; updatedAt: string; revision: number;
  }>>([]);
  readonly aiStatus = signal<{
    enabled: boolean; provider: string | null; model: string | null;
    attempts: number; maxAttempts: number; successful: number; failed: number;
    reportedInputTokens: number; reportedOutputTokens: number;
  } | null>(null);
  readonly aiPreview = signal<{
    enabled: boolean; provider: string; model: string | null; sessionRevision: number;
    payload: AiPayload; previewHash: string;
  } | null>(null);
  readonly aiAnalysis = signal<AiAnalysis | null>(null);

  draft: Draft = { ...sample };
  evidenceText = sampleEvidence;
  notesDraft = '';
  targetTitle = '';
  targetUrl = '';
  targetRequirements = '';
  evidenceSelection: Record<string, string> = {};
  sourceTitle = '';
  sourceKind: 'resume' | 'project_note' = 'resume';
  sourceBody = '';
  editingEvidenceId = '';
  editClaim = '';
  editReason = '';
  citationDocumentId = '';
  citationExcerpt = '';
  pilotFeedback: PilotFeedback = blankPilotFeedback();

  async ngOnInit(): Promise<void> {
    try {
      const status = await firstValueFrom(this.http.get<{ status: string }>('/api/health'));
      this.apiAvailable.set(status.status === 'ok');
      await this.refreshSavedSessions();
      await this.refreshAiStatus();
    } catch {
      this.error.set('Local API is not running. Start it using npm run dev:api in a separate terminal.');
    }
  }

  async refreshSavedSessions(): Promise<void> {
    try {
      const [status, saved] = await Promise.all([
        firstValueFrom(this.http.get<{ available: boolean; savedCount: number; warnings: string[] }>('/api/persistence/status')),
        firstValueFrom(this.http.get<Array<{ id: string; role: string; updatedAt: string; revision: number }>>('/api/sessions/saved'))
      ]);
      this.persistenceStatus.set(status);
      this.savedSessions.set(saved);
    } catch {
      this.persistenceStatus.set(null);
      this.savedSessions.set([]);
    }
  }

  async resumeSaved(id: string): Promise<void> {
    await this.execute(async () => {
      const restored = await firstValueFrom(this.http.get<Session>('/api/sessions/' + id));
      const { evidence, ...draft } = restored.intake;
      this.draft = { ...draft };
      this.evidenceText = evidence.map(item => item.claim).join('\n');
      this.notesDraft = restored.reviewNotes;
      this.evidenceSelection = {};
      return restored;
    }, 'Saved session reopened from this computer. It has not been sent to the cloud.');
  }

  async changePersistence(mode: 'memory' | 'disk'): Promise<void> {
    const current = this.session();
    if (!current) return;
    await this.execute(() => firstValueFrom(this.http.put<Session>(
      '/api/sessions/' + current.id + '/persistence',
      { expectedRevision: current.revision, mode }
    )), mode === 'disk'
      ? 'Session now saves to your configured local folder after each change.'
      : 'Disk saving is off. The local saved file was removed.');
    await this.refreshSavedSessions();
  }

  demo(): void {
    this.session.set(null);
    this.aiPreview.set(null);
    this.aiAnalysis.set(null);
    this.draft = { ...sample };
    this.evidenceText = sampleEvidence;
    this.notesDraft = '';
    this.editingEvidenceId = '';
    this.pilotFeedback = blankPilotFeedback();
    this.notice.set('Fictional example loaded. Claims are unverified and editable.');
    this.error.set('');
  }

  clear(): void {
    this.session.set(null);
    this.aiPreview.set(null);
    this.aiAnalysis.set(null);
    this.draft = {
      role: '', location: '', weeklyHours: 6, urgency: 'quarter',
      priorities: '', shiftTarget: '', bridgeTarget: ''
    };
    this.evidenceText = '';
    this.notesDraft = '';
    this.editingEvidenceId = '';
    this.pilotFeedback = blankPilotFeedback();
    this.notice.set('Draft cleared from the screen. Server sessions are temporary until the API restarts.');
    this.error.set('');
  }

  private collectIntake(): Intake {
    const lines = this.evidenceText.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    if (lines.length > 15) throw new Error('Use at most 15 evidence lines.');
    return {
      ...this.draft,
      role: this.draft.role.trim(),
      location: this.draft.location.trim(),
      priorities: this.draft.priorities.trim(),
      shiftTarget: this.draft.shiftTarget.trim(),
      bridgeTarget: this.draft.bridgeTarget.trim(),
      evidence: lines.map((claim, i) => ({
        id: crypto.randomUUID(),
        claim,
        status: 'unverified',
        source: { kind: 'manual', label: 'User-entered line ' + (i + 1) }
      }))
    };
  }

  private async execute(action: () => Promise<Session>, success: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const current = await action();
      if (this.session()?.id !== current.id) this.pilotFeedback = blankPilotFeedback();
      this.session.set(current);
      this.aiPreview.set(null);
      this.aiAnalysis.set(null);
      this.notice.set(success);
    } catch (failure) {
      if (failure instanceof HttpErrorResponse && failure.status === 409 && failure.error?.session) {
        this.session.set(failure.error.session as Session);
        this.error.set('The session changed before this action. Latest version loaded; please retry.');
      } else if (failure instanceof HttpErrorResponse) {
        if (failure.error?.error === 'INVALID_REQUEST') {
          this.error.set('Please review the form values and source claims.');
        } else if (failure.error?.error === 'BACKUP_FROM_NEWER_VERSION') {
          this.error.set('This backup was created by a newer ReboundOps version. Upgrade ReboundOps to open it; the file was not changed.');
        } else if (failure.error?.error === 'INVALID_BACKUP') {
          this.error.set('This file is not a valid ReboundOps backup, or it failed integrity checks. The file was not changed.');
        } else if (failure.error?.error === 'INVALID_TRANSITION') {
          this.error.set(failure.error?.message || 'This change could not be saved. Review the evidence and try again.');
        } else {
          this.error.set(failure.error?.error || 'The local API request failed.');
        }
      } else {
        this.error.set(failure instanceof Error ? failure.message : 'An unexpected error occurred.');
      }
    } finally {
      this.busy.set(false);
    }
  }

  async submit(): Promise<void> {
    await this.execute(async () => {
      const intake = this.collectIntake();
      const current = this.session();
      if (current) {
        return await firstValueFrom(this.http.put<Session>('/api/sessions/' + current.id + '/intake', {
          expectedRevision: current.revision, intake
        }));
      }
      return await firstValueFrom(this.http.post<Session>('/api/sessions', { intake }));
    }, 'Career intake recorded locally. Review your evidence and choose a route.');
  }

  async evidenceDecision(id: string, status: Evidence['status']): Promise<void> {
    const current = this.session();
    if (!current) return;
    await this.execute(
      () => firstValueFrom(this.http.put<Session>('/api/sessions/' + current.id + '/evidence/' + id, {
        expectedRevision: current.revision, status
      })),
      'Evidence status changed. Confirmation is your decision; no external verification occurred.'
    );
  }

  startEvidenceEdit(item: Evidence): void {
    this.editingEvidenceId = item.id;
    this.editClaim = item.claim;
    this.editReason = '';
    this.citationDocumentId = item.source.span?.documentId ?? '';
    this.citationExcerpt = item.source.excerpt ?? '';
    this.error.set('');
  }

  cancelEvidenceEdit(): void {
    this.editingEvidenceId = '';
    this.editReason = '';
    this.citationExcerpt = '';
  }

  async addSource(): Promise<void> {
    const current = this.session();
    if (!current) return;
    await this.execute(() => firstValueFrom(this.http.post<Session>(
      '/api/sessions/' + current.id + '/documents', {
        expectedRevision: current.revision,
        kind: this.sourceKind, label: this.sourceTitle.trim(), body: this.sourceBody
      }
    )), 'Source text saved in local API memory, not uploaded to any provider.');
    if (!this.error()) {
      this.sourceTitle = '';
      this.sourceBody = '';
    }
  }

  async removeSource(id: string): Promise<void> {
    const current = this.session();
    if (!current) return;
    await this.execute(() => firstValueFrom(this.http.request<Session>(
      'DELETE', '/api/sessions/' + current.id + '/documents/' + id, {
        body: { expectedRevision: current.revision }
      }
    )), 'Source document removed from this local session.');
  }

  async saveEvidenceCorrection(): Promise<void> {
    const current = this.session();
    if (!current || !this.editingEvidenceId) return;
    const source = this.citationDocumentId
      ? { mode: 'document' as const, documentId: this.citationDocumentId, excerpt: this.citationExcerpt }
      : { mode: 'manual' as const, label: 'Participant-edited manual evidence' };
    await this.execute(() => firstValueFrom(this.http.put<Session>(
      '/api/sessions/' + current.id + '/evidence/' + this.editingEvidenceId + '/correction', {
        expectedRevision: current.revision, claim: this.editClaim.trim(),
        reason: this.editReason.trim(), source
      }
    )), 'Correction saved. This achievement is unverified until you confirm it again.');
    if (!this.error()) this.cancelEvidenceEdit();
  }

  async chooseRoute(routeId: RouteId): Promise<void> {
    const current = this.session();
    if (!current) return;
    await this.execute(
      () => firstValueFrom(this.http.put<Session>('/api/sessions/' + current.id + '/route', {
        expectedRevision: current.revision, routeId
      })),
      'Direction selected. The plan is a set of experiments, not a prediction.'
    );
  }

  async toggleAction(actionId: string, completed: boolean): Promise<void> {
    const current = this.session();
    if (!current) return;
    await this.execute(
      () => firstValueFrom(this.http.put<Session>('/api/sessions/' + current.id + '/actions/' + actionId, {
        expectedRevision: current.revision, completed
      })),
      'Progress updated.'
    );
  }

  async saveReview(): Promise<void> {
    const current = this.session();
    if (!current) return;
    await this.execute(
      () => firstValueFrom(this.http.put<Session>('/api/sessions/' + current.id + '/review', {
        expectedRevision: current.revision, notes: this.notesDraft
      })),
      'Review recorded in the current API session.'
    );
  }

  async download(): Promise<void> {
    const current = this.session();
    if (!current?.plan) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const markdown = await firstValueFrom(
        this.http.get('/api/sessions/' + current.id + '/export', { responseType: 'text' })
      );
      const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'reboundops-seven-day-plan.md';
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      this.notice.set('Markdown plan exported to your device.');
    } catch {
      this.error.set('Unable to export the selected plan.');
    } finally {
      this.busy.set(false);
    }
  }

  async refreshAiStatus(): Promise<void> {
    const result = await firstValueFrom(this.http.get<{
      enabled: boolean; provider: string | null; model: string | null;
      attempts: number; maxAttempts: number; successful: number; failed: number;
      reportedInputTokens: number; reportedOutputTokens: number;
    }>('/api/ai/status'));
    this.aiStatus.set(result);
  }

  async previewAI(targetId: string): Promise<void> {
    const current = this.session();
    if (!current || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.aiPreview.set(null);
    this.aiAnalysis.set(null);
    try {
      const preview = await firstValueFrom(this.http.post<{
        enabled: boolean; provider: string; model: string | null; sessionRevision: number;
        payload: AiPayload; previewHash: string;
      }>('/api/sessions/' + current.id + '/ai/preview', { targetId }));
      this.aiPreview.set(preview);
      this.notice.set('Review the exact JSON below. No provider call has occurred.');
    } catch {
      this.error.set('Unable to prepare the local AI data preview.');
    } finally {
      this.busy.set(false);
    }
  }

  async analyzeAI(): Promise<void> {
    const current = this.session();
    const preview = this.aiPreview();
    if (!current || !preview || !preview.enabled || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const result = await firstValueFrom(this.http.post<{
        analysis: AiAnalysis; autoApplied: boolean; provider: string; model: string;
        usage: { inputTokens: number; outputTokens: number } | null;
      }>('/api/sessions/' + current.id + '/ai/analyze', {
        targetId: preview.payload.target.id, previewHash: preview.previewHash,
        expectedRevision: preview.sessionRevision, consent: true
      }));
      this.aiAnalysis.set(result.analysis);
      this.notice.set('AI suggestions returned. Nothing was applied to your evidence or plan.' +
        (result.usage ? ' Provider reported ' + result.usage.inputTokens + ' input and ' + result.usage.outputTokens + ' output tokens.' : ' Token usage was not reported.'));
      await this.refreshAiStatus();
    } catch (failure) {
      if (failure instanceof HttpErrorResponse && failure.status === 409) {
        this.aiPreview.set(null);
        this.aiAnalysis.set(null);
        this.error.set('The source data changed. Prepare a new preview before any provider call.');
      } else {
        this.error.set('AI suggestions are unavailable. No changes were made to your session.');
      }
    } finally {
      this.busy.set(false);
      try { await this.refreshAiStatus(); } catch { /* status is advisory */ }
    }
  }

  async addTarget(): Promise<void> {
    const current = this.session();
    if (!current) return;
    const requirements = this.targetRequirements.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!requirements.length || requirements.length > 12) {
      this.error.set('Enter between 1 and 12 job requirements, one per line.');
      return;
    }
    await this.execute(
      () => firstValueFrom(this.http.post<Session>('/api/sessions/' + current.id + '/targets', {
        expectedRevision: current.revision, title: this.targetTitle.trim(),
        sourceUrl: this.targetUrl.trim(), requirements
      })),
      'Job requirements added for manual review. Nothing was fetched from the URL.'
    );
    if (!this.error()) {
      this.targetTitle = '';
      this.targetUrl = '';
      this.targetRequirements = '';
    }
  }

  async reviewRequirement(
    targetId: string, requirementId: string, status: 'unreviewed' | 'supported' | 'gap'
  ): Promise<void> {
    const current = this.session();
    if (!current) return;
    const selected = this.evidenceSelection[requirementId] ||
      current.jobTargets.find(t => t.id === targetId)?.requirements.find(r => r.id === requirementId)?.evidenceIds[0] || '';
    if (status === 'supported' && !selected) {
      this.error.set('Select a participant-confirmed achievement before marking this requirement as supported.');
      return;
    }
    await this.execute(
      () => firstValueFrom(this.http.put<Session>(
        '/api/sessions/' + current.id + '/targets/' + targetId + '/requirements/' + requirementId,
        { expectedRevision: current.revision, status, evidenceIds: status === 'supported' ? [selected] : [] }
      )),
      'Requirement reviewed. A confirmed claim is not independent proof of job readiness.'
    );
  }

  async removeTarget(id: string): Promise<void> {
    const current = this.session();
    if (!current) return;
    await this.execute(
      () => firstValueFrom(this.http.request<Session>('DELETE',
        '/api/sessions/' + current.id + '/targets/' + id,
        { body: { expectedRevision: current.revision } })),
      'Job target removed.'
    );
  }

  private downloadText(contents: string, name: string, type: string): void {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  canExportPilotFeedback(): boolean {
    return this.pilotFeedback.consent && hasPilotAnswer(this.pilotFeedback);
  }

  downloadPilotFeedback(): void {
    if (!this.canExportPilotFeedback()) return;
    try {
      const text = exportPilotFeedback(
        this.pilotFeedback, this.session()?.plan?.routeId, new Date().toISOString().slice(0, 10)
      );
      this.downloadText(text, 'reboundops-private-pilot-feedback.md', 'text/markdown;charset=utf-8');
      this.notice.set('Private feedback downloaded locally. Review and redact it before choosing to share.');
      this.error.set('');
    } catch {
      this.error.set('Unable to export pilot feedback. Check consent and at least one answer.');
    }
  }

  clearPilotFeedback(): void {
    this.pilotFeedback = blankPilotFeedback();
    this.notice.set('Unsaved pilot feedback cleared from this browser page.');
  }

  backup(): void {
    const current = this.session();
    if (!current) return;
    this.downloadText(JSON.stringify(current, null, 2),
      'reboundops-session.json', 'application/json;charset=utf-8');
    this.notice.set('An explicit local backup was downloaded. Keep it somewhere private.');
    this.error.set('');
  }

  async restoreFile(event: Event): Promise<void> {
    const field = event.target;
    if (!(field instanceof HTMLInputElement)) return;
    const file = field.files?.[0];
    if (!file) return;
    if (file.size > 128 * 1024) {
      this.error.set('Backup exceeds 128 KB. Only ReboundOps JSON snapshots are supported.');
      field.value = '';
      return;
    }
    await this.execute(async () => {
      const data: unknown = JSON.parse(await file.text());
      const session = await firstValueFrom(this.http.post<Session>('/api/sessions/restore', { session: data }));
      const { evidence, ...draft } = session.intake;
      this.draft = { ...draft };
      this.evidenceText = evidence.map(e => e.claim).join('\n');
      this.notesDraft = session.reviewNotes;
      this.evidenceSelection = {};
      return session;
    }, 'Backup restored as a fresh, memory-only session. No file was uploaded beyond localhost.');
    field.value = '';
  }

  async deleteSession(): Promise<void> {
    const current = this.session();
    if (!current || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.http.request<void>('DELETE', '/api/sessions/' + current.id, {
        body: { expectedRevision: current.revision }
      }));
      this.session.set(null);
      this.notesDraft = '';
      this.editingEvidenceId = '';
      this.pilotFeedback = blankPilotFeedback();
      this.evidenceSelection = {};
      this.notice.set('Session deleted from the local API and configured disk folder. Downloaded backups remain on your device.');
      await this.refreshSavedSessions();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409 && error.error?.session) {
        this.session.set(error.error.session as Session);
        this.error.set('Session changed before deletion. Please retry.');
      } else {
        this.error.set('Could not delete the local session.');
      }
    } finally {
      this.busy.set(false);
    }
  }

  completedCount(): number {
    return this.session()?.plan?.actions.filter(a => a.completed).length ?? 0;
  }
}

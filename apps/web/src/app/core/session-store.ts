import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type { AiAnalysis, Intake, Session } from '@reboundops/contracts';
import { SessionApiService } from './session-api.service';
import { describeFailure, staleSessionFrom } from './error-messages';
import { downloadText } from './download';
import type {
  AiPreview, AiStatus, CorrectionSource, EvidenceStatus, PersistenceMode, PersistenceStatus,
  RequirementStatus, RouteId, SavedSessionSummary, SourceKind
} from './api-types';

/**
 * Single source of truth for the active recovery session and request status.
 *
 * - Components read signals and call intent methods; they never call HTTP.
 * - Every mutation sends the last-seen revision. On HTTP 409 the server's
 *   latest session replaces local state and the user is asked to retry.
 * - Only one request runs at a time (`busy`), matching the API's
 *   single-writer, optimistic-revision model.
 * - AI preview/analysis are invalidated by any successful session change, so
 *   a consent decision always refers to the current data.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(SessionApiService);

  private readonly _session = signal<Session | null>(null);
  private readonly _busy = signal(false);
  private readonly _error = signal('');
  private readonly _notice = signal('');
  private readonly _apiAvailable = signal(false);
  private readonly _persistenceStatus = signal<PersistenceStatus | null>(null);
  private readonly _savedSessions = signal<SavedSessionSummary[]>([]);
  private readonly _aiStatus = signal<AiStatus | null>(null);
  private readonly _aiPreview = signal<AiPreview | null>(null);
  private readonly _aiAnalysis = signal<AiAnalysis | null>(null);

  readonly session = this._session.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly error = this._error.asReadonly();
  readonly notice = this._notice.asReadonly();
  readonly apiAvailable = this._apiAvailable.asReadonly();
  readonly persistenceStatus = this._persistenceStatus.asReadonly();
  readonly savedSessions = this._savedSessions.asReadonly();
  readonly aiStatus = this._aiStatus.asReadonly();
  readonly aiPreview = this._aiPreview.asReadonly();
  readonly aiAnalysis = this._aiAnalysis.asReadonly();

  /**
   * The active session as a 0/1-element list. Rendering features with
   * `@for (... ; track id)` recreates them when a different session becomes
   * active, so per-session UI state (drafts, selections, private pilot
   * answers) can never leak from one session into another.
   */
  readonly activeSession = computed(() => {
    const current = this._session();
    return current ? [current] : [];
  });

  readonly completedCount = computed(() =>
    this._session()?.plan?.actions.filter(a => a.completed).length ?? 0);

  // ---------------------------------------------------------------- status

  async init(): Promise<void> {
    try {
      const status = await this.api.health();
      this._apiAvailable.set(status.status === 'ok');
      await this.refreshSavedSessions();
      await this.refreshAiStatus();
    } catch {
      this._error.set('Local API is not running. Start it using npm run dev:api in a separate terminal.');
    }
  }

  async refreshSavedSessions(): Promise<void> {
    try {
      const [status, saved] = await Promise.all([this.api.persistenceStatus(), this.api.savedSessions()]);
      this._persistenceStatus.set(status);
      this._savedSessions.set(saved);
    } catch {
      this._persistenceStatus.set(null);
      this._savedSessions.set([]);
    }
  }

  async refreshAiStatus(): Promise<void> {
    this._aiStatus.set(await this.api.aiStatus());
  }

  setNotice(message: string): void {
    this._notice.set(message);
    this._error.set('');
  }

  setError(message: string): void {
    this._error.set(message);
  }

  /** Drops the active session from the screen (the API copy is untouched). */
  reset(notice: string): void {
    this._session.set(null);
    this._aiPreview.set(null);
    this._aiAnalysis.set(null);
    this._notice.set(notice);
    this._error.set('');
  }

  // ------------------------------------------------------- core execution

  /**
   * Runs one session-producing request. Returns the new session on success,
   * or null when it failed or another request was already running.
   */
  private async run(action: () => Promise<Session>, success: string): Promise<Session | null> {
    if (this._busy()) return null;
    this._busy.set(true);
    this._error.set('');
    this._notice.set('');
    try {
      const next = await action();
      this._session.set(next);
      this._aiPreview.set(null);
      this._aiAnalysis.set(null);
      this._notice.set(success);
      return next;
    } catch (failure) {
      const latest = staleSessionFrom<Session>(failure);
      if (latest) {
        this._session.set(latest);
        this._error.set('The session changed before this action. Latest version loaded; please retry.');
      } else {
        this._error.set(describeFailure(failure));
      }
      return null;
    } finally {
      this._busy.set(false);
    }
  }

  /** Runs a mutation against the active session with its current revision. */
  private mutate(action: (id: string, revision: number) => Promise<Session>, success: string): Promise<Session | null> {
    const current = this._session();
    if (!current) return Promise.resolve(null);
    return this.run(() => action(current.id, current.revision), success);
  }

  // ------------------------------------------------------ session lifecycle

  /** Creates a session, or replaces the intake of the active one. */
  submitIntake(build: () => Intake): Promise<Session | null> {
    return this.run(() => {
      const intake = build(); // may throw a user-facing validation Error
      const current = this._session();
      return current
        ? this.api.replaceIntake(current.id, current.revision, intake)
        : this.api.create(intake);
    }, 'Your answers are recorded in the app on this computer. Next, check the things you did, then choose an option to try.');
  }

  resumeSaved(id: string): Promise<Session | null> {
    return this.run(() => this.api.get(id),
      'Saved session reopened from this computer. It has not been sent to the cloud.');
  }

  restoreBackup(file: File): Promise<Session | null> {
    return this.run(async () => this.api.restore(JSON.parse(await file.text()) as unknown),
      'Backup restored as a fresh, memory-only session. No file was uploaded beyond localhost.');
  }

  async changePersistence(mode: PersistenceMode): Promise<void> {
    if (!this._session()) return;
    await this.mutate((id, rev) => this.api.setPersistence(id, rev, mode), mode === 'disk'
      ? 'Session now saves to your configured local folder after each change.'
      : 'Disk saving is off. The local saved file was removed.');
    await this.refreshSavedSessions();
  }

  async deleteSession(): Promise<boolean> {
    const current = this._session();
    if (!current || this._busy()) return false;
    this._busy.set(true);
    this._error.set('');
    try {
      await this.api.delete(current.id, current.revision);
      this._session.set(null);
      this._aiPreview.set(null);
      this._aiAnalysis.set(null);
      this._notice.set('Session deleted from the local API and configured disk folder. Downloaded backups remain on your device.');
      await this.refreshSavedSessions();
      return true;
    } catch (failure) {
      const latest = staleSessionFrom<Session>(failure);
      if (latest) {
        this._session.set(latest);
        this._error.set('Session changed before deletion. Please retry.');
      } else {
        this._error.set('Could not delete the local session.');
      }
      return false;
    } finally {
      this._busy.set(false);
    }
  }

  downloadBackup(): void {
    const current = this._session();
    if (!current) return;
    downloadText(JSON.stringify(current, null, 2), 'reboundops-session.json', 'application/json;charset=utf-8');
    this.setNotice('An explicit local backup was downloaded. Keep it somewhere private.');
  }

  async exportMarkdown(): Promise<void> {
    const current = this._session();
    if (!current?.plan) return;
    this._busy.set(true);
    this._error.set('');
    try {
      const markdown = await this.api.exportMarkdown(current.id);
      downloadText(markdown, 'reboundops-seven-day-plan.md', 'text/markdown;charset=utf-8');
      this._notice.set('Markdown plan exported to your device.');
    } catch {
      this._error.set('Unable to export the selected plan.');
    } finally {
      this._busy.set(false);
    }
  }

  // ------------------------------------------------------------- evidence

  decideEvidence(evidenceId: string, status: EvidenceStatus): Promise<Session | null> {
    return this.mutate((id, rev) => this.api.decideEvidence(id, rev, evidenceId, status),
      'Evidence status changed. Confirmation is your decision; no external verification occurred.');
  }

  correctEvidence(
    evidenceId: string, correction: { claim: string; reason: string; source: CorrectionSource }
  ): Promise<Session | null> {
    return this.mutate((id, rev) => this.api.correctEvidence(id, rev, evidenceId, correction),
      'Correction saved. This achievement is unverified until you confirm it again.');
  }

  addSourceDocument(document: { kind: SourceKind; label: string; body: string }): Promise<Session | null> {
    return this.mutate((id, rev) => this.api.addSourceDocument(id, rev, document),
      'Source text saved in local API memory, not uploaded to any provider.');
  }

  removeSourceDocument(documentId: string): Promise<Session | null> {
    return this.mutate((id, rev) => this.api.removeSourceDocument(id, rev, documentId),
      'Source document removed from this local session.');
  }

  // ----------------------------------------------------------- job targets

  addJobTarget(target: { title: string; sourceUrl: string; requirements: string[] }): Promise<Session | null> {
    return this.mutate((id, rev) => this.api.addJobTarget(id, rev, target),
      'Job requirements added for manual review. Nothing was fetched from the URL.');
  }

  removeJobTarget(targetId: string): Promise<Session | null> {
    return this.mutate((id, rev) => this.api.removeJobTarget(id, rev, targetId), 'Job target removed.');
  }

  reviewRequirement(
    targetId: string, requirementId: string, status: RequirementStatus, evidenceIds: string[]
  ): Promise<Session | null> {
    return this.mutate((id, rev) => this.api.reviewRequirement(id, rev, targetId, requirementId, status, evidenceIds),
      'Requirement reviewed. A confirmed claim is not independent proof of job readiness.');
  }

  // ------------------------------------------------------- route and plan

  chooseRoute(routeId: RouteId): Promise<Session | null> {
    return this.mutate((id, rev) => this.api.selectRoute(id, rev, routeId),
      'Option chosen. Your 7-day plan is a set of small things to try, not a prediction.');
  }

  setActionCompleted(actionId: string, completed: boolean): Promise<Session | null> {
    return this.mutate((id, rev) => this.api.setActionCompleted(id, rev, actionId, completed), 'Progress updated.');
  }

  saveReview(notes: string): Promise<Session | null> {
    return this.mutate((id, rev) => this.api.recordReview(id, rev, notes),
      'Review recorded in the current API session.');
  }

  // ----------------------------------------------------------- optional AI

  /** Local only: asks the API which exact JSON would be sent. No provider call. */
  async previewAi(targetId: string): Promise<void> {
    const current = this._session();
    if (!current || this._busy()) return;
    this._busy.set(true);
    this._error.set('');
    this._aiPreview.set(null);
    this._aiAnalysis.set(null);
    try {
      this._aiPreview.set(await this.api.previewAi(current.id, targetId));
      this._notice.set('Review the exact JSON below. No provider call has occurred.');
    } catch {
      this._error.set('Unable to prepare the local AI data preview.');
    } finally {
      this._busy.set(false);
    }
  }

  /** Sends exactly the previewed payload, only after the user's explicit consent click. */
  async analyzeAi(): Promise<void> {
    const current = this._session();
    const preview = this._aiPreview();
    if (!current || !preview || !preview.enabled || this._busy()) return;
    this._busy.set(true);
    this._error.set('');
    this._notice.set('');
    try {
      const result = await this.api.analyzeAi(current.id, preview);
      this._aiAnalysis.set(result.analysis);
      this._notice.set('AI suggestions returned. Nothing was applied to your evidence or plan.' +
        (result.usage
          ? ' Provider reported ' + result.usage.inputTokens + ' input and ' + result.usage.outputTokens + ' output tokens.'
          : ' Token usage was not reported.'));
    } catch (failure) {
      if (failure instanceof HttpErrorResponse && failure.status === 409) {
        this._aiPreview.set(null);
        this._aiAnalysis.set(null);
        this._error.set('The source data changed. Prepare a new preview before any provider call.');
      } else {
        this._error.set('AI suggestions are unavailable. No changes were made to your session.');
      }
    } finally {
      this._busy.set(false);
      try { await this.refreshAiStatus(); } catch { /* status is advisory */ }
    }
  }
}

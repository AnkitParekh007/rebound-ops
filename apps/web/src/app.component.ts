import { Component, ChangeDetectionStrategy, inject, signal, type OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import type { Intake, Session, RouteId, Evidence } from '@reboundops/contracts';

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
  imports: [FormsModule],
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

  draft: Draft = { ...sample };
  evidenceText = sampleEvidence;
  notesDraft = '';

  async ngOnInit(): Promise<void> {
    try {
      const status = await firstValueFrom(this.http.get<{ status: string }>('/api/health'));
      this.apiAvailable.set(status.status === 'ok');
    } catch {
      this.error.set('Local API is not running. Start it using npm run dev:api in a separate terminal.');
    }
  }

  demo(): void {
    this.session.set(null);
    this.draft = { ...sample };
    this.evidenceText = sampleEvidence;
    this.notesDraft = '';
    this.notice.set('Fictional example loaded. Claims are unverified and editable.');
    this.error.set('');
  }

  clear(): void {
    this.session.set(null);
    this.draft = {
      role: '', location: '', weeklyHours: 6, urgency: 'quarter',
      priorities: '', shiftTarget: '', bridgeTarget: ''
    };
    this.evidenceText = '';
    this.notesDraft = '';
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
      this.session.set(current);
      this.notice.set(success);
    } catch (failure) {
      if (failure instanceof HttpErrorResponse && failure.status === 409 && failure.error?.session) {
        this.session.set(failure.error.session as Session);
        this.error.set('The session changed before this action. Latest version loaded; please retry.');
      } else if (failure instanceof HttpErrorResponse) {
        this.error.set(failure.error?.error === 'INVALID_REQUEST'
          ? 'Please review the form values and source claims.'
          : (failure.error?.error || 'The local API request failed.'));
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

  completedCount(): number {
    return this.session()?.plan?.actions.filter(a => a.completed).length ?? 0;
  }
}

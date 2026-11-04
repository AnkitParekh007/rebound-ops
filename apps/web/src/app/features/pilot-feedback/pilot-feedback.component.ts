import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import { downloadText } from '../../core/download';
import { blankPilotFeedback, exportPilotFeedback, hasPilotAnswer, type PilotFeedback } from './pilot-feedback.model';

/**
 * Optional private pilot questionnaire. Answers live only in this component
 * instance: never in the store, the API, session backups or AI payloads.
 * The component is recreated for each session, which clears them.
 */
@Component({
  selector: 'rb-pilot-feedback',
  imports: [FormsModule],
  templateUrl: './pilot-feedback.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class PilotFeedbackComponent {
  protected readonly store = inject(SessionStore);
  readonly session = input.required<Session>();

  pilotFeedback: PilotFeedback = blankPilotFeedback();

  canExportPilotFeedback(): boolean {
    return this.pilotFeedback.consent && hasPilotAnswer(this.pilotFeedback);
  }

  downloadPilotFeedback(): void {
    if (!this.canExportPilotFeedback()) return;
    try {
      const text = exportPilotFeedback(
        this.pilotFeedback, this.session().plan?.routeId, new Date().toISOString().slice(0, 10));
      downloadText(text, 'reboundops-private-pilot-feedback.md', 'text/markdown;charset=utf-8');
      this.store.setNotice('Private feedback downloaded locally. Review and redact it before choosing to share.');
    } catch {
      this.store.setError('Unable to export pilot feedback. Check consent and at least one answer.');
    }
  }

  clearPilotFeedback(): void {
    this.pilotFeedback = blankPilotFeedback();
    this.store.setNotice('Unsaved pilot feedback cleared from this browser page.');
  }
}

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import type { Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import { downloadText } from '../../core/download';
import { blankPilotFeedback, exportPilotFeedback, hasPilotAnswer, type PilotFeedback } from './pilot-feedback.model';

type Controls = { [K in keyof PilotFeedback]: FormControl<PilotFeedback[K]> };

function feedbackForm(initial: PilotFeedback): FormGroup<Controls> {
  const controls = {} as Controls;
  for (const key of Object.keys(initial) as (keyof PilotFeedback)[]) {
    (controls as Record<string, FormControl>)[key] = new FormControl(initial[key], { nonNullable: true });
  }
  return new FormGroup(controls);
}

/**
 * Optional private pilot questionnaire. Answers live only in this component
 * instance: never in the store, the API, session backups or AI payloads.
 * The component is recreated for each session, which clears them.
 */
@Component({
  selector: 'rb-pilot-feedback',
  imports: [ReactiveFormsModule],
  templateUrl: './pilot-feedback.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class PilotFeedbackComponent {
  protected readonly store = inject(SessionStore);
  readonly session = input.required<Session>();

  readonly form = feedbackForm(blankPilotFeedback());

  canExportPilotFeedback(): boolean {
    const answers = this.form.getRawValue();
    return answers.consent && hasPilotAnswer(answers);
  }

  downloadPilotFeedback(): void {
    if (!this.canExportPilotFeedback()) return;
    try {
      const text = exportPilotFeedback(
        this.form.getRawValue(), this.session().plan?.routeId, new Date().toISOString().slice(0, 10));
      downloadText(text, 'reboundops-private-pilot-feedback.md', 'text/markdown;charset=utf-8');
      this.store.setNotice('Private feedback downloaded locally. Review and redact it before choosing to share.');
    } catch {
      this.store.setError('Unable to export pilot feedback. Check consent and at least one answer.');
    }
  }

  clearPilotFeedback(): void {
    this.form.reset(blankPilotFeedback());
    this.store.setNotice('Unsaved pilot feedback cleared from this browser page.');
  }
}

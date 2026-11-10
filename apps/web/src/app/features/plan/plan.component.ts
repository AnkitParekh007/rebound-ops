import { ChangeDetectionStrategy, Component, type OnInit, effect, inject, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReviewSchema, type Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import { FORM_INVALID_MESSAGE, contractValidator, fieldError } from '../../core/form-validation';

/** Step 04: time-budgeted seven-day plan, check-in notes and Markdown export. */
@Component({
  selector: 'rb-plan',
  imports: [ReactiveFormsModule],
  templateUrl: './plan.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class PlanComponent implements OnInit {
  protected readonly store = inject(SessionStore);
  readonly session = input.required<Session>();

  readonly experiment = new FormGroup({
    actionId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(500)] })
  });

  suggestExperiment(text: string): void {
    const minutes = this.session().plan?.actions.find(action => action.id === this.experiment.controls.actionId.value)?.minutes;
    this.experiment.controls.title.setValue(`Within ${minutes ?? 'the allocated'} minutes, test “${text.slice(0,150)}”: choose one small, permission-safe example, record the steps and observable result, then list what remains unproven. Stop at the time limit; do not claim production experience.`);
  }

  async saveExperiment(): Promise<void> {
    if (this.experiment.invalid) { this.experiment.markAllAsTouched(); return; }
    const value = this.experiment.getRawValue();
    await this.store.personalizeAction(value.actionId, value.title);
  }

  private loadedSession = '';
  constructor() {
    effect(() => {
      const current = this.session();
      if (current.id !== this.loadedSession) { this.loadedSession=current.id; this.notes.reset(current.reviewNotes); this.experiment.controls.title.reset(''); }
      if (current.plan && !current.plan.actions.some(action => action.id === this.experiment.controls.actionId.value)) this.experiment.controls.actionId.setValue(current.plan.actions.find(action => !action.completed)?.id || current.plan.actions[0]?.id || '');
    });
  }

  readonly notes = new FormControl('', { nonNullable: true, validators: contractValidator(ReviewSchema.shape.notes) });

  ngOnInit(): void {
    // A newly shown plan starts from the session's last saved check-in.
    this.notes.reset(this.session().reviewNotes);
    this.experiment.controls.actionId.setValue(this.session().plan?.actions.find(action => !action.completed)?.id || this.session().plan?.actions[0]?.id || '');
  }

  error(): string | null {
    return fieldError(this.notes);
  }

  async toggleAction(actionId: string, completed: boolean): Promise<void> {
    await this.store.setActionCompleted(actionId, completed);
  }

  async saveReview(): Promise<void> {
    if (this.notes.invalid) {
      this.notes.markAsTouched();
      this.store.setError(FORM_INVALID_MESSAGE);
      return;
    }
    await this.store.saveReview(this.notes.value);
  }

  async download(): Promise<void> {
    await this.store.exportMarkdown();
  }
}

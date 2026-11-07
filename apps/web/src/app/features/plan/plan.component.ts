import { ChangeDetectionStrategy, Component, type OnInit, inject, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
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

  readonly notes = new FormControl('', { nonNullable: true, validators: contractValidator(ReviewSchema.shape.notes) });

  ngOnInit(): void {
    // A newly shown plan starts from the session's last saved check-in.
    this.notes.reset(this.session().reviewNotes);
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

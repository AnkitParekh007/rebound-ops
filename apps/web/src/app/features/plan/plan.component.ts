import { ChangeDetectionStrategy, Component, type OnInit, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';

/** Step 04: time-budgeted seven-day plan, check-in notes and Markdown export. */
@Component({
  selector: 'rb-plan',
  imports: [FormsModule],
  templateUrl: './plan.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class PlanComponent implements OnInit {
  protected readonly store = inject(SessionStore);
  readonly session = input.required<Session>();

  notesDraft = '';

  ngOnInit(): void {
    // A newly shown plan starts from the session's last saved check-in.
    this.notesDraft = this.session().reviewNotes;
  }

  async toggleAction(actionId: string, completed: boolean): Promise<void> {
    await this.store.setActionCompleted(actionId, completed);
  }

  async saveReview(): Promise<void> {
    await this.store.saveReview(this.notesDraft);
  }

  async download(): Promise<void> {
    await this.store.exportMarkdown();
  }
}

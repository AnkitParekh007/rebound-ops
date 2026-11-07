import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { SessionStore } from '../../core/session-store';

/**
 * Optional AI review: shows the exact outgoing JSON and sends it only on an
 * explicit consent click. Suggestions are displayed, never applied.
 */
@Component({
  selector: 'rb-ai-review',
  imports: [JsonPipe],
  templateUrl: './ai-review.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class AiReviewComponent {
  protected readonly store = inject(SessionStore);

  async analyzeAI(): Promise<void> {
    await this.store.analyzeAi();
  }
}

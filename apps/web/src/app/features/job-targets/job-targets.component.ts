import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import type { RequirementStatus } from '../../core/api-types';
import { AiReviewComponent } from '../ai-review/ai-review.component';

/** Step 02b: manually pasted job requirements reviewed against confirmed evidence. */
@Component({
  selector: 'rb-job-targets',
  imports: [FormsModule, AiReviewComponent],
  templateUrl: './job-targets.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class JobTargetsComponent {
  protected readonly store = inject(SessionStore);
  readonly session = input.required<Session>();

  targetTitle = '';
  targetUrl = '';
  targetRequirements = '';
  /** Unsaved evidence choice per requirement ID. */
  evidenceSelection: Record<string, string> = {};

  async addTarget(): Promise<void> {
    const requirements = this.targetRequirements.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!requirements.length || requirements.length > 12) {
      this.store.setError('Enter between 1 and 12 job requirements, one per line.');
      return;
    }
    const saved = await this.store.addJobTarget({
      title: this.targetTitle.trim(), sourceUrl: this.targetUrl.trim(), requirements
    });
    if (saved) {
      this.targetTitle = '';
      this.targetUrl = '';
      this.targetRequirements = '';
    }
  }

  async reviewRequirement(targetId: string, requirementId: string, status: RequirementStatus): Promise<void> {
    const selected = this.evidenceSelection[requirementId] ||
      this.session().jobTargets.find(t => t.id === targetId)
        ?.requirements.find(r => r.id === requirementId)?.evidenceIds[0] || '';
    if (status === 'supported' && !selected) {
      this.store.setError('Select a participant-confirmed achievement before marking this requirement as supported.');
      return;
    }
    await this.store.reviewRequirement(targetId, requirementId, status, status === 'supported' ? [selected] : []);
  }

  async removeTarget(id: string): Promise<void> {
    await this.store.removeJobTarget(id);
  }

  async previewAI(targetId: string): Promise<void> {
    await this.store.previewAi(targetId);
  }
}

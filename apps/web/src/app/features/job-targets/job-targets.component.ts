import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { type AbstractControl, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AddJobTargetSchema, JobRequirementSchema, type Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import type { RequirementStatus } from '../../core/api-types';
import {
  FORM_INVALID_MESSAGE, contractValidator, fieldError, linesValidator, nonEmptyLines
} from '../../core/form-validation';
import { AiReviewComponent } from '../ai-review/ai-review.component';

export const REQUIREMENT_LINES_MESSAGE = 'Enter between 1 and 12 job requirements, one per line.';

/** Step 02b: manually pasted job requirements reviewed against confirmed evidence. */
@Component({
  selector: 'rb-job-targets',
  imports: [ReactiveFormsModule, AiReviewComponent],
  templateUrl: './job-targets.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class JobTargetsComponent {
  protected readonly store = inject(SessionStore);
  readonly session = input.required<Session>();

  readonly targetForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: contractValidator(AddJobTargetSchema.shape.title) }),
    sourceUrl: new FormControl('', { nonNullable: true, validators: contractValidator(AddJobTargetSchema.shape.sourceUrl) }),
    requirements: new FormControl('', {
      nonNullable: true,
      validators: linesValidator({
        min: 1, max: 12, item: JobRequirementSchema.shape.text,
        tooFew: REQUIREMENT_LINES_MESSAGE, tooMany: REQUIREMENT_LINES_MESSAGE, itemLabel: 'Requirement'
      })
    })
  });

  /** Unsaved evidence choice per requirement ID (session-scoped UI state). */
  evidenceSelection: Record<string, string> = {};

  error(control: AbstractControl): string | null {
    return fieldError(control);
  }

  selectedEvidence(requirementId: string, saved: string[]): string {
    return this.evidenceSelection[requirementId] || saved[0] || '';
  }

  selectEvidence(requirementId: string, event: Event): void {
    this.evidenceSelection[requirementId] = (event.target as HTMLSelectElement).value;
  }

  async addTarget(): Promise<void> {
    if (this.targetForm.invalid) {
      this.targetForm.markAllAsTouched();
      const lines = this.targetForm.controls.requirements.errors?.['lines'] as string | undefined;
      this.store.setError(lines === REQUIREMENT_LINES_MESSAGE ? lines : FORM_INVALID_MESSAGE);
      return;
    }
    const { title, sourceUrl, requirements } = this.targetForm.getRawValue();
    const saved = await this.store.addJobTarget({
      title: title.trim(), sourceUrl: sourceUrl.trim(), requirements: nonEmptyLines(requirements)
    });
    if (saved) this.targetForm.reset();
  }

  async reviewRequirement(targetId: string, requirementId: string, status: RequirementStatus): Promise<void> {
    const saved = this.session().jobTargets.find(t => t.id === targetId)
      ?.requirements.find(r => r.id === requirementId)?.evidenceIds ?? [];
    const selected = this.selectedEvidence(requirementId, saved);
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

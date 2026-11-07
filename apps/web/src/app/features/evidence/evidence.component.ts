import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type AbstractControl, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  CorrectEvidenceSchema, CorrectionSchema, EvidenceSchema, SourceDocumentSchema,
  type Evidence, type Session
} from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import type { CorrectionSource, EvidenceStatus, SourceKind } from '../../core/api-types';
import { FORM_INVALID_MESSAGE, contractValidator, fieldError } from '../../core/form-validation';

/** The `document` branch of the correction source union holds the excerpt rule. */
const excerptSchema = CorrectEvidenceSchema.shape.source.options[1].shape.excerpt;

/** Step 02: private source documents, evidence decisions, cited corrections and history. */
@Component({
  selector: 'rb-evidence',
  imports: [ReactiveFormsModule],
  templateUrl: './evidence.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class EvidenceComponent {
  protected readonly store = inject(SessionStore);
  readonly session = input.required<Session>();

  readonly sourceForm = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: contractValidator(SourceDocumentSchema.shape.label) }),
    kind: new FormControl<SourceKind>('resume', { nonNullable: true }),
    body: new FormControl('', { nonNullable: true, validators: contractValidator(SourceDocumentSchema.shape.body) })
  });

  readonly correctionForm = new FormGroup({
    claim: new FormControl('', { nonNullable: true, validators: contractValidator(EvidenceSchema.shape.claim) }),
    reason: new FormControl('', { nonNullable: true, validators: contractValidator(CorrectionSchema.shape.reason) }),
    documentId: new FormControl('', { nonNullable: true }),
    // Only validated (enabled) when a source document is chosen.
    excerpt: new FormControl({ value: '', disabled: true }, { nonNullable: true, validators: contractValidator(excerptSchema) })
  });

  editingEvidenceId = '';

  constructor() {
    this.correctionForm.controls.documentId.valueChanges.pipe(takeUntilDestroyed())
      .subscribe(id => this.toggleExcerpt(id));
  }

  error(control: AbstractControl): string | null {
    return fieldError(control);
  }

  async evidenceDecision(id: string, status: EvidenceStatus): Promise<void> {
    await this.store.decideEvidence(id, status);
  }

  async addSource(): Promise<void> {
    if (this.sourceForm.invalid) {
      this.sourceForm.markAllAsTouched();
      this.store.setError(FORM_INVALID_MESSAGE);
      return;
    }
    const { kind, label, body } = this.sourceForm.getRawValue();
    const saved = await this.store.addSourceDocument({ kind, label: label.trim(), body });
    if (saved) this.sourceForm.reset({ kind, label: '', body: '' });
  }

  async removeSource(id: string): Promise<void> {
    await this.store.removeSourceDocument(id);
  }

  startEvidenceEdit(item: Evidence): void {
    this.editingEvidenceId = item.id;
    const documentId = item.source.span?.documentId ?? '';
    this.correctionForm.reset({ claim: item.claim, reason: '', documentId, excerpt: item.source.excerpt ?? '' });
    this.toggleExcerpt(documentId);
    this.store.setError('');
  }

  cancelEvidenceEdit(): void {
    this.editingEvidenceId = '';
    this.correctionForm.reset({ claim: '', reason: '', documentId: '', excerpt: '' });
    this.toggleExcerpt('');
  }

  async saveEvidenceCorrection(): Promise<void> {
    if (!this.editingEvidenceId) return;
    if (this.correctionForm.invalid) {
      this.correctionForm.markAllAsTouched();
      this.store.setError(FORM_INVALID_MESSAGE);
      return;
    }
    const { claim, reason, documentId, excerpt } = this.correctionForm.getRawValue();
    const source: CorrectionSource = documentId
      ? { mode: 'document', documentId, excerpt }
      : { mode: 'manual', label: 'Participant-edited manual evidence' };
    const saved = await this.store.correctEvidence(this.editingEvidenceId, {
      claim: claim.trim(), reason: reason.trim(), source
    });
    if (saved) this.cancelEvidenceEdit();
  }

  private toggleExcerpt(documentId: string): void {
    const excerpt = this.correctionForm.controls.excerpt;
    if (documentId) excerpt.enable({ emitEvent: false });
    else excerpt.disable({ emitEvent: false });
  }
}

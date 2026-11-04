import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Evidence, Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import type { CorrectionSource, EvidenceStatus, SourceKind } from '../../core/api-types';

/** Step 02: private source documents, evidence decisions, cited corrections and history. */
@Component({
  selector: 'rb-evidence',
  imports: [FormsModule],
  templateUrl: './evidence.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class EvidenceComponent {
  protected readonly store = inject(SessionStore);
  readonly session = input.required<Session>();

  sourceTitle = '';
  sourceKind: SourceKind = 'resume';
  sourceBody = '';
  editingEvidenceId = '';
  editClaim = '';
  editReason = '';
  citationDocumentId = '';
  citationExcerpt = '';

  async evidenceDecision(id: string, status: EvidenceStatus): Promise<void> {
    await this.store.decideEvidence(id, status);
  }

  async addSource(): Promise<void> {
    const saved = await this.store.addSourceDocument({
      kind: this.sourceKind, label: this.sourceTitle.trim(), body: this.sourceBody
    });
    if (saved) {
      this.sourceTitle = '';
      this.sourceBody = '';
    }
  }

  async removeSource(id: string): Promise<void> {
    await this.store.removeSourceDocument(id);
  }

  startEvidenceEdit(item: Evidence): void {
    this.editingEvidenceId = item.id;
    this.editClaim = item.claim;
    this.editReason = '';
    this.citationDocumentId = item.source.span?.documentId ?? '';
    this.citationExcerpt = item.source.excerpt ?? '';
    this.store.setError('');
  }

  cancelEvidenceEdit(): void {
    this.editingEvidenceId = '';
    this.editReason = '';
    this.citationExcerpt = '';
  }

  async saveEvidenceCorrection(): Promise<void> {
    if (!this.editingEvidenceId) return;
    const source: CorrectionSource = this.citationDocumentId
      ? { mode: 'document', documentId: this.citationDocumentId, excerpt: this.citationExcerpt }
      : { mode: 'manual', label: 'Participant-edited manual evidence' };
    const saved = await this.store.correctEvidence(this.editingEvidenceId, {
      claim: this.editClaim.trim(), reason: this.editReason.trim(), source
    });
    if (saved) this.cancelEvidenceEdit();
  }
}

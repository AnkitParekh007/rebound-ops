import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Intake, Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';

type Draft = Omit<Intake, 'evidence'>;

const sample: Draft = {
  role: 'Senior Frontend Engineer',
  location: 'India / remote',
  weeklyHours: 6,
  urgency: 'quarter',
  priorities: 'Prefer hands-on product work. Avoid a long retraining period.',
  shiftTarget: 'AI application engineer',
  bridgeTarget: 'Frontend architecture consulting'
};
const sampleEvidence = [
  'Led a component library migration (fictional résumé item 1)',
  'Improved CI build performance (fictional résumé item 2)',
  'Mentored engineers on frontend testing (fictional résumé item 3)'
].join('\n');
const blankDraft = (): Draft => ({
  role: '', location: '', weeklyHours: 6, urgency: 'quarter',
  priorities: '', shiftTarget: '', bridgeTarget: ''
});

/** Step 01: intake form, resume of opted-in saved sessions and backup restore. */
@Component({
  selector: 'rb-intake',
  imports: [FormsModule],
  templateUrl: './intake.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class IntakeComponent {
  protected readonly store = inject(SessionStore);

  draft: Draft = { ...sample };
  evidenceText = sampleEvidence;

  async submit(): Promise<void> {
    await this.store.submitIntake(() => this.collectIntake());
  }

  demo(): void {
    this.draft = { ...sample };
    this.evidenceText = sampleEvidence;
    this.store.reset('Fictional example loaded. Claims are unverified and editable.');
  }

  clear(): void {
    this.draft = blankDraft();
    this.evidenceText = '';
    this.store.reset('Draft cleared from the screen. Server sessions are temporary until the API restarts.');
  }

  async resumeSaved(id: string): Promise<void> {
    const session = await this.store.resumeSaved(id);
    if (session) this.loadDraftFrom(session);
  }

  async restoreFile(event: Event): Promise<void> {
    const field = event.target;
    if (!(field instanceof HTMLInputElement)) return;
    const file = field.files?.[0];
    if (!file) return;
    if (file.size > 128 * 1024) {
      this.store.setError('Backup exceeds 128 KB. Only ReboundOps JSON snapshots are supported.');
      field.value = '';
      return;
    }
    const session = await this.store.restoreBackup(file);
    if (session) this.loadDraftFrom(session);
    field.value = '';
  }

  private loadDraftFrom(session: Session): void {
    const { evidence, ...draft } = session.intake;
    this.draft = { ...draft };
    this.evidenceText = evidence.map(item => item.claim).join('\n');
  }

  private collectIntake(): Intake {
    const lines = this.evidenceText.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    if (lines.length > 15) throw new Error('Use at most 15 evidence lines.');
    return {
      ...this.draft,
      role: this.draft.role.trim(),
      location: this.draft.location.trim(),
      priorities: this.draft.priorities.trim(),
      shiftTarget: this.draft.shiftTarget.trim(),
      bridgeTarget: this.draft.bridgeTarget.trim(),
      evidence: lines.map((claim, i) => ({
        id: crypto.randomUUID(),
        claim,
        status: 'unverified',
        source: { kind: 'manual', label: 'User-entered line ' + (i + 1) }
      }))
    };
  }
}

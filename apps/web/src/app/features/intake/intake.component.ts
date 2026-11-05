import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EvidenceSchema, IntakeSchema, type Intake, type Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import {
  FORM_INVALID_MESSAGE, contractValidator, fieldError, linesValidator, nonEmptyLines
} from '../../core/form-validation';

type Draft = Omit<Intake, 'evidence'> & { evidenceText: string };

const sample: Draft = {
  role: 'Senior Frontend Engineer',
  location: 'India / remote',
  weeklyHours: 6,
  urgency: 'quarter',
  priorities: 'Prefer hands-on product work. Avoid a long retraining period.',
  shiftTarget: 'AI application engineer',
  bridgeTarget: 'Frontend architecture consulting',
  evidenceText: [
    'Led a component library migration (fictional résumé item 1)',
    'Improved CI build performance (fictional résumé item 2)',
    'Mentored engineers on frontend testing (fictional résumé item 3)'
  ].join('\n')
};
const blank: Draft = {
  role: '', location: '', weeklyHours: 6, urgency: 'quarter',
  priorities: '', shiftTarget: '', bridgeTarget: '', evidenceText: ''
};

const field = IntakeSchema.shape;
/** Mirrors IntakeSchema.evidence `.max(15)`; a unit test asserts they stay equal. */
export const MAX_EVIDENCE_LINES = 15;
const text = (value: string, schema: Parameters<typeof contractValidator>[0]) =>
  new FormControl(value, { nonNullable: true, validators: contractValidator(schema) });

/** Step 01: intake form, resume of opted-in saved sessions and backup restore. */
@Component({
  selector: 'rb-intake',
  imports: [ReactiveFormsModule],
  templateUrl: './intake.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class IntakeComponent {
  protected readonly store = inject(SessionStore);

  /** Typed form; every rule comes from the shared IntakeSchema the API enforces. */
  readonly form = new FormGroup({
    role: text(sample.role, field.role),
    location: text(sample.location, field.location),
    weeklyHours: new FormControl<number>(sample.weeklyHours, {
      nonNullable: true, validators: contractValidator(field.weeklyHours)
    }),
    urgency: new FormControl<Intake['urgency']>(sample.urgency, {
      nonNullable: true, validators: contractValidator(field.urgency)
    }),
    priorities: text(sample.priorities, field.priorities),
    shiftTarget: text(sample.shiftTarget, field.shiftTarget),
    bridgeTarget: text(sample.bridgeTarget, field.bridgeTarget),
    evidenceText: new FormControl(sample.evidenceText, {
      nonNullable: true,
      validators: linesValidator({
        min: 0, max: MAX_EVIDENCE_LINES, item: EvidenceSchema.shape.claim,
        tooFew: '', tooMany: 'Use at most 15 evidence lines.', itemLabel: 'Line'
      })
    })
  });

  error(name: keyof IntakeComponent['form']['controls']): string | null {
    return fieldError(this.form.controls[name]);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const lines = this.form.controls.evidenceText.errors?.['lines'] as string | undefined;
      this.store.setError(lines === 'Use at most 15 evidence lines.' ? lines : FORM_INVALID_MESSAGE);
      return;
    }
    await this.store.submitIntake(() => this.toIntake());
  }

  demo(): void {
    this.form.reset(sample);
    this.store.reset('Fictional example loaded. Claims are unverified and editable.');
  }

  clear(): void {
    this.form.reset(blank);
    this.store.reset('Draft cleared from the screen. Server sessions are temporary until the API restarts.');
  }

  async resumeSaved(id: string): Promise<void> {
    const session = await this.store.resumeSaved(id);
    if (session) this.loadDraftFrom(session);
  }

  async restoreFile(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 128 * 1024) {
      this.store.setError('Backup exceeds 128 KB. Only ReboundOps JSON snapshots are supported.');
      input.value = '';
      return;
    }
    const session = await this.store.restoreBackup(file);
    if (session) this.loadDraftFrom(session);
    input.value = '';
  }

  private loadDraftFrom(session: Session): void {
    const { evidence, ...draft } = session.intake;
    this.form.reset({ ...draft, evidenceText: evidence.map(item => item.claim).join('\n') });
  }

  /** Builds the API payload; values are already contract-valid. */
  toIntake(): Intake {
    const v = this.form.getRawValue();
    return {
      role: v.role.trim(),
      location: v.location.trim(),
      weeklyHours: v.weeklyHours,
      urgency: v.urgency,
      priorities: v.priorities.trim(),
      shiftTarget: v.shiftTarget.trim(),
      bridgeTarget: v.bridgeTarget.trim(),
      evidence: nonEmptyLines(v.evidenceText).map((claim, i) => ({
        id: crypto.randomUUID(),
        claim,
        status: 'unverified',
        source: { kind: 'manual', label: 'User-entered line ' + (i + 1) }
      }))
    };
  }
}

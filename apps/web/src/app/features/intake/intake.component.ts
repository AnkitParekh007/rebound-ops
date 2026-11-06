import { ChangeDetectionStrategy, Component, computed, effect, inject, output, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EvidenceSchema, IntakeSchema, type Intake, type Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import { WizardStore } from '../../core/wizard';
import { FORM_INVALID_MESSAGE, contractValidator, fieldError, linesValidator } from '../../core/form-validation';
import { evidenceFromLines } from '../../core/intake-mapping';
import { ResumeComponent } from '../resume/resume.component';

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

/**
 * "About you" as one full form: the alternative to the guided questions, and
 * the place to edit the intake once a session exists. Starts blank; the
 * fictional example loads only on request, so it can never be submitted by accident.
 */
@Component({
  selector: 'rb-intake',
  imports: [ReactiveFormsModule, ResumeComponent],
  templateUrl: './intake.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class IntakeComponent {
  protected readonly store = inject(SessionStore);
  private readonly wizard = inject(WizardStore);

  /** Asks the shell to show the guided questions instead. */
  readonly guided = output<void>();

  private readonly sessionId = computed(() => this.store.session()?.id ?? null);

  /** Typed form; every rule comes from the shared IntakeSchema the API enforces. */
  readonly form = new FormGroup({
    role: text(blank.role, field.role),
    location: text(blank.location, field.location),
    weeklyHours: new FormControl<number>(blank.weeklyHours, {
      nonNullable: true, validators: contractValidator(field.weeklyHours)
    }),
    urgency: new FormControl<Intake['urgency']>(blank.urgency, {
      nonNullable: true, validators: contractValidator(field.urgency)
    }),
    priorities: text(blank.priorities, field.priorities),
    shiftTarget: text(blank.shiftTarget, field.shiftTarget),
    bridgeTarget: text(blank.bridgeTarget, field.bridgeTarget),
    evidenceText: new FormControl(blank.evidenceText, {
      nonNullable: true,
      validators: linesValidator({
        min: 0, max: MAX_EVIDENCE_LINES, item: EvidenceSchema.shape.claim,
        tooFew: '', tooMany: 'Use at most 15 evidence lines.', itemLabel: 'Line'
      })
    })
  });

  constructor() {
    // The form always shows the active session's intake: after the guided
    // questions, a resume or a restore, "Update intake" edits real answers.
    effect(() => {
      if (!this.sessionId()) return;
      untracked(() => {
        const session = this.store.session();
        if (session) this.loadDraftFrom(session);
      });
    });
  }

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
    if (await this.store.submitIntake(() => this.toIntake())) this.wizard.go('evidence');
  }

  demo(): void {
    this.form.reset(sample);
    this.store.reset('Fictional example loaded. Claims are unverified and editable.');
  }

  clear(): void {
    this.form.reset(blank);
    this.store.reset('Draft cleared from the screen. Server sessions are temporary until the API restarts.');
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
      evidence: evidenceFromLines(v.evidenceText)
    };
  }
}

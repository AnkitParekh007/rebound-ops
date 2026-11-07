import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, output, signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, type AbstractControl } from '@angular/forms';
import { EvidenceSchema, IntakeSchema } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import { WizardStore } from '../../core/wizard';
import { contractValidator, fieldError, linesValidator } from '../../core/form-validation';
import { ResumeComponent } from '../resume/resume.component';
import { MAX_EVIDENCE_LINES } from '../intake/intake.component';
import {
  type Answers, type Direction, type Feeling, type QuestionId, type Situation, type Timing, type Want,
  QUESTIONS, ROUTE_WORDS, TYPICAL_LENGTH, WANT_IDS, answerText, options, suggestedRoute, toIntake, walk, wording
} from './onboarding-flow';

type Screen = 'welcome' | QuestionId | 'review';

const field = IntakeSchema.shape;
const text = (validators = contractValidator(field.priorities)) =>
  new FormControl('', { nonNullable: true, validators });

/**
 * First-visit guided questions: one question per screen, a short "so far"
 * list with Change buttons, and a "Here's what I heard" summary that creates
 * the session with a single SessionStore intent.
 *
 * It looks conversational but is a plain, accessible form: native radios
 * with an explicit Continue (no auto-advance), no typing indicators, no fake
 * delays and no human persona. Answers stay in this component's memory; a
 * reload discards them.
 */
@Component({
  selector: 'rb-onboarding',
  imports: [ReactiveFormsModule, ResumeComponent],
  templateUrl: './onboarding.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class OnboardingComponent {
  protected readonly store = inject(SessionStore);
  private readonly wizard = inject(WizardStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Asks the shell to show the full single-page form instead. */
  readonly fullForm = output<void>();

  readonly form = new FormGroup({
    situation: new FormControl<Situation | null>(null, Validators.required),
    situationText: text(),
    breakReason: new FormControl('', { nonNullable: true }),
    role: text(contractValidator(field.role)),
    wants: new FormGroup(Object.fromEntries(WANT_IDS.map(w => [w, new FormControl(false, { nonNullable: true })])) as
      Record<Want, FormControl<boolean>>),
    timing: new FormControl<Timing | null>(null, Validators.required),
    feeling: new FormControl<Feeling>('', { nonNullable: true }),
    direction: new FormControl<Direction | null>(null, Validators.required),
    shiftTarget: text(contractValidator(field.shiftTarget)),
    bridgeTarget: text(contractValidator(field.bridgeTarget)),
    location: text(contractValidator(field.location)),
    hours: new FormControl<number | null>(null, Validators.required),
    evidence: new FormControl('', {
      nonNullable: true,
      validators: linesValidator({
        min: 0, max: MAX_EVIDENCE_LINES, item: EvidenceSchema.shape.claim,
        tooFew: '', tooMany: 'Please keep it to 15 lines or fewer.', itemLabel: 'Line'
      })
    })
  });

  /** Signal mirror of the form, so the path and wording react to every answer. */
  private readonly answers = signal<Answers>(this.read());
  protected readonly screen = signal<Screen>('welcome');
  private readonly answered = signal<ReadonlySet<QuestionId>>(new Set());
  /** True while changing an answer from the summary: Continue returns there. */
  private readonly fromReview = signal(false);
  private readonly attempted = signal(false);
  /** The path as it was at the last Continue, to tell the user when answers stop applying. */
  private readonly committedPath = signal<readonly QuestionId[]>([]);
  /** Announced in the (initially empty) status region; focus covers everything else. */
  protected readonly status = signal('');

  protected readonly path = computed(() => walk(this.answers()));
  protected readonly question = computed(() => {
    const s = this.screen();
    return s === 'welcome' || s === 'review' ? null : QUESTIONS[s];
  });
  protected readonly copy = computed(() => {
    const q = this.question();
    return q ? wording(q.id, this.answers()) : null;
  });
  protected readonly choices = computed(() => {
    const q = this.question();
    return q ? options(q.id, this.answers()) : [];
  });
  protected readonly position = computed(() => this.path().indexOf(this.screen() as QuestionId) + 1);
  protected readonly total = computed(() => this.answers().situation ? this.path().length : TYPICAL_LENGTH);
  /** Earlier answers on the current path, shown as a short "so far" list. */
  protected readonly soFar = computed(() => {
    const path = this.path();
    const done = this.answered();
    const end = this.screen() === 'review' ? path.length : this.position() - 1;
    return path.slice(0, Math.max(end, 0)).filter(id => done.has(id)).map(id => this.row(id));
  });
  protected readonly route = computed(() => suggestedRoute(this.answers()));
  protected readonly routeWords = ROUTE_WORDS;

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.answers.set(this.read()));
  }

  start(): void {
    this.go(this.path()[0]!);
  }

  continue(): void {
    const id = this.question()?.id;
    if (!id) return;
    if (this.error()) {
      this.attempted.set(true);
      this.control(id).markAsTouched();
      this.focusInput();
      return;
    }
    const before = this.committedPath();
    this.answered.update(set => new Set(set).add(id));
    const path = this.path();
    this.committedPath.set(path);
    const dropped = before.filter(q => !path.includes(q) && this.answered().has(q)).length;
    this.status.set(dropped ? `Your answer changed the questions. ${dropped} earlier ${dropped === 1 ? 'answer no longer applies' : 'answers no longer apply'}.` : '');

    const unanswered = path.find(q => !this.answered().has(q));
    if (this.fromReview()) {
      this.go(unanswered ?? 'review');
      if (!unanswered) this.fromReview.set(false);
      return;
    }
    this.go(path[path.indexOf(id) + 1] ?? unanswered ?? 'review');
  }

  /** Optional questions only: clears the answer and moves on. */
  skip(): void {
    const id = this.question()?.id;
    if (!id || QUESTIONS[id].required) return;
    const c = this.control(id);
    c.reset();
    this.continue();
  }

  back(): void {
    const s = this.screen();
    if (s === 'welcome') return;
    if (this.fromReview() && s !== 'review') {
      this.fromReview.set(false);
      this.go('review');
      return;
    }
    const path = this.path();
    const index = s === 'review' ? path.length : path.indexOf(s);
    this.go(index > 0 ? path[index - 1]! : 'welcome');
  }

  change(id: QuestionId): void {
    this.fromReview.set(this.screen() === 'review');
    this.go(id);
  }

  async save(): Promise<void> {
    const answers = this.answers();
    if (await this.store.submitIntake(() => toIntake(answers))) this.wizard.go('evidence');
  }

  /** The message under the current question, once the user tried to continue. */
  protected error(): string | null {
    const q = this.question();
    if (!q) return null;
    const c = this.control(q.id);
    if (q.required && (c.value === null || c.value === '' || (typeof c.value === 'string' && !c.value.trim()))) {
      return q.kind === 'choice' ? 'Choose one option to continue.' : 'Please add a few words to continue.';
    }
    if (!c.invalid) return null;
    return fieldError(c) ?? (c.errors?.['contract'] as string | undefined) ?? (c.errors?.['lines'] as string | undefined) ?? 'Please check this answer.';
  }

  protected visibleError(): string | null {
    return this.attempted() ? this.error() : null;
  }

  protected control(id: QuestionId): FormControl<unknown> {
    const c: AbstractControl = id === 'hours' ? this.form.controls.hours
      : id === 'evidence' ? this.form.controls.evidence
      : this.form.controls[id];
    return c as FormControl<unknown>;
  }

  protected wantControl(value: string | number): FormControl<boolean> {
    return this.form.controls.wants.controls[value as Want];
  }

  private row(id: QuestionId) {
    return { id, label: QUESTIONS[id].summary, answer: answerText(id, this.answers()), saved: QUESTIONS[id].saved };
  }

  private go(screen: Screen): void {
    this.attempted.set(false);
    this.screen.set(screen);
    // Move focus to the new question so keyboard and screen-reader users start there.
    afterNextRender(() => {
      const heading = this.host.nativeElement.querySelector<HTMLElement>('#intake-heading');
      heading?.focus();
      heading?.scrollIntoView?.({ block: 'nearest' });
    }, { injector: this.injector });
  }

  private focusInput(): void {
    afterNextRender(() => {
      this.host.nativeElement.querySelector<HTMLElement>('.ob-answers input, .ob-answers textarea')?.focus();
    }, { injector: this.injector });
  }

  private read(): Answers {
    const v = this.form.getRawValue();
    return {
      situation: v.situation, situationText: v.situationText, breakReason: v.breakReason, role: v.role,
      wants: WANT_IDS.filter(w => v.wants[w]), timing: v.timing, feeling: v.feeling, direction: v.direction,
      shiftTarget: v.shiftTarget, bridgeTarget: v.bridgeTarget, location: v.location,
      weeklyHours: v.hours, evidenceText: v.evidence
    };
  }
}

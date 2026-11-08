import {
  ChangeDetectionStrategy, Component, Injector, type OnInit, afterNextRender, computed, effect, inject, signal, untracked
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { SessionStore } from './core/session-store';
import { type StepId, type StepStatus, WizardStore } from './core/wizard';
import { IntakeComponent } from './features/intake/intake.component';
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { EvidenceComponent } from './features/evidence/evidence.component';
import { JobTargetsComponent } from './features/job-targets/job-targets.component';
import { RoutesComponent } from './features/routes/routes.component';
import { PlanComponent } from './features/plan/plan.component';
import { PilotFeedbackComponent } from './features/pilot-feedback/pilot-feedback.component';
import { AiSetupComponent } from './features/ai-setup/ai-setup.component';
import { DataControlsComponent } from './features/data-controls/data-controls.component';

/** Application shell: page frame, step navigation, global messages and step composition. */
@Component({
  selector: 'rb-root',
  imports: [
    NgTemplateOutlet, IntakeComponent, OnboardingComponent, EvidenceComponent, JobTargetsComponent, RoutesComponent,
    PlanComponent, PilotFeedbackComponent, DataControlsComponent, AiSetupComponent
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  protected readonly store = inject(SessionStore);
  protected readonly wizard = inject(WizardStore);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  /** "About you" before a session exists: guided questions (default) or the full form. Not stored anywhere. */
  protected readonly startMode = signal<'guided' | 'form'>('guided');

  /** Small screens collapse the step list behind a "Step N of M" toggle. */
  protected readonly menuOpen = signal(false);

  private readonly statusText: Record<StepStatus, string> = {
    current: 'current step', done: 'done', todo: 'not started', optional: 'optional', locked: 'not available yet'
  };

  protected readonly savedLabel = computed(() => {
    const session = this.store.session();
    if (!session) return 'Nothing saved yet.';
    return session.persistence === 'disk'
      ? 'Saved on this computer.'
      : 'Kept in memory only: cleared when the local app stops.';
  });

  constructor() {
    effect(() => {
      if (!this.store.aiSetupOpen()) return;
      afterNextRender(() => {
        const heading = this.document.getElementById('ai-setup-heading');
        heading?.setAttribute('tabindex', '-1');
        heading?.focus();
        heading?.scrollIntoView?.({ block: 'start' });
      }, { injector: this.injector });
    });
    // Keep the tab title in step with the visible step.
    effect(() => {
      const step = this.wizard.currentStep();
      const position = this.wizard.position();
      this.document.title = (position
        ? 'Step ' + position + ' of ' + this.wizard.mainSteps().length + ': ' + step.label
        : step.label) + ' – ReboundOps';
    });
    // After a step change, move focus to the new step's heading so keyboard and
    // screen-reader users start at the top of the step, not at <body>.
    effect(() => {
      if (!this.wizard.navigations()) return;
      const headingId = untracked(this.wizard.currentStep).headingId;
      afterNextRender(() => {
        const heading = this.document.getElementById(headingId);
        if (!heading) return;
        heading.setAttribute('tabindex', '-1');
        heading.focus();
        heading.scrollIntoView?.({ block: 'start' });
      }, { injector: this.injector });
    });
  }

  ngOnInit(): Promise<void> {
    this.wizard.init();
    return this.store.init();
  }

  protected describe(status: StepStatus): string {
    return this.statusText[status];
  }

  protected open(id: StepId): void {
    if (this.wizard.go(id)) this.menuOpen.set(false);
  }
}

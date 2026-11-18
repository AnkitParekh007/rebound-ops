import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { AiMode, OnboardingState, SearchTimeline } from '@reboundops/contracts';
import { ApiProblem, ApiService } from '../api.service';
import { joinList, splitList } from '../labels';

const STEPS = ['Welcome', 'How it works', 'Your goals', 'All set'] as const;

@Component({
  selector: 'app-welcome-page',
  imports: [FormsModule],
  template: `
    <section class="page narrow" aria-labelledby="welcome-heading">
      <ol class="stepper" aria-label="Setup progress">
        @for (label of steps; track label; let i = $index) {
          <li [class.done]="i < step()" [class.current]="i === step()" [attr.aria-current]="i === step() ? 'step' : null">
            <span class="dot" aria-hidden="true">{{ i + 1 }}</span><span class="label">{{ label }}</span>
          </li>
        }
      </ol>

      <div class="card stage" #stage tabindex="-1">
        @switch (step()) {
          @case (0) {
            <p class="eyebrow">Step 1 of 4</p>
            <h1 id="welcome-heading">A calmer way to run your job search</h1>
            <p class="lede">
              ReboundOps keeps your roles, applications and follow-ups in one place on this computer.
              It helps you assess fit honestly and prepare applications from facts you have confirmed —
              it never applies on your behalf.
            </p>
            <ul class="checklist">
              <li>Works fully offline. No account needed.</li>
              <li>Nothing leaves this device unless you turn that on.</li>
              <li>You can skip setup and come back any time.</li>
            </ul>
          }
          @case (1) {
            <p class="eyebrow">Step 2 of 4</p>
            <h1 id="welcome-heading">Choose how assistance works</h1>
            <fieldset class="choices">
              <legend class="sr-only">Assistance mode</legend>
              @for (opt of modes; track opt.value) {
                <label class="choice" [class.selected]="aiMode() === opt.value">
                  <input type="radio" name="aiMode" [value]="opt.value" [checked]="aiMode() === opt.value" (change)="aiMode.set(opt.value)" />
                  <span class="choice-title">{{ opt.title }}</span>
                  <span class="choice-body">{{ opt.body }}</span>
                </label>
              }
            </fieldset>
            @if (aiMode() !== 'off') {
              <p class="notice">Model connections are configured later in Setup. Until then everything keeps working in local-only mode.</p>
            }
          }
          @case (2) {
            <p class="eyebrow">Step 3 of 4</p>
            <h1 id="welcome-heading">What are you aiming for?</h1>
            <div class="field">
              <label for="roles">Target roles</label>
              <input id="roles" [(ngModel)]="rolesText" name="roles" placeholder="e.g. Data Analyst, BI Developer" aria-describedby="roles-hint" />
              <p class="hint" id="roles-hint">Separate with commas.</p>
            </div>
            <div class="field">
              <label for="timeline">Timeline</label>
              <select id="timeline" [(ngModel)]="timeline" name="timeline">
                <option [ngValue]="null">Not sure yet</option>
                <option ngValue="exploring">Just exploring</option>
                <option ngValue="within_3_months">Within about three months</option>
                <option ngValue="as_soon_as_possible">As soon as possible</option>
              </select>
            </div>
            <div class="field">
              <label for="weekly">Applications per week (optional)</label>
              <input id="weekly" type="number" min="0" max="100" [(ngModel)]="weekly" name="weekly" />
            </div>
          }
          @case (3) {
            <p class="eyebrow">Step 4 of 4</p>
            <h1 id="welcome-heading">You're set up</h1>
            <p class="lede">Next, add a job you're considering. You can fill in your profile whenever you like.</p>
          }
        }

        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }

        <div class="actions">
          @if (step() > 0) {
            <button type="button" class="btn ghost" (click)="back()" [disabled]="busy()">Back</button>
          }
          <span class="spacer"></span>
          @if (step() < lastStep) {
            <button type="button" class="btn link" (click)="skip()" [disabled]="busy()">Skip setup</button>
            <button type="button" class="btn primary" (click)="next()" [disabled]="busy()">{{ step() === 0 ? 'Get started' : 'Next' }}</button>
          } @else {
            <button type="button" class="btn ghost" (click)="finish('/profile')" [disabled]="busy()">Fill in profile</button>
            <button type="button" class="btn primary" (click)="finish('/jobs/new')" [disabled]="busy()">Add a job</button>
          }
        </div>
      </div>
    </section>
  `,
})
export class WelcomePage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  readonly steps = STEPS;
  readonly lastStep = STEPS.length - 1;
  readonly modes: { value: AiMode; title: string; body: string }[] = [
    { value: 'off', title: 'Local only (recommended to start)', body: 'Rules and templates run on this computer. Every feature works without AI.' },
    { value: 'local', title: 'Local model', body: 'Use a model running on this machine, such as one served by Ollama.' },
    { value: 'cloud', title: 'Cloud model', body: 'Send selected text to a provider you choose. You will be asked before anything is sent.' },
  ];

  readonly step = signal(0);
  readonly aiMode = signal<AiMode>('off');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly isDone = computed(() => this.step() === this.lastStep);

  rolesText = '';
  timeline: SearchTimeline | null = null;
  weekly: number | null = null;

  constructor() {
    void this.load();
  }

  private async load() {
    try {
      const s = await this.api.onboarding();
      this.apply(s);
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not load setup.');
    }
  }

  private apply(s: OnboardingState) {
    this.step.set(s.status === 'in_progress' ? Math.min(s.step, this.lastStep) : 0);
    this.aiMode.set(s.aiMode);
    this.rolesText = joinList(s.goals.targetRoles);
    this.timeline = s.goals.timeline;
    this.weekly = s.goals.weeklyApplicationTarget;
  }

  private async save(extra: { status: OnboardingState['status']; step: number }) {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.updateOnboarding({
        ...extra,
        aiMode: this.aiMode(),
        goals: {
          targetRoles: splitList(this.rolesText),
          timeline: this.timeline,
          weeklyApplicationTarget: this.weekly === null || this.weekly === undefined || `${this.weekly}` === '' ? null : Number(this.weekly),
          notes: '',
        },
      });
      return true;
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not save. Please try again.');
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  private focusStage() {
    queueMicrotask(() => this.stage()?.nativeElement.focus());
  }

  async next() {
    const to = this.step() + 1;
    if (await this.save({ status: to === this.lastStep ? 'completed' : 'in_progress', step: to })) {
      this.step.set(to);
      this.focusStage();
    }
  }

  back() {
    this.step.update((s) => Math.max(0, s - 1));
    this.focusStage();
  }

  async skip() {
    if (await this.save({ status: 'skipped', step: this.step() })) await this.router.navigateByUrl('/');
  }

  async finish(target: string) {
    if (await this.save({ status: 'completed', step: this.lastStep })) await this.router.navigateByUrl(target);
  }
}

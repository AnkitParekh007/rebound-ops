import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Assessment, EligibilityStatus } from '@reboundops/contracts';
import { ApiProblem, ApiService } from './api.service';

export const ELIGIBILITY_LABEL: Record<EligibilityStatus, string> = {
  confirmed: 'Eligibility confirmed',
  unconfirmed: 'Eligibility unconfirmed',
  ineligible: 'Likely ineligible',
};

/** Explains the fit score criterion by criterion, with the evidence behind each. */
@Component({
  selector: 'app-assessment-panel',
  imports: [RouterLink],
  template: `
    <section class="card assessment" aria-labelledby="fit-heading">
      <div class="row">
        <h2 id="fit-heading">Fit and eligibility</h2>
        <span class="spacer"></span>
        <button type="button" class="btn link" (click)="reload()" [disabled]="loading()">Re-check</button>
      </div>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      } @else if (data(); as a) {
        <div class="score-row">
          <div class="score" [attr.aria-label]="a.fit.overall === null ? 'Fit not scored' : 'Fit ' + a.fit.overall + ' out of 5'">
            <span class="score-value">{{ a.fit.overall ?? '—' }}</span><span class="score-scale">/ 5</span>
          </div>
          <div>
            <p class="eligibility" [attr.data-eligibility]="a.eligibility.status">{{ eligibilityLabel[a.eligibility.status] }}</p>
            <p class="muted small">
              @if (a.fit.overall === null) { Not enough information to score fit — {{ a.fit.scoredCriteria }} of {{ a.fit.totalCriteria }} criteria could be assessed. }
              @else { Based on {{ a.fit.scoredCriteria }} of {{ a.fit.totalCriteria }} criteria. }
              <span class="confidence" [attr.data-confidence]="a.fit.confidence">Confidence: {{ a.fit.confidence }}</span>
            </p>
          </div>
        </div>
        @if (a.fit.uncertainty.length) {
          <ul class="muted small uncertainty" aria-label="What limits this assessment">@for (u of a.fit.uncertainty; track u) { <li>{{ u }}</li> }</ul>
        }


        @if (a.missingInfo.length) {
          <div class="notice">
            <p><strong>Add to your profile to improve this assessment:</strong></p>
            <ul>@for (m of a.missingInfo; track m) { <li>{{ m }}</li> }</ul>
            <a routerLink="/profile">Update profile</a>
          </div>
        }

        @if (a.missingQualifications.length) {
          <div class="notice">
            <p><strong>Required qualifications your profile does not show:</strong></p>
            <ul>@for (m of a.missingQualifications; track m) { <li>{{ m }}</li> }</ul>
            <p class="small muted">If you have them, add them to your profile. This is a gap in what you recorded, not a judgement.</p>
          </div>
        }

        <h3 class="sub">Eligibility</h3>
        <ul class="criteria">
          @for (c of a.eligibility.checks; track c.key) {
            <li>
              <div class="criterion-head">
                <span>{{ c.label }}</span>
                <span class="eligibility small" [attr.data-eligibility]="c.status">{{ c.status }}</span>
              </div>
              <p>{{ c.reason }}</p>
              @if (c.evidence.length) {
                <ul class="evidence">@for (e of c.evidence; track $index) { <li><span class="tag" [class.found]="e.source === 'job'" [class.you]="e.source === 'profile'">{{ e.source === 'job' ? 'Posting' : 'Your profile' }}</span> <q>{{ e.text }}</q></li> }</ul>
              }
            </li>
          }
        </ul>

        <h3 class="sub">Fit criteria</h3>
        <ul class="criteria">
          @for (c of a.fit.criteria; track c.key) {
            <li>
              <div class="criterion-head">
                <span>{{ c.label }} <span class="muted small">· weight {{ pct(c.weight) }}% · {{ c.confidence }} confidence</span></span>
                <span class="crit-score" [class.unscored]="c.score === null">{{ c.score === null ? 'Not scored' : c.score + ' / 5' }}</span>
              </div>
              <p>{{ c.rationale }}</p>
              @if (c.evidence.length) {
                <ul class="evidence">@for (e of c.evidence; track $index) { <li><span class="tag" [class.found]="e.source === 'job'" [class.you]="e.source === 'profile'">{{ e.source === 'job' ? 'Posting' : 'Your profile' }}</span> <q>{{ e.text }}</q></li> }</ul>
              }
            </li>
          }
        </ul>
        @if (a.requirements.length) {
          <h3 class="sub">Posting qualifications</h3>
          <ul class="criteria requirements">
            @for (r of a.requirements; track $index) {
              <li [attr.data-kind]="r.kind">
                <div class="criterion-head"><span>{{ r.text }}</span><span class="tag">{{ r.kind === 'required' ? 'Required' : 'Preferred' }}</span></div>
                <p class="small muted">
                  {{ r.basis }}
                  @if (r.matchedSkills.length) { · you list {{ r.matchedSkills.join(', ') }} }
                  @if (r.missingSkills.length) { · not in your profile: {{ r.missingSkills.join(', ') }} }
                  @if (r.years; as y) { · {{ y.required }}+ years@if (y.skill) { with {{ y.skill }} }: @switch (y.status) { @case ('met') { you entered {{ y.stated }} } @case ('short') { you entered {{ y.stated }} } @default { your years not entered } } }
                </p>
              </li>
            }
          </ul>
        }
        <p class="muted small">{{ a.disclaimer }} Rubric {{ a.rubricVersion }}. <a routerLink="/settings" fragment="fit-weights">Adjust what matters to you</a>.</p>
      } @else {
        <p class="muted" role="status">Assessing…</p>
      }
    </section>
  `,
})
export class AssessmentPanel {
  pct(w: number) {
    return Math.round(w * 100);
  }
  private readonly api = inject(ApiService);
  readonly applicationId = input.required<string>();
  readonly eligibilityLabel = ELIGIBILITY_LABEL;
  readonly data = signal<Assessment | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  constructor() {
    effect(() => {
      void this.load(this.applicationId());
    });
  }

  reload() {
    void this.load(this.applicationId());
  }

  private async load(id: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.data.set(await this.api.assessment(id));
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not assess this job.');
    } finally {
      this.loading.set(false);
    }
  }
}

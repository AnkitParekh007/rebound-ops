import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FitWeights } from '@reboundops/contracts';
import { ApiProblem, ApiService } from './api.service';

const LABELS: { key: keyof FitWeights; label: string; hint: string }[] = [
  { key: 'role', label: 'Role alignment', hint: 'How closely the title matches your target roles' },
  { key: 'skills', label: 'Required skills', hint: 'Skills the posting requires that you list' },
  { key: 'experience', label: 'Experience', hint: 'Years asked for, overall and per skill' },
  { key: 'location', label: 'Location & arrangement', hint: 'Country, relocation and remote/hybrid' },
  { key: 'seniority', label: 'Seniority', hint: 'Level named in the title' },
  { key: 'salary', label: 'Published pay', hint: 'Only when the posting publishes pay' },
];

const LEVELS = [
  { value: 0, label: 'Ignore' },
  { value: 0.5, label: 'Less' },
  { value: 1, label: 'Normal' },
  { value: 2, label: 'More' },
  { value: 3, label: 'Much more' },
];

/** Lets the person say which fit criteria matter to them. Eligibility is never weighted. */
@Component({
  selector: 'app-fit-weights-panel',
  imports: [FormsModule],
  template: `
    <section class="card stack" id="fit-weights" aria-labelledby="weights-heading">
      <h2 id="weights-heading">What matters in a fit score</h2>
      <p class="hint">Change how much each criterion counts. Eligibility (work authorisation, required credentials) is always shown separately and is never weighted away.</p>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (weights(); as w) {
        <div class="grid two">
          @for (c of criteria; track c.key) {
            <div class="field">
              <label [for]="'w-' + c.key">{{ c.label }}</label>
              <select [id]="'w-' + c.key" [name]="'w-' + c.key" [ngModel]="w[c.key]" (ngModelChange)="set(c.key, $event)" [attr.aria-describedby]="'wh-' + c.key">
                @for (l of levels; track l.value) { <option [ngValue]="l.value">{{ l.label }}</option> }
              </select>
              <p class="hint" [id]="'wh-' + c.key">{{ c.hint }}</p>
            </div>
          }
        </div>
        <div class="actions">
          <button type="button" class="btn link" (click)="reset()">Reset to equal</button>
          <span class="spacer"></span>
          @if (saved()) { <span class="muted small" role="status">Saved.</span> }
          <button type="button" class="btn" (click)="save()" [disabled]="busy()">Save weights</button>
        </div>
      } @else {
        <p class="muted" role="status">Loading…</p>
      }
    </section>
  `,
})
export class FitWeightsPanel {
  private readonly api = inject(ApiService);
  readonly criteria = LABELS;
  readonly levels = LEVELS;
  readonly weights = signal<FitWeights | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly saved = signal(false);

  constructor() {
    this.api.fitWeights().then(
      (w) => this.weights.set(w),
      (e) => this.error.set(e instanceof ApiProblem ? e.message : 'Could not load weights.'),
    );
  }

  set(key: keyof FitWeights, value: number) {
    const w = this.weights();
    if (w) this.weights.set({ ...w, [key]: Number(value) });
    this.saved.set(false);
  }

  reset() {
    this.weights.set({ role: 1, skills: 1, experience: 1, location: 1, seniority: 1, salary: 1 });
    this.saved.set(false);
  }

  async save() {
    const w = this.weights();
    if (!w) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.weights.set(await this.api.saveFitWeights(w));
      this.saved.set(true);
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not save weights.');
    } finally {
      this.busy.set(false);
    }
  }
}

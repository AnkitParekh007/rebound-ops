import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { PackageView, ScreeningAnswer } from '@reboundops/contracts';
import { ApiProblem, ApiService } from './api.service';

/** Application package: screening answers, checklist, and the official link. */
@Component({
  selector: 'app-prepare-panel',
  imports: [FormsModule],
  template: `
    <section class="card stack" aria-labelledby="prep-heading">
      <h2 id="prep-heading">Prepare to apply</h2>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (view(); as v) {
        <ul class="checklist-items" aria-label="Application checklist">
          @for (i of v.checklist; track i.key) {
            <li [class.done]="i.done">
              <span class="mark" aria-hidden="true">{{ i.done ? '✓' : '○' }}</span>
              <span><strong>{{ i.label }}</strong>@if (i.optional) { <span class="muted small"> (optional)</span> }<span class="sr-only">{{ i.done ? ' — done' : ' — not done' }}</span><br /><span class="muted small">{{ i.detail }}</span></span>
            </li>
          }
        </ul>

        <div class="grid two">
          <div class="field">
            <label for="apply-url">Official application URL</label>
            <input id="apply-url" name="applyUrl" type="url" [(ngModel)]="applyUrl" placeholder="https://" />
            <div class="actions"><span class="spacer"></span><button type="button" class="btn ghost" (click)="saveUrl()" [disabled]="busy()">Save link</button></div>
          </div>
          <div class="field">
            <span class="label">Confirmations</span>
            <label class="check"><input type="checkbox" [ngModel]="v.package.eligibilityAcknowledged" (ngModelChange)="update({ eligibilityAcknowledged: $event })" name="elig" /> I reviewed the eligibility assessment</label>
            <label class="check"><input type="checkbox" [ngModel]="postingChecked()" (ngModelChange)="update({ postingCheckedByUser: $event })" name="checked" /> I checked the posting on the official site and the details match</label>
          </div>
        </div>
        @if (v.applyUrl) {
          <p><a class="btn primary" [href]="v.applyUrl" target="_blank" rel="noopener noreferrer external">Open the official application ↗</a></p>
          <p class="hint">ReboundOps never submits for you. Apply on the employer's site, then mark it applied here.</p>
        }

        <h3 class="sub">Screening questions</h3>
        <div class="field">
          <label for="questions">Paste questions from the application form (one per line)</label>
          <textarea id="questions" name="questions" rows="3" [(ngModel)]="questionsText"></textarea>
          <div class="actions"><span class="spacer"></span><button type="button" class="btn ghost" (click)="addQuestions()" [disabled]="busy() || !questionsText.trim()">Draft answers</button></div>
        </div>
        <ul class="criteria">
          @for (a of v.package.answers; track a.id) {
            <li>
              <div class="criterion-head">
                <span>{{ a.question }}</span>
                <span class="answer-status" [attr.data-answer]="a.status">{{ statusLabel(a) }}</span>
              </div>
              <label class="sr-only" [for]="'ans' + a.id">Answer to: {{ a.question }}</label>
              <textarea [id]="'ans' + a.id" [name]="'ans' + a.id" rows="2" [(ngModel)]="edits[a.id]"></textarea>
              <p class="muted small">{{ a.note }}@if (a.source.detail) { · Source: {{ a.source.detail }} }</p>
              <div class="actions">
                <button type="button" class="btn link danger" (click)="remove(a)" [disabled]="busy()">Remove</button>
                <span class="spacer"></span>
                <label class="check small"><input type="checkbox" [(ngModel)]="saveToProfile[a.id]" [name]="'stp' + a.id" /> Save to my answers</label>
                <button type="button" class="btn ghost" (click)="review(a)" [disabled]="busy() || !edits[a.id].trim()">Mark reviewed</button>
              </div>
            </li>
          }
        </ul>
      } @else {
        <p class="muted" role="status">Loading…</p>
      }
    </section>
  `,
})
export class PreparePanel {
  private readonly api = inject(ApiService);
  readonly applicationId = input.required<string>();
  readonly changed = output<PackageView>();
  readonly view = signal<PackageView | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly postingChecked = signal(false);
  applyUrl = '';
  questionsText = '';
  edits: Record<string, string> = {};
  saveToProfile: Record<string, boolean> = {};

  constructor() {
    effect(() => {
      const id = this.applicationId();
      void this.run(() => this.api.package(id));
    });
  }

  /** Re-fetch, e.g. after exporting a document elsewhere on the page. */
  refresh() {
    return this.run(() => this.api.package(this.applicationId()));
  }

  statusLabel(a: ScreeningAnswer) {
    return a.status === 'reviewed' ? 'Reviewed' : a.status === 'drafted' ? 'Drafted — review' : 'Needs your answer';
  }

  private async run(fn: () => Promise<PackageView>) {
    this.busy.set(true);
    this.error.set(null);
    try {
      const v = await fn();
      this.view.set(v);
      this.applyUrl = v.package.officialApplyUrl ?? '';
      this.postingChecked.set(v.checklist.find((i) => i.key === 'posting_checked')?.done ?? false);
      for (const a of v.package.answers) this.edits[a.id] ??= a.answer;
      this.changed.emit(v);
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Something went wrong.');
    } finally {
      this.busy.set(false);
    }
  }

  update(u: { eligibilityAcknowledged?: boolean; postingCheckedByUser?: boolean }) {
    return this.run(() => this.api.updatePackage(this.applicationId(), u));
  }
  saveUrl() {
    return this.run(() => this.api.updatePackage(this.applicationId(), { officialApplyUrl: this.applyUrl.trim() || null }));
  }
  addQuestions() {
    const qs = this.questionsText.split('\n').map((q) => q.trim()).filter(Boolean);
    this.questionsText = '';
    return this.run(() => this.api.addQuestions(this.applicationId(), qs));
  }
  review(a: ScreeningAnswer) {
    return this.run(() => this.api.updateAnswer(this.applicationId(), a.id, this.edits[a.id] ?? '', true, !!this.saveToProfile[a.id]));
  }
  remove(a: ScreeningAnswer) {
    return this.run(() => this.api.removeAnswer(this.applicationId(), a.id));
  }
}

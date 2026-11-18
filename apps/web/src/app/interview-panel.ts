import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { InterviewNote } from '@reboundops/contracts';
import { ApiProblem, ApiService } from './api.service';

type Outcome = InterviewNote['outcome'];
const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: 'pending', label: 'Not yet / pending' },
  { value: 'went_well', label: 'Went well' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'went_poorly', label: 'Went poorly' },
];

const blank = () => ({ stage: 'Interview', scheduledFor: '', interviewers: '', preparation: '', questionsToAsk: '', notes: '', outcome: 'pending' as Outcome });

/** Interview notes and preparation. Written by the person; kept on this computer. */
@Component({
  selector: 'app-interview-panel',
  imports: [FormsModule],
  template: `
    <section class="card stack" aria-labelledby="iv-heading">
      <h2 id="iv-heading">Interviews</h2>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      <ul class="criteria">
        @for (n of notes(); track n.id) {
          <li>
            <div class="criterion-head">
              <span>{{ n.stage }}@if (n.scheduledFor) { <span class="muted small"> · {{ n.scheduledFor.slice(0, 16).replace('T', ' ') }}</span> }</span>
              <span class="tag">{{ outcomeLabel(n.outcome) }}</span>
            </div>
            @if (n.interviewers) { <p class="small">With {{ n.interviewers }}</p> }
            @if (n.preparation) { <p class="small pre"><strong>Preparation:</strong> {{ n.preparation }}</p> }
            @if (n.questionsToAsk) { <p class="small pre"><strong>Questions to ask:</strong> {{ n.questionsToAsk }}</p> }
            @if (n.notes) { <p class="small pre"><strong>Notes:</strong> {{ n.notes }}</p> }
            <div class="actions">
              <button type="button" class="btn link" (click)="edit(n)">Edit</button>
              <button type="button" class="btn link danger" (click)="remove(n)" [attr.aria-label]="'Delete interview ' + n.stage">Delete</button>
            </div>
          </li>
        } @empty { <li class="muted">No interviews recorded.</li> }
      </ul>

      <form class="stack subcard" (ngSubmit)="save()" [attr.aria-label]="editing() ? 'Edit interview' : 'Add an interview'">
        <div class="grid two">
          <div class="field"><label for="iv-stage">Stage</label><input id="iv-stage" name="ivStage" [(ngModel)]="draft.stage" placeholder="Phone screen, technical, final…" /></div>
          <div class="field"><label for="iv-when">Date and time (optional)</label><input id="iv-when" name="ivWhen" type="datetime-local" [(ngModel)]="draft.scheduledFor" /></div>
          <div class="field"><label for="iv-who">Interviewers</label><input id="iv-who" name="ivWho" [(ngModel)]="draft.interviewers" /></div>
          <div class="field">
            <label for="iv-outcome">Outcome</label>
            <select id="iv-outcome" name="ivOutcome" [(ngModel)]="draft.outcome">@for (o of outcomes; track o.value) { <option [ngValue]="o.value">{{ o.label }}</option> }</select>
          </div>
        </div>
        <div class="field">
          <label for="iv-prep">Preparation</label>
          <textarea id="iv-prep" name="ivPrep" rows="4" [(ngModel)]="draft.preparation"></textarea>
          <div class="actions">
            <button type="button" class="btn link" (click)="suggest()">Suggest preparation from the posting</button>
          </div>
          @if (prompts().length) {
            <ul class="small hint" aria-label="Suggested preparation">@for (p of prompts(); track p) { <li>{{ p }}</li> }</ul>
            <button type="button" class="btn link" (click)="usePrompts()">Add these to my preparation</button>
          }
        </div>
        <div class="field"><label for="iv-q">Questions to ask</label><textarea id="iv-q" name="ivQ" rows="2" [(ngModel)]="draft.questionsToAsk"></textarea></div>
        <div class="field"><label for="iv-notes">Notes afterwards</label><textarea id="iv-notes" name="ivNotes" rows="3" [(ngModel)]="draft.notes"></textarea></div>
        <div class="actions">
          @if (editing()) { <button type="button" class="btn link" (click)="cancel()">Cancel</button> }
          <span class="spacer"></span>
          <button type="submit" class="btn ghost" [disabled]="busy() || !draft.stage.trim()">{{ editing() ? 'Save changes' : 'Add interview' }}</button>
        </div>
      </form>
    </section>
  `,
})
export class InterviewPanel {
  private readonly api = inject(ApiService);
  readonly applicationId = input.required<string>();
  readonly notes = signal<InterviewNote[]>([]);
  readonly prompts = signal<string[]>([]);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly editing = signal<string | null>(null);
  readonly outcomes = OUTCOMES;
  draft = blank();

  constructor() {
    effect(() => {
      const id = this.applicationId();
      void this.safe(async () => this.notes.set(await this.api.interviews(id)));
    });
  }

  outcomeLabel(o: Outcome) {
    return OUTCOMES.find((x) => x.value === o)?.label ?? o;
  }

  private async safe(fn: () => Promise<void>) {
    this.error.set(null);
    this.busy.set(true);
    try {
      await fn();
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Something went wrong.');
    } finally {
      this.busy.set(false);
    }
  }

  edit(n: InterviewNote) {
    this.editing.set(n.id);
    this.draft = { stage: n.stage, scheduledFor: n.scheduledFor ? n.scheduledFor.slice(0, 16) : '', interviewers: n.interviewers, preparation: n.preparation, questionsToAsk: n.questionsToAsk, notes: n.notes, outcome: n.outcome };
  }

  cancel() {
    this.editing.set(null);
    this.draft = blank();
  }

  save() {
    const body = { ...this.draft, stage: this.draft.stage.trim(), scheduledFor: this.draft.scheduledFor ? new Date(this.draft.scheduledFor).toISOString() : null };
    return this.safe(async () => {
      const id = this.editing();
      const saved = await this.api.saveInterview(this.applicationId(), body, id ?? undefined);
      this.notes.update((l) => (id ? l.map((x) => (x.id === id ? saved : x)) : [saved, ...l]));
      this.cancel();
    });
  }

  remove(n: InterviewNote) {
    if (!confirm(`Delete the notes for “${n.stage}”?`)) return Promise.resolve();
    return this.safe(async () => {
      await this.api.deleteInterview(this.applicationId(), n.id);
      this.notes.update((l) => l.filter((x) => x.id !== n.id));
    });
  }

  suggest() {
    return this.safe(async () => this.prompts.set((await this.api.interviewPrep(this.applicationId())).prompts));
  }

  usePrompts() {
    const add = this.prompts().map((p) => `- ${p}`).join('\n');
    this.draft.preparation = [this.draft.preparation.trim(), add].filter(Boolean).join('\n');
    this.prompts.set([]);
  }
}

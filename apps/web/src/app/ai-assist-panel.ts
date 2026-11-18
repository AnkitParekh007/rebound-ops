import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { AiSettingsView, AssistResult, AssistTask } from '@reboundops/contracts';
import { ApiProblem, ApiService } from './api.service';

const TASKS: { value: AssistTask; label: string; needsInput: string | null }[] = [
  { value: 'summarize_job', label: 'Summarise the posting', needsInput: null },
  { value: 'missing_skills', label: 'Find required skills missing from my profile', needsInput: null },
  { value: 'tailoring', label: 'Suggest how to tailor my resume', needsInput: null },
  { value: 'screening_answer', label: 'Draft a screening answer', needsInput: 'Screening question' },
  { value: 'cover_letter', label: 'Improve my cover letter', needsInput: 'Cover letter text' },
  { value: 'interview_prep', label: 'Interview questions to prepare', needsInput: null },
  { value: 'follow_up', label: 'Draft a follow-up message', needsInput: 'Anything to mention (optional)' },
];

/**
 * Optional AI help for one application. Suggestions are checked against your
 * records and shown for review; nothing is saved or sent on your behalf.
 */
@Component({
  selector: 'app-ai-assist-panel',
  imports: [FormsModule],
  template: `
    @if (ai(); as v) {
      @if (v.active) {
        <section class="card stack" aria-labelledby="assist-heading">
          <h2 id="assist-heading">AI assistance <span class="muted small">· {{ v.settings.provider }}{{ local() ? ' (on this computer)' : ' (cloud)' }}</span></h2>
          <p class="hint">Suggestions only. Each is checked against your records, and any that add facts are withheld. Copy what you want to keep.</p>
          <div class="grid two">
            <div class="field">
              <label for="assist-task">What do you need?</label>
              <select id="assist-task" name="assistTask" [(ngModel)]="task">@for (t of tasks; track t.value) { <option [ngValue]="t.value">{{ t.label }}</option> }</select>
            </div>
            @if (inputLabel(); as l) {
              <div class="field"><label for="assist-input">{{ l }}</label><textarea id="assist-input" name="assistInput" rows="4" [(ngModel)]="text"></textarea></div>
            }
          </div>
          @if (!local()) {
            <label class="check"><input type="checkbox" name="assistConfirm" [(ngModel)]="confirmSend" /> Send this application’s details to {{ v.settings.provider }} for this request</label>
          }
          @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
          <div class="actions"><span class="spacer"></span><button type="button" class="btn ghost" (click)="run()" [disabled]="busy() || (!local() && !confirmSend)">Ask</button></div>
          @if (busy()) { <p class="muted" role="status">Waiting for the model…</p> }
          @if (result(); as r) {
            <div class="subcard stack" role="status" aria-live="polite">
              @if (r.accepted && (r.text || r.items.length)) {
                @if (r.items.length) { <ul>@for (i of r.items; track i) { <li>{{ i }}</li> }</ul> } @else { <p class="pre">{{ r.text }}</p> }
                <div class="actions"><span class="muted small">Sent: {{ r.sent.join('; ') }}.</span><span class="spacer"></span><button type="button" class="btn link" (click)="copy(r)">Copy</button></div>
              } @else {
                <p><strong>No suggestion shown.</strong> The model’s answer added details that are not in your records.</p>
              }
              @if (r.problems.length) { <ul class="small muted">@for (p of r.problems; track p) { <li>{{ p }}</li> }</ul> }
              @if (r.baseline.length) {
                <p class="small"><strong>Without AI (from your records):</strong></p>
                <ul class="small">@for (b of r.baseline; track b) { <li>{{ b }}</li> }</ul>
              }
              @if (copied()) { <p class="muted small">Copied.</p> }
            </div>
          }
        </section>
      }
    }
  `,
})
export class AiAssistPanel {
  private readonly api = inject(ApiService);
  readonly applicationId = input.required<string>();
  readonly ai = signal<AiSettingsView | null>(null);
  readonly result = signal<AssistResult | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly copied = signal(false);
  readonly tasks = TASKS;
  task: AssistTask = 'summarize_job';
  text = '';
  confirmSend = false;

  constructor() {
    this.api.aiSettings().then(
      (v) => this.ai.set(v),
      () => this.ai.set(null),
    );
  }

  local(): boolean {
    const v = this.ai();
    return !!v && !!v.providers.find((p) => p.id === v.settings.provider)?.local;
  }

  inputLabel(): string | null {
    return TASKS.find((t) => t.value === this.task)?.needsInput ?? null;
  }

  async run() {
    this.busy.set(true);
    this.error.set(null);
    this.result.set(null);
    try {
      this.result.set(await this.api.assist(this.applicationId(), { task: this.task, ...(this.text.trim() && this.inputLabel() ? { input: this.text } : {}), confirmSend: this.confirmSend }));
      this.confirmSend = false;
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'The AI request failed. Everything else still works without it.');
    } finally {
      this.busy.set(false);
    }
  }

  async copy(r: AssistResult) {
    try {
      await navigator.clipboard.writeText(r.items.length ? r.items.map((i) => `- ${i}`).join('\n') : r.text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    } catch {
      this.error.set('Copy failed — select the text and copy it manually.');
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FollowUpTemplate } from '@reboundops/contracts';
import { ApiProblem, ApiService } from './api.service';

type Draft = { id?: string; name: string; subject: string; body: string };

/** The person's own follow-up templates. Placeholders are filled only from saved records. */
@Component({
  selector: 'app-templates-panel',
  imports: [FormsModule],
  template: `
    <section class="card stack" aria-labelledby="tpl-heading">
      <h2 id="tpl-heading">Follow-up templates</h2>
      <p class="hint">Write messages you send often. Use <code>{{ '{' }}role{{ '}' }}</code>, <code>{{ '{' }}employer{{ '}' }}</code>, <code>{{ '{' }}contactFirstName{{ '}' }}</code>, <code>{{ '{' }}yourName{{ '}' }}</code> and <code>{{ '{' }}appliedDate{{ '}' }}</code>; anything not saved for an application is left as a [[marker]] for you to fill.</p>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @for (t of list(); track $index; let i = $index) {
        <div class="subcard stack" role="group" [attr.aria-label]="'Template ' + (i + 1)">
          <div class="grid two">
            <div class="field"><label [for]="'tn' + i">Name</label><input [id]="'tn' + i" [name]="'tn' + i" [(ngModel)]="t.name" /></div>
            <div class="field"><label [for]="'ts' + i">Subject</label><input [id]="'ts' + i" [name]="'ts' + i" [(ngModel)]="t.subject" /></div>
          </div>
          <div class="field"><label [for]="'tb' + i">Message</label><textarea [id]="'tb' + i" [name]="'tb' + i" rows="5" [(ngModel)]="t.body"></textarea></div>
          <div class="actions"><span class="spacer"></span><button type="button" class="btn link danger" (click)="removeAt(i)">Remove template</button></div>
        </div>
      } @empty { <p class="muted">No templates yet.</p> }
      <div class="actions">
        <button type="button" class="btn link" (click)="add()" [disabled]="list().length >= 30">Add a template</button>
        <span class="spacer"></span>
        @if (saved()) { <span class="muted small" role="status">Saved.</span> }
        <button type="button" class="btn" (click)="save()" [disabled]="busy()">Save templates</button>
      </div>
    </section>
  `,
})
export class TemplatesPanel {
  private readonly api = inject(ApiService);
  readonly list = signal<Draft[]>([]);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly saved = signal(false);

  constructor() {
    this.api.followUpTemplates().then(
      (l) => this.list.set(l.map((t) => ({ ...t }))),
      (e) => this.error.set(e instanceof ApiProblem ? e.message : 'Could not load templates.'),
    );
  }

  add() {
    this.list.update((l) => [...l, { name: 'Check-in', subject: 'Following up: {role}', body: 'Hello {contactFirstName},\n\nI applied for the {role} role at {employer} on {appliedDate} and wanted to ask about next steps.\n\nThank you,\n{yourName}' }]);
    this.saved.set(false);
  }

  removeAt(i: number) {
    this.list.update((l) => l.filter((_, j) => j !== i));
    this.saved.set(false);
  }

  async save() {
    this.busy.set(true);
    this.error.set(null);
    try {
      const out: FollowUpTemplate[] = await this.api.saveFollowUpTemplates(this.list().map((t) => ({ ...t, name: t.name.trim(), subject: t.subject.trim() })) as FollowUpTemplate[]);
      this.list.set(out.map((t) => ({ ...t })));
      this.saved.set(true);
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not save templates. Each needs a name, subject and message.');
    } finally {
      this.busy.set(false);
    }
  }
}

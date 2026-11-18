import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { DocumentKind, DocumentsBundle, ExportFormat, ResumeDraft } from '@reboundops/contracts';
import { ApiProblem, ApiService } from './api.service';

/** Tailored resume and cover-letter drafts: generate, edit, and export with content checks. */
@Component({
  selector: 'app-documents-panel',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="card stack" aria-labelledby="docs-heading">
      <div class="row">
        <h2 id="docs-heading">Tailored documents</h2>
        <span class="spacer"></span>
        @if (bundle()?.resume) {
          <button type="button" class="btn link" (click)="generate(true)" [disabled]="busy()">Regenerate from profile</button>
        }
      </div>

      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (status()) { <p class="muted" role="status">{{ status() }}</p> }

      @if (!bundle()) {
        <p class="muted" role="status">Loading…</p>
      } @else if (!resume()) {
        <p>Drafts are built only from the facts you've marked verified in your <a routerLink="/profile">profile</a>. Highlights are selected and ordered for this job, never rewritten.</p>
        <div><button type="button" class="btn primary" (click)="generate(false)" [disabled]="busy()">Generate drafts</button></div>
      } @else {
        @let r = resume()!;
        @if (bundle()!.profileChangedSinceDraft) {
          <p class="notice">Your profile changed after these drafts were made. Regenerate to pick up the changes.</p>
        }
        @if (r.warnings.length) {
          <ul class="warnings">@for (w of r.warnings; track w) { <li>{{ w }}</li> }</ul>
        }

        <details open>
          <summary>Resume</summary>
          <div class="stack">
            <div class="field">
              <label for="sum">Summary</label>
              <textarea id="sum" name="sum" rows="3" [(ngModel)]="summary"></textarea>
              @if (summary !== r.header.headline) { <p class="provenance"><span class="tag you">Edited</span> Profile headline: <q>{{ r.header.headline || '(empty)' }}</q></p> }
            </div>

            @for (e of r.experience; track e.factId) {
              <fieldset class="subcard">
                <legend><label class="check"><input type="checkbox" [(ngModel)]="e.include" [name]="'inc' + e.factId" /> {{ e.title }} — {{ e.employer }}</label></legend>
                <p class="muted small">{{ e.start }} – {{ e.end ?? 'present' }} · dates and employer come from your profile and can't be changed here</p>
                @for (h of e.highlights; track h.id) {
                  <div class="highlight-row">
                    <input type="checkbox" [(ngModel)]="h.include" [name]="'hi' + h.id" [attr.aria-label]="'Include highlight: ' + h.originalText" />
                    <input class="grow" [(ngModel)]="h.text" [name]="'ht' + h.id" [attr.aria-label]="'Highlight text'" />
                    @if (h.text !== h.originalText) {
                      <button type="button" class="btn link" (click)="h.text = h.originalText" [attr.aria-label]="'Revert to: ' + h.originalText">Revert</button>
                    } @else if (h.relevance > 0) {
                      <span class="tag found" title="Mentions terms from the posting">Relevant</span>
                    }
                  </div>
                }
              </fieldset>
            }

            <div class="field">
              <span class="label" id="skills-label">Skills</span>
              <div class="chip-row" role="group" aria-labelledby="skills-label">
                @for (s of r.skills; track s.name) {
                  <label class="check chip-check" [class.matched]="s.matched"><input type="checkbox" [(ngModel)]="s.include" [name]="'sk' + s.name" /> {{ s.name }}</label>
                }
              </div>
              <p class="hint">Highlighted skills appear in the posting.</p>
            </div>

            <div class="actions">
              <button type="button" class="btn ghost" (click)="saveResume()" [disabled]="busy()">Save resume edits</button>
              <span class="spacer"></span>
              <button type="button" class="btn ghost" (click)="download('resume', 'pdf')" [disabled]="busy()">Download PDF</button>
              <button type="button" class="btn ghost" (click)="download('resume', 'docx')" [disabled]="busy()">Download DOCX</button>
            </div>
          </div>
        </details>

        <details open>
          <summary>Cover letter</summary>
          <div class="stack">
            <div class="field">
              <label for="letter">Cover letter</label>
              <textarea id="letter" name="letter" rows="16" [(ngModel)]="letter" aria-describedby="letter-hint"></textarea>
              <p class="hint" id="letter-hint">
                @if (placeholders() > 0) { <strong>{{ placeholders() }} [[placeholder]]{{ placeholders() === 1 ? '' : 's' }} left to fill.</strong> }
                Sentences come from your verified facts and the posting. Add anything else in your own words.
              </p>
            </div>
            <div class="actions">
              <button type="button" class="btn ghost" (click)="saveLetter()" [disabled]="busy()">Save letter</button>
              <span class="spacer"></span>
              <button type="button" class="btn ghost" (click)="download('cover_letter', 'pdf')" [disabled]="busy() || placeholders() > 0">Download PDF</button>
              <button type="button" class="btn ghost" (click)="download('cover_letter', 'docx')" [disabled]="busy() || placeholders() > 0">Download DOCX</button>
            </div>
          </div>
        </details>
      }
    </section>
  `,
})
export class DocumentsPanel {
  private readonly api = inject(ApiService);
  readonly applicationId = input.required<string>();
  readonly bundle = signal<DocumentsBundle | null>(null);
  readonly resume = signal<ResumeDraft | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly status = signal('');
  private readonly letterText = signal('');
  readonly placeholders = computed(() => (this.letterText().match(/\[\[[^\]]*\]\]/g) ?? []).length);
  summary = '';

  get letter() {
    return this.letterText();
  }
  set letter(v: string) {
    this.letterText.set(v);
  }

  constructor() {
    effect(() => {
      const id = this.applicationId();
      void this.run(() => this.api.documents(id));
    });
  }

  private apply(b: DocumentsBundle) {
    this.bundle.set(b);
    this.resume.set(b.resume ? structuredClone(b.resume) : null);
    this.summary = b.resume?.summary.text ?? '';
    this.letterText.set(b.coverLetter?.text ?? '');
  }

  private async run(fn: () => Promise<DocumentsBundle>, done = '') {
    this.busy.set(true);
    this.error.set(null);
    this.status.set('');
    try {
      this.apply(await fn());
      this.status.set(done);
      return true;
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Something went wrong.');
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  async generate(overwrite: boolean) {
    if (overwrite && this.isEdited() && !globalThis.confirm('Regenerating replaces your edits to these drafts. Continue?')) return;
    await this.run(() => this.api.generateDocuments(this.applicationId(), overwrite || this.isEdited()), 'Drafts generated.');
  }

  private isEdited() {
    const b = this.bundle();
    return !!b && ((!!b.resume && b.resume.updatedAt !== b.resume.generatedAt) || !!b.coverLetter?.edited);
  }

  saveResume() {
    const r = this.resume();
    if (!r) return;
    return this.run(
      () =>
        this.api.updateResumeDraft(this.applicationId(), {
          summary: this.summary,
          experience: r.experience.map((e) => ({ factId: e.factId, include: e.include, highlights: e.highlights.map((h) => ({ id: h.id, text: h.text, include: h.include })) })),
          skills: r.skills.map((s) => ({ name: s.name, include: s.include })),
        }),
      'Resume edits saved.',
    );
  }

  saveLetter() {
    return this.run(() => this.api.updateCoverLetter(this.applicationId(), this.letter), 'Letter saved.');
  }

  async download(kind: DocumentKind, format: ExportFormat) {
    // Save first so the export reflects what is on screen.
    const saved = kind === 'resume' ? await this.saveResume() : await this.saveLetter();
    if (saved === false) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const { blob, filename } = await this.api.exportDocument(this.applicationId(), kind, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.status.set(`${filename} downloaded — content check passed.`);
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? `Export blocked: ${e.message}` : 'Export failed.');
    } finally {
      this.busy.set(false);
    }
  }
}

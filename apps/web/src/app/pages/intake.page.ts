import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { ExtractedField, FieldProvenance, JobExtraction, WorkArrangement } from '@reboundops/contracts';
import { ApiProblem, ApiService } from '../api.service';

type FieldKey = 'title' | 'employer' | 'location' | 'salary';

interface FieldDraft {
  key: FieldKey;
  label: string;
  required: boolean;
  value: string;
  found: ExtractedField | null;
}

@Component({
  selector: 'app-intake-page',
  imports: [FormsModule],
  template: `
    <section class="page" aria-labelledby="intake-heading">
      <header class="page-head">
        <div>
          <p class="eyebrow">Add a job</p>
          <h1 id="intake-heading">Capture a posting</h1>
          <p class="lede">Paste the job description and, if you have it, the link to the official posting. Nothing is fetched from the web — details are read from the text you paste.</p>
        </div>
      </header>

      <form class="card stack" (ngSubmit)="extract()">
        <div class="field">
          <label for="url">Job posting URL (optional)</label>
          <input id="url" name="url" type="url" inputmode="url" [(ngModel)]="url" placeholder="https://" />
        </div>
        <div class="field">
          <label for="desc">Job description</label>
          <textarea id="desc" name="desc" rows="12" [(ngModel)]="description" aria-describedby="desc-hint"></textarea>
          <p class="hint" id="desc-hint">Treated as plain text. Instructions inside a posting are never followed.</p>
        </div>
        @if (error() && !draft()) { <p class="error" role="alert">{{ error() }}</p> }
        <div class="actions">
          <span class="spacer"></span>
          <button type="submit" class="btn primary" [disabled]="busy()">Read details</button>
        </div>
      </form>

      @if (draft(); as d) {
        <form class="card stack review" (ngSubmit)="save()" aria-labelledby="review-heading">
          <h2 id="review-heading">Review before saving</h2>
          <p class="badge warn"><span aria-hidden="true">●</span> Unverified — not checked against the live posting</p>

          @for (f of fields(); track f.key) {
            <div class="field">
              <label [for]="'f-' + f.key">{{ f.label }}@if (f.required) { <span aria-hidden="true"> *</span> }</label>
              <input [id]="'f-' + f.key" [name]="f.key" [(ngModel)]="f.value" [required]="f.required" [attr.aria-describedby]="'p-' + f.key" />
              <p class="provenance" [id]="'p-' + f.key">
                @switch (originOf(f)) {
                  @case ('extracted') { <span class="tag found">From the text</span> <q>{{ f.found!.evidence }}</q> }
                  @case ('user') { <span class="tag you">Entered by you</span> }
                  @default { <span class="tag none">Not found</span> {{ f.key === 'salary' ? 'No explicit amount in the text — left blank.' : 'Please enter it if you know it.' }} }
                }
              </p>
            </div>
          }

          <div class="field">
            <label for="f-arr">Work arrangement</label>
            <select id="f-arr" name="arr" [(ngModel)]="arrangement">
              <option [ngValue]="null">Not stated</option>
              <option ngValue="remote">Remote</option>
              <option ngValue="hybrid">Hybrid</option>
              <option ngValue="onsite">On-site</option>
            </select>
            @if (d.workArrangement) { <p class="provenance"><span class="tag found">From the text</span> <q>{{ d.workArrangement.evidence }}</q></p> }
          </div>

          @if (d.warnings.length) {
            <ul class="warnings" aria-label="Notes about this extraction">
              @for (w of d.warnings; track w) { <li>{{ w }}</li> }
            </ul>
          }

          @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
          <div class="actions">
            <button type="button" class="btn ghost" (click)="draft.set(null)">Start over</button>
            <span class="spacer"></span>
            @if (duplicateOf()) {
              <button type="button" class="btn ghost" (click)="save(true)" [disabled]="busy()">Save anyway</button>
            }
            <button type="submit" class="btn primary" [disabled]="busy()">Save to tracker</button>
          </div>
        </form>
      }
    </section>
  `,
})
export class IntakePage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly draft = signal<JobExtraction | null>(null);
  readonly fields = signal<FieldDraft[]>([]);
  readonly duplicateOf = signal<string[] | null>(null);

  url = '';
  description = '';
  arrangement: WorkArrangement | null = null;

  originOf(f: FieldDraft): FieldProvenance['origin'] | 'none' {
    const v = f.value.trim();
    if (!v) return 'none';
    return f.found && v === f.found.value ? 'extracted' : 'user';
  }

  async extract() {
    this.error.set(null);
    this.duplicateOf.set(null);
    const sourceUrl = this.url.trim() || null;
    if (!this.description.trim() && !sourceUrl) {
      this.error.set('Paste a job description or a URL first.');
      return;
    }
    this.busy.set(true);
    try {
      const d = await this.api.extractJob(this.description, sourceUrl);
      this.draft.set(d);
      this.arrangement = d.workArrangement?.value ?? null;
      this.fields.set([
        { key: 'title', label: 'Job title', required: true, value: d.title?.value ?? '', found: d.title },
        { key: 'employer', label: 'Employer', required: true, value: d.employer?.value ?? '', found: d.employer },
        { key: 'location', label: 'Location', required: false, value: d.location?.value ?? '', found: d.location },
        { key: 'salary', label: 'Salary', required: false, value: d.salary?.value ?? '', found: d.salary },
      ]);
      queueMicrotask(() => document.getElementById('review-heading')?.scrollIntoView({ block: 'start' }));
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not read the description.');
    } finally {
      this.busy.set(false);
    }
  }

  private provenance(f: FieldDraft): FieldProvenance | null {
    const origin = this.originOf(f);
    if (origin === 'none') return null;
    return origin === 'extracted' ? { origin, evidence: f.found!.evidence } : { origin, evidence: null };
  }

  async save(allowDuplicate = false) {
    const d = this.draft();
    if (!d) return;
    const byKey = Object.fromEntries(this.fields().map((f) => [f.key, f])) as Record<FieldKey, FieldDraft>;
    if (!byKey.title.value.trim() || !byKey.employer.value.trim()) {
      this.error.set('Job title and employer are required.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.api.createJob({
        title: byKey.title.value.trim(),
        employer: byKey.employer.value.trim(),
        location: byKey.location.value.trim() || null,
        salary: byKey.salary.value.trim() || null,
        workArrangement: this.arrangement,
        sourceUrl: d.sourceUrl,
        description: d.description,
        provenance: {
          title: this.provenance(byKey.title)!,
          employer: this.provenance(byKey.employer)!,
          location: this.provenance(byKey.location),
          salary: this.provenance(byKey.salary),
        },
        allowDuplicate,
      });
      await this.router.navigate(['/tracker', result.application.id]);
    } catch (e) {
      if (e instanceof ApiProblem && e.code === 'duplicate_job') {
        this.duplicateOf.set((e.details as { existingJobIds: string[] }).existingJobIds);
        this.error.set('This looks like a job you already saved. Save anyway to keep both.');
      } else {
        this.error.set(e instanceof ApiProblem ? e.message : 'Could not save the job.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}

import { Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { ApplicationStatus, ApplicationView, PackageView } from '@reboundops/contracts';
import { ApiProblem, ApiService } from '../api.service';
import { AssessmentPanel } from '../assessment-panel';
import { DocumentsPanel } from '../documents-panel';
import { PreparePanel } from '../prepare-panel';
import { TrackingPanel } from '../tracking-panel';
import { STATUS_LABEL } from '../labels';

@Component({
  selector: 'app-application-page',
  imports: [FormsModule, RouterLink, AssessmentPanel, DocumentsPanel, PreparePanel, TrackingPanel],
  template: `
    <section class="page" aria-labelledby="app-heading">
      <p><a routerLink="/tracker" class="back-link">← All applications</a></p>

      @if (error() && !app()) {
        <p class="error" role="alert">{{ error() }}</p>
      } @else if (app(); as a) {
        <header class="page-head">
          <div>
            <p class="eyebrow">{{ a.job.employer }}</p>
            <h1 id="app-heading">{{ a.job.title }}</h1>
            <p class="meta">
              @if (a.job.location) { <span>{{ a.job.location }}</span> }
              @if (a.job.workArrangement) { <span>{{ a.job.workArrangement }}</span> }
              @if (a.job.salary) { <span>{{ a.job.salary }}</span> }
            </p>
          </div>
          <span class="status large" [attr.data-status]="a.status">{{ labels[a.status] }}</span>
        </header>

        <div class="grid detail">
          <div class="stack">
            <section class="card" aria-labelledby="move-heading">
              <h2 id="move-heading">Move to</h2>
              @if (a.allowedNext.length) {
                <div class="chip-row">
                  @for (s of a.allowedNext; track s) {
                    <button type="button" class="chip" [attr.data-status]="s" (click)="move(s)" [disabled]="busy()">{{ labels[s] }}</button>
                  }
                </div>
              }
              @if (a.appliedConfirmedAt) {
                <p class="muted small">You confirmed submission on {{ a.appliedConfirmedAt.slice(0, 10) }}.</p>
              }
              @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
            </section>

            <app-assessment-panel [applicationId]="a.id" />
            <app-documents-panel [applicationId]="a.id" (exported)="prepare()?.refresh()" />
            <app-prepare-panel [applicationId]="a.id" (changed)="pkg.set($event)" />

            <section class="card" aria-labelledby="source-heading">
              <h2 id="source-heading">Posting</h2>
              <p class="badge warn"><span aria-hidden="true">●</span> {{ a.job.verification.status === 'verified' ? 'Verified' : 'Unverified' }} — {{ a.job.verification.note }}</p>
              @if (editing()) {
                <form class="stack subcard" (ngSubmit)="saveJob()" aria-label="Edit job details">
                  <div class="grid two">
                    <div class="field"><label for="ej-title">Job title</label><input id="ej-title" name="ejTitle" [(ngModel)]="jobEdit.title" required /></div>
                    <div class="field"><label for="ej-emp">Employer</label><input id="ej-emp" name="ejEmp" [(ngModel)]="jobEdit.employer" required /></div>
                    <div class="field"><label for="ej-loc">Location</label><input id="ej-loc" name="ejLoc" [(ngModel)]="jobEdit.location" /></div>
                    <div class="field"><label for="ej-sal">Salary</label><input id="ej-sal" name="ejSal" [(ngModel)]="jobEdit.salary" /></div>
                    <div class="field"><label for="ej-url">Posting URL</label><input id="ej-url" name="ejUrl" type="url" [(ngModel)]="jobEdit.sourceUrl" /></div>
                  </div>
                  <p class="hint">Edited fields are labelled as entered by you.</p>
                  <div class="actions"><button type="button" class="btn ghost" (click)="editing.set(false)">Cancel</button><span class="spacer"></span><button type="submit" class="btn primary" [disabled]="busy()">Save details</button></div>
                </form>
              } @else {
                <p><button type="button" class="btn link" (click)="startEdit(a)">Edit job details</button></p>
              }
              @if (a.job.sourceUrl) {
                <p><a [href]="a.job.sourceUrl" target="_blank" rel="noopener noreferrer external">Open the official posting ↗</a></p>
              } @else {
                <p class="muted">No official link saved.</p>
              }
              <details>
                <summary>Description</summary>
                <pre class="description">{{ a.job.description || 'No description saved.' }}</pre>
              </details>
            </section>
          </div>

          <div class="stack">
          <app-tracking-panel [applicationId]="a.id" />
          <section class="card" aria-labelledby="activity-heading">
            <h2 id="activity-heading">Activity</h2>
            <form class="stack" (ngSubmit)="addNote()">
              <div class="field">
                <label for="note">Add a note</label>
                <textarea id="note" name="note" rows="3" [(ngModel)]="note" placeholder="Recruiter call, referral, interview prep…"></textarea>
              </div>
              <div class="actions"><span class="spacer"></span><button type="submit" class="btn ghost" [disabled]="busy() || !note.trim()">Add note</button></div>
            </form>
            <ol class="timeline">
              @for (e of a.activity; track e.id) {
                <li>
                  <time [attr.datetime]="e.at">{{ e.at.slice(0, 16).replace('T', ' ') }}</time>
                  @switch (e.kind) {
                    @case ('status_changed') { <strong>{{ labels[e.from!] }} → {{ labels[e.to!] }}</strong> }
                    @case ('created') { <strong>Saved as {{ labels[e.to!] }}</strong> }
                    @default { <strong>Note</strong> }
                  }
                  @if (e.note) { <p>{{ e.note }}</p> }
                </li>
              }
            </ol>
          </section>
          <section class="card stack" aria-labelledby="danger-heading">
            <h2 id="danger-heading">Delete</h2>
            <p class="muted small">Permanently removes this job, its application, drafts, notes, contacts and reminders. This cannot be undone; export your data first if you may need it.</p>
            <div><button type="button" class="btn ghost danger" (click)="remove(a)" [disabled]="busy()">Delete this application</button></div>
          </section>
          </div>
        </div>

        <dialog #confirm class="dialog" aria-labelledby="confirm-heading" (close)="onDialogClose()">
          <form method="dialog" class="stack">
            <h2 id="confirm-heading">Confirm you applied</h2>
            <p>ReboundOps never submits applications. Only mark this as applied if you submitted it yourself on the employer's site.</p>
            @if (openItems().length) {
              <div class="notice">
                <p><strong>Not finished in your checklist:</strong></p>
                <ul>@for (i of openItems(); track i.key) { <li>{{ i.label }}</li> }</ul>
              </div>
            }
            <label class="check"><input type="checkbox" name="ack" [(ngModel)]="acknowledged" /> I submitted this application myself</label>
            <div class="actions">
              <button value="cancel" class="btn ghost">Cancel</button>
              <span class="spacer"></span>
              <button value="confirm" class="btn primary" [disabled]="!acknowledged">Mark as applied</button>
            </div>
          </form>
        </dialog>
      } @else {
        <p class="muted" role="status">Loading…</p>
      }
    </section>
  `,
})
export class ApplicationPage {
  private readonly api = inject(ApiService);
  private readonly confirmDialog = viewChild<ElementRef<HTMLDialogElement>>('confirm');

  readonly id = input.required<string>();
  readonly prepare = viewChild(PreparePanel);
  readonly tracking = viewChild(TrackingPanel);
  readonly pkg = signal<PackageView | null>(null);
  readonly openItems = computed(() => (this.pkg()?.checklist ?? []).filter((i) => !i.done && !i.optional));
  readonly labels = STATUS_LABEL;
  readonly app = signal<ApplicationView | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  note = '';
  acknowledged = false;
  private readonly router = inject(Router);
  readonly editing = signal(false);
  jobEdit = { title: '', employer: '', location: '', salary: '', sourceUrl: '' };

  startEdit(a: ApplicationView) {
    this.jobEdit = { title: a.job.title, employer: a.job.employer, location: a.job.location ?? '', salary: a.job.salary ?? '', sourceUrl: a.job.sourceUrl ?? '' };
    this.editing.set(true);
  }

  async saveJob() {
    const a = this.app();
    if (!a) return;
    const e = this.jobEdit;
    const ok = await this.run(async () => {
      await this.api.updateJob(a.jobId, { title: e.title.trim(), employer: e.employer.trim(), location: e.location.trim() || null, salary: e.salary.trim() || null, sourceUrl: e.sourceUrl.trim() || null });
      return this.api.application(a.id);
    });
    if (ok) this.editing.set(false);
  }

  async remove(a: ApplicationView) {
    if (!globalThis.confirm(`Permanently delete "${a.job.title}" at ${a.job.employer} and everything attached to it? This cannot be undone.`)) return;
    this.busy.set(true);
    try {
      await this.api.deleteApplication(a.id);
      await this.router.navigateByUrl('/tracker');
    } catch (err) {
      this.error.set(err instanceof ApiProblem ? err.message : 'Could not delete.');
    } finally {
      this.busy.set(false);
    }
  }

  constructor() {
    effect(() => {
      const id = this.id();
      void this.load(id);
    });
  }

  private async load(id: string) {
    try {
      this.app.set(await this.api.application(id));
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not load this application.');
    }
  }

  async move(to: ApplicationStatus) {
    if (to === 'applied') {
      this.acknowledged = false;
      this.confirmDialog()?.nativeElement.showModal();
      return;
    }
    await this.run(() => this.api.transition(this.id(), to));
  }

  async onDialogClose() {
    const dialog = this.confirmDialog()?.nativeElement;
    if (dialog?.returnValue === 'confirm' && this.acknowledged) {
      await this.run(() => this.api.transition(this.id(), 'applied', true));
      await this.prepare()?.refresh();
      await this.tracking()?.refresh();
    }
  }

  async addNote() {
    const text = this.note.trim();
    if (!text) return;
    if (await this.run(() => this.api.addNote(this.id(), text))) this.note = '';
  }

  private async run(fn: () => Promise<ApplicationView>): Promise<boolean> {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.app.set(await fn());
      return true;
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not update this application.');
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}

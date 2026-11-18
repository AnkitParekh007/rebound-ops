import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { ApplicationStatus, ApplicationView, AssessmentSummary } from '@reboundops/contracts';
import { ApiProblem, ApiService } from '../api.service';
import { STATUS_LABEL, STATUS_ORDER } from '../labels';
import { ELIGIBILITY_LABEL } from '../assessment-panel';

@Component({
  selector: 'app-tracker-page',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page" aria-labelledby="tracker-heading">
      <header class="page-head">
        <div>
          <p class="eyebrow">Tracker</p>
          <h1 id="tracker-heading">Applications</h1>
        </div>
        <a class="btn primary" routerLink="/jobs/new">Add a job</a>
      </header>

      <div class="toolbar" role="search">
        <div class="field compact">
          <label for="q">Search</label>
          <input id="q" name="q" type="search" [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Title or employer" />
        </div>
        <div class="field compact">
          <label for="sort">Sort by</label>
          <select id="sort" name="sort" [ngModel]="sort()" (ngModelChange)="sort.set($event)">
            <option ngValue="updated">Recently updated</option>
            <option ngValue="fit">Fit score</option>
            <option ngValue="employer">Employer</option>
          </select>
        </div>
        <div class="field compact">
          <label for="status">Status</label>
          <select id="status" name="status" [ngModel]="filter()" (ngModelChange)="filter.set($event)">
            <option ngValue="all">All statuses</option>
            <option ngValue="active">Active only</option>
            @for (s of order; track s) { <option [ngValue]="s">{{ labels[s] }}</option> }
          </select>
        </div>
      </div>

      @if (loading()) {
        <p class="muted" role="status">Loading applications…</p>
      } @else if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      } @else if (!apps().length) {
        <div class="empty card">
          <h2>Nothing tracked yet</h2>
          <p>Add a job you're considering and it will appear here as <strong>Discovered</strong>.</p>
          <a class="btn primary" routerLink="/jobs/new">Add your first job</a>
        </div>
      } @else {
        <p class="muted" role="status">{{ visible().length }} of {{ apps().length }} shown</p>
        <ul class="app-list">
          @for (a of visible(); track a.id) {
            <li class="card app-row">
              <div class="app-main">
                <a class="app-title" [routerLink]="['/tracker', a.id]">{{ a.job.title }}</a>
                <span class="app-employer">{{ a.job.employer }}@if (a.job.location) { · {{ a.job.location }} }</span>
              </div>
              <span class="fit-cell">
                @if (fit()[a.id]; as f) {
                  <span class="fit-pill" [attr.aria-label]="f.overall === null ? 'Fit not scored' : 'Fit ' + f.overall + ' out of 5'">{{ f.overall ?? '—' }}<span class="muted">/5</span></span>
                  <span class="eligibility small" [attr.data-eligibility]="f.eligibility">{{ eligibilityLabel[f.eligibility] }}</span>
                }
              </span>
              <span class="status" [attr.data-status]="a.status">{{ labels[a.status] }}</span>
              <time class="muted small" [attr.datetime]="a.updatedAt">Updated {{ a.updatedAt.slice(0, 10) }}</time>
            </li>
          } @empty {
            <li class="muted">No applications match these filters.</li>
          }
        </ul>
      }
    </section>
  `,
})
export class TrackerPage {
  private readonly api = inject(ApiService);

  readonly labels = STATUS_LABEL;
  readonly eligibilityLabel = ELIGIBILITY_LABEL;
  readonly fit = signal<Record<string, AssessmentSummary>>({});
  readonly order = STATUS_ORDER;
  readonly apps = signal<ApplicationView[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly filter = signal<ApplicationStatus | 'all' | 'active'>('all');
  readonly sort = signal<'updated' | 'fit' | 'employer'>('updated');

  readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    const fit = this.fit();
    const list = this.apps().filter((a) => {
      if (f === 'active' && (a.status === 'rejected' || a.status === 'withdrawn')) return false;
      if (f !== 'all' && f !== 'active' && a.status !== f) return false;
      return !q || `${a.job.title} ${a.job.employer}`.toLowerCase().includes(q);
    });
    const sort = this.sort();
    if (sort === 'fit') return [...list].sort((a, b) => (fit[b.id]?.overall ?? -1) - (fit[a.id]?.overall ?? -1));
    if (sort === 'employer') return [...list].sort((a, b) => a.job.employer.localeCompare(b.job.employer));
    return list;
  });

  constructor() {
    void this.load();
  }

  private async load() {
    try {
      const [apps, fit] = await Promise.all([this.api.applications(), this.api.assessments().catch(() => [])]);
      this.apps.set(apps);
      this.fit.set(Object.fromEntries(fit.map((f) => [f.applicationId, f])));
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not load applications.');
    } finally {
      this.loading.set(false);
    }
  }
}

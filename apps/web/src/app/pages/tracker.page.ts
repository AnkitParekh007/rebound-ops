import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { ApplicationStatus, ApplicationView } from '@reboundops/contracts';
import { ApiProblem, ApiService } from '../api.service';
import { STATUS_LABEL, STATUS_ORDER } from '../labels';

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
  readonly order = STATUS_ORDER;
  readonly apps = signal<ApplicationView[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly filter = signal<ApplicationStatus | 'all' | 'active'>('all');

  readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    return this.apps().filter((a) => {
      if (f === 'active' && (a.status === 'rejected' || a.status === 'withdrawn')) return false;
      if (f !== 'all' && f !== 'active' && a.status !== f) return false;
      return !q || `${a.job.title} ${a.job.employer}`.toLowerCase().includes(q);
    });
  });

  constructor() {
    void this.load();
  }

  private async load() {
    try {
      this.apps.set(await this.api.applications());
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not load applications.');
    } finally {
      this.loading.set(false);
    }
  }
}

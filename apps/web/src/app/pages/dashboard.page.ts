import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { DashboardSummary } from '@reboundops/contracts';
import { ApiProblem, ApiService } from '../api.service';
import { STATUS_LABEL, STATUS_ORDER } from '../labels';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  template: `
    <section class="page" aria-labelledby="dash-heading">
      <header class="page-head">
        <div>
          <p class="eyebrow">Overview</p>
          <h1 id="dash-heading">Where things stand</h1>
        </div>
        <a class="btn primary" routerLink="/jobs/new">Add a job</a>
      </header>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      } @else if (!data()) {
        <p class="muted" role="status">Loading…</p>
      } @else if (data()!.total === 0) {
        <div class="empty card">
          <h2>Start with one job</h2>
          <p>Paste a posting you're curious about. ReboundOps will pull out the key details, show where each came from, and start tracking it.</p>
          <a class="btn primary" routerLink="/jobs/new">Add a job</a>
        </div>
      } @else {
        @let d = data()!;
        <dl class="metrics">
          <div class="metric"><dt>Tracked</dt><dd>{{ d.total }}</dd></div>
          <div class="metric"><dt>Active</dt><dd>{{ d.active }}</dd></div>
          <div class="metric"><dt>Submitted (confirmed)</dt><dd>{{ d.submitted }}</dd></div>
          <div class="metric"><dt>Interviewing</dt><dd>{{ d.byStatus.interviewing }}</dd></div>
        </dl>

        <div class="grid two">
          <section class="card" aria-labelledby="pipeline-heading">
            <h2 id="pipeline-heading">Pipeline</h2>
            <ul class="bars">
              @for (s of order; track s) {
                <li>
                  <span class="bar-label">{{ labels[s] }}</span>
                  <span class="bar-track" aria-hidden="true"><span class="bar-fill" [attr.data-status]="s" [style.width.%]="pct(d.byStatus[s])"></span></span>
                  <span class="bar-value">{{ d.byStatus[s] }}</span>
                </li>
              }
            </ul>
          </section>

          <section class="card" aria-labelledby="next-heading">
            <h2 id="next-heading">Next actions</h2>
            <ul class="next-list">
              @for (n of d.nextActions.slice(0, 8); track n.applicationId) {
                <li>
                  <a [routerLink]="['/tracker', n.applicationId]">{{ n.jobTitle }} <span class="muted">· {{ n.employer }}</span></a>
                  <span>{{ n.label }}</span>
                </li>
              } @empty {
                <li class="muted">Nothing pending right now.</li>
              }
            </ul>
          </section>
        </div>

        @if (d.followUps.length) {
          <section class="card" aria-labelledby="fu-heading">
            <h2 id="fu-heading">Follow-ups to consider</h2>
            <p class="hint">Ranked from your reminders and how long each submitted application has been quiet. ReboundOps never sends anything.</p>
            <ul class="next-list">
              @for (f of d.followUps; track f.applicationId + f.reason) {
                <li [attr.data-priority]="f.priority">
                  <a [routerLink]="['/tracker', f.applicationId]">{{ f.jobTitle }} · {{ f.employer }}</a>
                  <span><span class="tag">{{ f.priority }}</span> {{ f.reason }}</span>
                </li>
              }
            </ul>
          </section>
        }

        <div class="grid two">
          <section class="card" aria-labelledby="rem-heading">
            <h2 id="rem-heading">Reminders</h2>
            <ul class="next-list">
              @for (r of d.reminders.slice(0, 8); track r.id) {
                <li [class.overdue]="r.overdue">
                  <a [routerLink]="['/tracker', r.applicationId]">{{ r.label }}</a>
                  <span>{{ r.jobTitle }} · {{ r.employer }} — due {{ r.dueOn }}@if (r.overdue) { <strong class="overdue-tag"> (overdue)</strong> }@if (r.priority === 'high') { <span class="tag">high</span> }</span>
                </li>
              } @empty { <li class="muted">No open reminders.</li> }
            </ul>
          </section>
          <section class="card" aria-labelledby="ana-heading">
            <h2 id="ana-heading">Outcomes</h2>
            <dl class="mini-metrics">
              <div><dt>Response rate</dt><dd>{{ d.analytics.responseRate === null ? '—' : (d.analytics.responseRate * 100).toFixed(0) + '%' }}</dd></div>
              <div><dt>Responses</dt><dd>{{ d.analytics.responded }} of {{ d.analytics.submittedTotal }}</dd></div>
              <div><dt>Median days to response</dt><dd>{{ d.analytics.medianDaysToResponse ?? '—' }}</dd></div>
            </dl>
            @if (d.analytics.caveat) { <p class="muted small">{{ d.analytics.caveat }}</p> }
            <table class="weekly">
              <caption class="sr-only">Applications saved and submitted per week</caption>
              <thead><tr><th scope="col">Week of</th><th scope="col">Saved</th><th scope="col">Submitted</th></tr></thead>
              <tbody>
                @for (w of d.analytics.weekly; track w.weekStart) {
                  <tr><th scope="row">{{ w.weekStart }}</th><td>{{ w.saved }}</td><td>{{ w.submitted }}</td></tr>
                }
              </tbody>
            </table>
          </section>
        </div>

        <section class="card" aria-labelledby="recent-heading">
          <h2 id="recent-heading">Recent activity</h2>
          <ol class="timeline compact">
            @for (e of d.recentActivity; track e.id) {
              <li>
                <time [attr.datetime]="e.at">{{ e.at.slice(0, 10) }}</time>
                <span><a [routerLink]="['/tracker', e.applicationId]">{{ e.jobTitle }}</a> —
                  @switch (e.kind) {
                    @case ('status_changed') { moved to {{ labels[e.to!] }} }
                    @case ('created') { saved }
                    @default { note added }
                  }
                </span>
              </li>
            }
          </ol>
        </section>
      }
    </section>
  `,
})
export class DashboardPage {
  private readonly api = inject(ApiService);
  readonly labels = STATUS_LABEL;
  readonly order = STATUS_ORDER;
  readonly data = signal<DashboardSummary | null>(null);
  readonly error = signal<string | null>(null);
  private readonly max = computed(() => Math.max(1, ...Object.values(this.data()?.byStatus ?? {})));

  constructor() {
    void this.load();
  }

  pct(n: number): number {
    return Math.round((n / this.max()) * 100);
  }

  private async load() {
    try {
      this.data.set(await this.api.dashboard());
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not load the overview.');
    }
  }
}

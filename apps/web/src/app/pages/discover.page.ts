import { Component, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { DiscoveredPostingView, DiscoveryResult, JobSourceId, JobSourceInfo } from '@reboundops/contracts';
import { ApiProblem, ApiService } from '../api.service';
import { ELIGIBILITY_LABEL } from '../assessment-panel';

/** "3 hours ago", "2 days ago" — for freshness labels. */
export function ago(hours: number): string {
  if (hours < 1) return 'less than an hour ago';
  if (hours < 48) return `${Math.round(hours)} hour${Math.round(hours) === 1 ? '' : 's'} ago`;
  return `${Math.round(hours / 24)} days ago`;
}

const ARRANGEMENT: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' };

/**
 * Discover postings on official job boards (Greenhouse, Lever, Ashby,
 * Workable). Nothing is fetched until the person allows it, and only the
 * board they name is contacted.
 */
@Component({
  selector: 'app-discover-page',
  imports: [FormsModule, RouterLink, NgTemplateOutlet],
  template: `
    <section class="page" aria-labelledby="discover-heading">
      <header class="page-head">
        <div>
          <p class="eyebrow">Discover</p>
          <h1 id="discover-heading">Find openings on official job boards</h1>
          <p class="muted">Look up a company’s public job board, check fit and eligibility, and save the ones you want to your tracker.</p>
        </div>
      </header>

      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

      @if (loaded() && !consent()) {
        <section class="card stack" aria-labelledby="consent-heading">
          <h2 id="consent-heading">Allow ReboundOps to contact job boards?</h2>
          <p>To discover jobs, ReboundOps requests a company’s public job list directly from the job-board provider you choose. Only the board name you type is sent — never your profile, resume or any personal data. Responses are kept on this computer.</p>
          <p class="hint">You can still add jobs by pasting them, without this.</p>
          <div class="actions"><span class="spacer"></span><button type="button" class="btn primary" (click)="allow()" [disabled]="busy()">Allow contacting job boards</button></div>
        </section>
      }

      @if (consent()) {
        <form class="card stack" (ngSubmit)="search(false)" aria-labelledby="search-heading">
          <h2 id="search-heading">Look up a job board</h2>
          <div class="grid two">
            <div class="field">
              <label for="board">Careers-page URL or board name</label>
              <input id="board" name="board" [(ngModel)]="board" placeholder="https://jobs.lever.co/examplecorp" aria-describedby="board-hint" />
              <p class="hint" id="board-hint">Paste the company’s careers page on Greenhouse, Lever, Ashby or Workable, or type its board name and choose the provider.</p>
            </div>
            <div class="field">
              <label for="source">Provider</label>
              <select id="source" name="source" [(ngModel)]="source">
                <option [ngValue]="null">Detect from the URL</option>
                @for (s of supported(); track s.id) { <option [ngValue]="s.id">{{ s.label }}</option> }
              </select>
            </div>
          </div>
          <div class="grid two">
            <div class="field"><label for="q">Keywords in title, team or location</label><input id="q" name="q" [(ngModel)]="query" /></div>
            <div class="field"><label for="country">Country</label><input id="country" name="country" [(ngModel)]="country" placeholder="e.g. Portugal" /></div>
          </div>
          <div class="actions">
            <label class="check"><input type="checkbox" name="remote" [(ngModel)]="remoteOnly" /> Remote only</label>
            <span class="spacer"></span>
            @if (result()) { <button type="button" class="btn ghost" (click)="search(true)" [disabled]="busy()">Refresh from the board</button> }
            <button type="submit" class="btn primary" [disabled]="busy() || !board.trim()">Look up</button>
          </div>
          @if (busy()) { <p class="muted" role="status">Contacting the job board…</p> }
        </form>

        @if (result(); as r) {
          <section class="stack" aria-labelledby="results-heading">
            <div class="row">
              <h2 id="results-heading">{{ r.employer ?? r.board }} · {{ sourceLabel(r.source) }}</h2>
              <span class="spacer"></span>
              <span class="freshness" [attr.data-cached]="r.fromCache">
                {{ r.fromCache ? 'Cached copy' : 'Fetched just now' }} · {{ r.fetchedAt.slice(0, 16).replace('T', ' ') }} UTC
              </span>
            </div>
            <p class="muted small">{{ r.postings.length }} shown of {{ r.totalListed }} listed on the board.</p>
            @for (n of r.notes; track n) { <p class="hint">{{ n }}</p> }
            <ng-container *ngTemplateOutlet="list; context: { $implicit: r.postings, empty: 'No postings on this board match your filters.' }" />
          </section>
        }
      }

      @if (consent() || recent().length) {
        <section class="stack" aria-labelledby="recent-heading">
          <div class="row">
            <h2 id="recent-heading">Recently discovered</h2>
            <span class="spacer"></span>
            <label class="sr-only" for="recent-q">Filter recently discovered</label>
            <input id="recent-q" name="recentQ" [(ngModel)]="recentQuery" (ngModelChange)="loadRecent()" placeholder="Filter…" style="max-width: 14rem" />
          </div>
          <p class="hint">Stored on this computer from earlier look-ups. Freshness shows when each board was last checked.</p>
          <ng-container *ngTemplateOutlet="list; context: { $implicit: recent(), empty: 'Nothing discovered yet.' }" />
        </section>
      }

      <details class="card">
        <summary>Which job boards are supported, and their limits</summary>
        <ul class="criteria">
          @for (s of sources(); track s.id) {
            <li>
              <div class="criterion-head"><span>{{ s.label }}</span><span class="tag" [class.none]="!s.supported">{{ s.supported ? 'Supported' : 'Not available' }}</span></div>
              <ul class="small">@for (l of s.limitations; track l) { <li>{{ l }}</li> }</ul>
            </li>
          }
        </ul>
      </details>
    </section>

    <ng-template #list let-postings let-empty="empty">
      <ul class="postings" role="list">
        @for (p of asViews(postings); track p.id) {
          <li class="card posting" [attr.data-availability]="p.availability">
            <div class="row">
              <h3 class="posting-title">{{ p.title }}</h3>
              <span class="spacer"></span>
              @if (p.fit) { <span class="fit-pill" [attr.aria-label]="'Fit ' + p.fit.score + ' out of 5'">{{ p.fit.score }} / 5</span> }
              @if (p.eligibility) { <span class="eligibility small" [attr.data-eligibility]="p.eligibility">{{ eligibilityLabel[p.eligibility] }}</span> }
            </div>
            <p class="small">
              {{ p.employer }}@if (p.employerOrigin === 'board') { <span class="muted"> (board name — the provider does not publish the company name)</span> }
              @if (p.location) { · {{ p.location }} }
              @if (p.workArrangement) { · {{ arrangement[p.workArrangement] }}<span class="muted">{{ p.workArrangementOrigin === 'location_text' ? ' (from location text)' : '' }}</span> }
            </p>
            <p class="small">
              @if (p.salary) { Pay published: {{ p.salary.text }} } @else { <span class="muted">Pay not published in the feed</span> }
              @if (p.postedAt) { · posted {{ p.postedAt.slice(0, 10) }} }
            </p>
            <p class="small freshness" [attr.data-availability]="p.availability">
              @switch (p.availability) {
                @case ('listed') { Listed on the board when checked {{ ago(p.ageHours) }} }
                @case ('not_listed') { No longer listed on the board (last seen {{ p.lastSeenAt?.slice(0, 10) }}) }
                @default { Availability unknown }
              }
            </p>
            @if (p.duplicates.length) {
              <p class="badge warn small">Possible duplicate of a saved job: {{ p.duplicates[0].title }} ({{ p.duplicates[0].reason }})</p>
            }
            @if (saveError()[p.id]; as e) { <p class="error small" role="alert">{{ e }}</p> }
            <div class="actions">
              <a class="btn link" [href]="p.postingUrl" target="_blank" rel="noopener noreferrer">Open official posting</a>
              @if (p.applyUrl && p.applyUrl !== p.postingUrl) { <a class="btn link" [href]="p.applyUrl" target="_blank" rel="noopener noreferrer">Official application page</a> }
              <span class="spacer"></span>
              @if (savedApp()[p.id]; as appId) {
                <a class="btn ghost" [routerLink]="['/tracker', appId]">Saved — open in tracker</a>
              } @else if (p.savedJobId) {
                <span class="muted small">Already in your tracker</span>
              } @else {
                @if (p.employerOrigin === 'board') {
                  <label class="sr-only" [for]="'emp-' + p.id">Company name</label>
                  <input [id]="'emp-' + p.id" [name]="'emp-' + p.id" [(ngModel)]="employerEdits[p.id]" [placeholder]="'Company name (optional)'" style="max-width: 12rem" />
                }
                @if (dupConfirm()[p.id]) {
                  <button type="button" class="btn ghost" (click)="save(p, true)">Save anyway</button>
                } @else {
                  <button type="button" class="btn" (click)="save(p, false)" [disabled]="busy()">Save to tracker</button>
                }
              }
            </div>
          </li>
        } @empty {
          <li class="muted">{{ empty }}</li>
        }
      </ul>
    </ng-template>
  `,
})
export class DiscoverPage {
  private readonly api = inject(ApiService);
  readonly eligibilityLabel = ELIGIBILITY_LABEL;
  readonly arrangement = ARRANGEMENT;
  readonly ago = ago;
  readonly loaded = signal(false);
  readonly consent = signal(false);
  readonly sources = signal<JobSourceInfo[]>([]);
  readonly supported = signal<JobSourceInfo[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<DiscoveryResult | null>(null);
  readonly recent = signal<DiscoveredPostingView[]>([]);
  readonly savedApp = signal<Record<string, string>>({});
  readonly saveError = signal<Record<string, string>>({});
  readonly dupConfirm = signal<Record<string, boolean>>({});
  employerEdits: Record<string, string> = {};
  board = '';
  source: JobSourceId | null = null;
  query = '';
  country = '';
  remoteOnly = false;
  recentQuery = '';

  constructor() {
    void this.init();
  }

  asViews(x: unknown): DiscoveredPostingView[] {
    return x as DiscoveredPostingView[];
  }

  sourceLabel(id: JobSourceId) {
    return this.sources().find((s) => s.id === id)?.label ?? id;
  }

  private async init() {
    try {
      // Both are local reads (no job board is contacted here).
      const [s] = await Promise.all([this.api.jobSources(), this.loadRecent()]);
      this.sources.set(s.sources);
      this.supported.set(s.sources.filter((x) => x.supported));
      this.consent.set(s.consent);
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not load job sources.');
    } finally {
      this.loaded.set(true);
    }
  }

  async loadRecent() {
    try {
      this.recent.set(await this.api.recentDiscovered(this.recentQuery.trim() ? { q: this.recentQuery.trim() } : {}));
    } catch {
      // Recent list is a convenience; errors surface on explicit actions.
    }
  }

  async allow() {
    this.busy.set(true);
    try {
      this.consent.set((await this.api.setDiscoveryConsent(true)).consent);
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not save your choice.');
    } finally {
      this.busy.set(false);
    }
  }

  async search(refresh: boolean) {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.result.set(
        await this.api.discover({ board: this.board.trim(), ...(this.source ? { source: this.source } : {}), query: this.query, country: this.country, remoteOnly: this.remoteOnly, refresh }),
      );
      await this.loadRecent();
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not reach the job board.');
      if (e instanceof ApiProblem && e.code === 'discovery_consent_required') this.consent.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  async save(p: DiscoveredPostingView, allowDuplicate: boolean) {
    this.busy.set(true);
    this.saveError.update((m) => ({ ...m, [p.id]: '' }));
    try {
      const employer = this.employerEdits[p.id]?.trim();
      const r = await this.api.saveDiscovered(p.id, { ...(employer ? { employer } : {}), allowDuplicate });
      this.savedApp.update((m) => ({ ...m, [p.id]: r.application.id }));
      this.dupConfirm.update((m) => ({ ...m, [p.id]: false }));
    } catch (e) {
      if (e instanceof ApiProblem && e.code === 'duplicate_job') {
        this.dupConfirm.update((m) => ({ ...m, [p.id]: true }));
        this.saveError.update((m) => ({ ...m, [p.id]: 'This looks like a job you already saved. Save anyway if it is a separate opening.' }));
      } else {
        this.saveError.update((m) => ({ ...m, [p.id]: e instanceof ApiProblem ? e.message : 'Could not save this posting.' }));
      }
    } finally {
      this.busy.set(false);
    }
  }
}

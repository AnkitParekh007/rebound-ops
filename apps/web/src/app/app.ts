import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="shell">
      <header class="rail">
        <a class="brand" routerLink="/" aria-label="ReboundOps overview">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28"><path d="M5 24c6-1 9-5 11-10s5-8 11-9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="6" cy="24" r="3" fill="currentColor"/></svg>
          </span>
          <span class="brand-name">ReboundOps</span>
        </a>
        <nav aria-label="Main">
          <ul class="nav">
            <li><a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Overview</a></li>
            <li><a routerLink="/jobs/new" routerLinkActive="active" ariaCurrentWhenActive="page">Add a job</a></li>
            <li><a routerLink="/discover" routerLinkActive="active" ariaCurrentWhenActive="page">Discover</a></li>
            <li><a routerLink="/tracker" routerLinkActive="active" ariaCurrentWhenActive="page">Tracker</a></li>
            <li><a routerLink="/profile" routerLinkActive="active" ariaCurrentWhenActive="page">Profile</a></li>
            <li><a routerLink="/settings" routerLinkActive="active" ariaCurrentWhenActive="page">Settings</a></li>
            <li><a routerLink="/welcome" routerLinkActive="active" ariaCurrentWhenActive="page">Setup</a></li>
          </ul>
        </nav>
        <p class="rail-note">Your data stays on this computer.</p>
      </header>
      <p class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement() }}</p>
      <main id="main" tabindex="-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class App {
  readonly announcement = signal('');

  constructor() {
    const router = inject(Router);
    const title = inject(Title);
    let first = true;
    const sub = router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      // Skip the initial load; afterwards move focus to the new page and announce it.
      if (first) {
        first = false;
        return;
      }
      setTimeout(() => {
        document.getElementById('main')?.focus({ preventScroll: false });
        this.announcement.set(title.getTitle());
      });
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }
}

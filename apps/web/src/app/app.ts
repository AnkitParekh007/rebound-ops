import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
            <li><a routerLink="/tracker" routerLinkActive="active" ariaCurrentWhenActive="page">Tracker</a></li>
            <li><a routerLink="/profile" routerLinkActive="active" ariaCurrentWhenActive="page">Profile</a></li>
            <li><a routerLink="/welcome" routerLinkActive="active" ariaCurrentWhenActive="page">Setup</a></li>
          </ul>
        </nav>
        <p class="rail-note">Your data stays on this computer.</p>
      </header>
      <main id="main" tabindex="-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class App {}

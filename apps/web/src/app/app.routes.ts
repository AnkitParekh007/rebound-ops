import type { Routes } from '@angular/router';
import { firstRunGuard } from './onboarding.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [firstRunGuard], loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage), title: 'Overview · ReboundOps' },
  { path: 'welcome', loadComponent: () => import('./pages/welcome.page').then((m) => m.WelcomePage), title: 'Welcome · ReboundOps' },
  { path: 'profile', loadComponent: () => import('./pages/profile.page').then((m) => m.ProfilePage), title: 'Profile · ReboundOps' },
  { path: 'jobs/new', loadComponent: () => import('./pages/intake.page').then((m) => m.IntakePage), title: 'Add a job · ReboundOps' },
  { path: 'discover', loadComponent: () => import('./pages/discover.page').then((m) => m.DiscoverPage), title: 'Discover jobs · ReboundOps' },
  { path: 'tracker', loadComponent: () => import('./pages/tracker.page').then((m) => m.TrackerPage), title: 'Tracker · ReboundOps' },
  { path: 'tracker/:id', loadComponent: () => import('./pages/application.page').then((m) => m.ApplicationPage), title: 'Application · ReboundOps' },
  { path: 'settings', loadComponent: () => import('./pages/settings.page').then((m) => m.SettingsPage), title: 'Settings · ReboundOps' },
  { path: '**', redirectTo: '' },
];

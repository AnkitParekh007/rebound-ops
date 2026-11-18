import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { ApiService } from './api.service';

/** First launch goes to the welcome flow; afterwards the app opens on the dashboard. */
export const firstRunGuard: CanActivateFn = async () => {
  const api = inject(ApiService);
  const router = inject(Router);
  try {
    const state = await api.onboarding();
    return state.status === 'not_started' || state.status === 'in_progress'
      ? router.parseUrl('/welcome')
      : true;
  } catch {
    // If the service is down, let the page render its own offline state.
    return true;
  }
};

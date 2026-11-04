import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { RouteId, Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';

/** Step 03: Return / Shift / Bridge hypotheses with explicit unknowns. */
@Component({
  selector: 'rb-routes',
  templateUrl: './routes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class RoutesComponent {
  protected readonly store = inject(SessionStore);
  readonly session = input.required<Session>();

  async chooseRoute(routeId: RouteId): Promise<void> {
    await this.store.chooseRoute(routeId);
  }
}

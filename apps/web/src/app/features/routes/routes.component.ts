import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ROUTE_TITLES, type RouteId, type Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import { WizardStore } from '../../core/wizard';

/** "Your options": three kinds of next step, each with its unknowns stated plainly. */
@Component({
  selector: 'rb-routes',
  templateUrl: './routes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class RoutesComponent {
  protected readonly store = inject(SessionStore);
  private readonly wizard = inject(WizardStore);
  readonly session = input.required<Session>();
  protected readonly titles = ROUTE_TITLES;

  /** Button text, e.g. "Choose a new kind of work". */
  protected choose(id: RouteId): string {
    const title = ROUTE_TITLES[id];
    return 'Choose ' + title.charAt(0).toLowerCase() + title.slice(1);
  }

  async chooseRoute(routeId: RouteId): Promise<void> {
    if (await this.store.chooseRoute(routeId)) this.wizard.go('plan');
  }
}

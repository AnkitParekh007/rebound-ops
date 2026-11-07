import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import type { PersistenceMode } from '../../core/api-types';

/** Opt-in disk saving, explicit JSON backup and session deletion. */
@Component({
  selector: 'rb-data-controls',
  templateUrl: './data-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class DataControlsComponent {
  protected readonly store = inject(SessionStore);
  readonly session = input.required<Session>();

  async changePersistence(mode: PersistenceMode): Promise<void> {
    await this.store.changePersistence(mode);
  }

  backup(): void {
    this.store.downloadBackup();
  }

  async deleteSession(): Promise<void> {
    await this.store.deleteSession();
  }
}

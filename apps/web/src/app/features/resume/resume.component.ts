import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { Session } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import { WizardStore } from '../../core/wizard';

/**
 * "Coming back?": reopen a saved session or restore a backup file.
 * Shown on the guided welcome screen and under the full form; only one of
 * them is rendered at a time, so the controls never appear twice.
 */
@Component({
  selector: 'rb-resume',
  templateUrl: './resume.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResumeComponent {
  protected readonly store = inject(SessionStore);
  private readonly wizard = inject(WizardStore);

  async resumeSaved(id: string): Promise<void> {
    const session = await this.store.resumeSaved(id);
    if (session) this.reopen(session);
  }

  async restoreFile(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 128 * 1024) {
      this.store.setError('Backup exceeds 128 KB. Only ReboundOps JSON snapshots are supported.');
      input.value = '';
      return;
    }
    const session = await this.store.restoreBackup(file);
    if (session) this.reopen(session);
    input.value = '';
  }

  /** A reopened session continues where it left off: its plan, or its evidence. */
  private reopen(session: Session): void {
    this.wizard.go(session.plan ? 'plan' : 'evidence');
  }
}

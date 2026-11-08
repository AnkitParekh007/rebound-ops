import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SessionStore } from '../../core/session-store';

@Component({
  selector: 'rb-ai-setup',
  templateUrl: './ai-setup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiSetupComponent {
  protected readonly store = inject(SessionStore);
}

import { ChangeDetectionStrategy, Component, type OnInit, inject } from '@angular/core';
import { SessionStore } from './core/session-store';
import { IntakeComponent } from './features/intake/intake.component';
import { EvidenceComponent } from './features/evidence/evidence.component';
import { JobTargetsComponent } from './features/job-targets/job-targets.component';
import { RoutesComponent } from './features/routes/routes.component';
import { PlanComponent } from './features/plan/plan.component';
import { PilotFeedbackComponent } from './features/pilot-feedback/pilot-feedback.component';
import { DataControlsComponent } from './features/data-controls/data-controls.component';

/** Application shell: page frame, global messages and workflow composition. */
@Component({
  selector: 'rb-root',
  imports: [
    IntakeComponent, EvidenceComponent, JobTargetsComponent, RoutesComponent,
    PlanComponent, PilotFeedbackComponent, DataControlsComponent
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  protected readonly store = inject(SessionStore);

  ngOnInit(): Promise<void> {
    return this.store.init();
  }
}

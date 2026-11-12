import { ChangeDetectionStrategy, Component, ElementRef, type OnInit, afterNextRender, computed, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { type AbstractControl, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  LegacyTrackerViewRequestSchema, RecordRedactionRequestSchema,
  type LegacyQuarantineReason, type LegacyTrackerImportReport, type LegacyTrackerView, type LegacyViewState
} from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import { WizardStore } from '../../core/wizard';
import { FORM_INVALID_MESSAGE, contractValidator, fieldError } from '../../core/form-validation';

export const CONFIRM_MESSAGE = 'Tick the box to confirm.';

const STATE_LABELS: Record<LegacyViewState, string> = {
  imported: 'Already imported',
  changed_since_import: 'Changed since import: importing updates it',
  not_imported: 'Not imported yet',
  redacted: 'Details removed'
};

const REASON_LABELS: Record<LegacyQuarantineReason, string> = {
  malformed_row: 'The row has fewer cells than the header',
  invalid_number: 'The # is not a whole number',
  invalid_date: 'The date is not a real YYYY-MM-DD date',
  missing_company_or_role: 'Company or role is empty',
  duplicate_number: 'Another row uses the same #',
  conflicts_with_imported_record: 'This # was imported before for a different company or role',
  record_redacted: 'This record’s details were removed, so it is not filled in again',
  row_too_large: 'The row is too long (usually its notes)'
};

/**
 * Application records (R0 operations store): import the engine's
 * applications.md, export the store as Markdown, back up and restore, and
 * remove one record's details.
 *
 * Not session-scoped: these records live in the operations store, not in the
 * recovery session. The tracker text stays in this component's form; the API
 * receives it only on "Check" or "Import" and never opens the original file.
 */
@Component({
  selector: 'rb-records',
  imports: [ReactiveFormsModule, SlicePipe],
  templateUrl: './records.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'feature' }
})
export class RecordsComponent implements OnInit {
  protected readonly store = inject(SessionStore);
  private readonly wizard = inject(WizardStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly trackerForm = new FormGroup({
    sourceLabel: new FormControl('applications.md', { nonNullable: true, validators: contractValidator(LegacyTrackerViewRequestSchema.shape.sourceLabel) }),
    markdown: new FormControl('', { nonNullable: true, validators: contractValidator(LegacyTrackerViewRequestSchema.shape.markdown) })
  });

  readonly redactForm = new FormGroup({
    entityId: new FormControl('', { nonNullable: true, validators: control => control.value ? null : { contract: 'Choose a record.' } }),
    confirm: new FormControl(false, { nonNullable: true, validators: contractValidator(RecordRedactionRequestSchema.shape.confirm) })
  });

  readonly restoreConfirm = new FormControl(false, { nonNullable: true, validators: contractValidator(RecordRedactionRequestSchema.shape.confirm) });

  /** Result of the last "Check" (read-only), cleared when the text changes or an import runs. */
  readonly view = signal<LegacyTrackerView | null>(null);
  readonly report = signal<LegacyTrackerImportReport | null>(null);
  /** The backup the person chose to restore, waiting for confirmation. */
  readonly pendingRestore = signal<string | null>(null);
  readonly retention = signal<{ backups: string[]; preMigrationCopies: string[] } | null>(null);

  readonly records = computed(() => this.store.trackerRecords()?.records ?? []);
  readonly redactedCount = computed(() => this.store.trackerRecords()?.redacted.length ?? 0);

  constructor() {
    this.trackerForm.valueChanges.subscribe(() => this.view.set(null));
    // The shell loads this screen with @defer, so on first open its heading
    // appears after the shell tried to focus it; take focus here instead.
    afterNextRender(() => {
      if (this.wizard.current() !== 'records') return;
      const heading = this.host.nativeElement.querySelector<HTMLElement>('#records-heading');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus();
    });
  }

  async ngOnInit(): Promise<void> {
    await this.store.refreshOperationsData();
  }

  error(control: AbstractControl): string | null {
    return fieldError(control);
  }

  confirmError(control: AbstractControl): string | null {
    return fieldError(control) ? CONFIRM_MESSAGE : null;
  }

  stateLabel(state: LegacyViewState): string {
    return STATE_LABELS[state];
  }

  reasonLabel(reason: LegacyQuarantineReason): string {
    return REASON_LABELS[reason];
  }

  async loadFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.trackerForm.setValue({ sourceLabel: file.name.slice(0, 200) || 'applications.md', markdown: await file.text() });
    this.trackerForm.markAllAsDirty();
    input.value = '';
  }

  private trackerRequest(): { markdown: string; sourceLabel: string } | null {
    if (this.trackerForm.invalid) {
      this.trackerForm.markAllAsTouched();
      this.store.setError(FORM_INVALID_MESSAGE);
      return null;
    }
    const { markdown, sourceLabel } = this.trackerForm.getRawValue();
    return { markdown, sourceLabel: sourceLabel.trim() };
  }

  async check(): Promise<void> {
    const request = this.trackerRequest();
    if (!request) return;
    this.report.set(null);
    this.view.set(await this.store.checkTracker(request));
  }

  async importTracker(): Promise<void> {
    const request = this.trackerRequest();
    if (!request) return;
    const report = await this.store.importTracker(request);
    if (report) {
      this.report.set(report);
      this.view.set(null);
    }
  }

  async exportTracker(): Promise<void> {
    await this.store.exportTracker();
  }

  async createBackup(): Promise<void> {
    await this.store.createOperationsBackup();
  }

  askRestore(name: string): void {
    this.pendingRestore.set(name);
    this.restoreConfirm.reset(false);
  }

  async restore(): Promise<void> {
    const name = this.pendingRestore();
    if (!name) return;
    if (this.restoreConfirm.invalid) {
      this.restoreConfirm.markAsTouched();
      this.store.setError(CONFIRM_MESSAGE);
      return;
    }
    if (await this.store.restoreOperationsBackup(name)) this.pendingRestore.set(null);
  }

  async redact(): Promise<void> {
    if (this.redactForm.invalid) {
      this.redactForm.markAllAsTouched();
      this.store.setError(this.redactForm.controls.confirm.invalid ? CONFIRM_MESSAGE : FORM_INVALID_MESSAGE);
      return;
    }
    const record = this.records().find(r => r.entityId === this.redactForm.controls.entityId.value);
    if (!record) {
      this.store.setError('That record is no longer available. Choose another.');
      return;
    }
    const result = await this.store.redactTrackerRecord(record);
    if (result) {
      this.retention.set({ backups: result.retention.backups, preMigrationCopies: result.retention.preMigrationCopies });
      this.redactForm.reset({ entityId: '', confirm: false });
    }
  }
}

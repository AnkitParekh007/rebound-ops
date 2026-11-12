import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIRM_MESSAGE, RecordsComponent } from './records.component';
import { SessionStore } from '../../core/session-store';
import { WizardStore } from '../../core/wizard';
import { FORM_INVALID_MESSAGE } from '../../core/form-validation';

describe('RecordsComponent (application records)', () => {
  const record = { num: 3, entityId: 'legacy-3', revision: 2, cells: { company: 'Example Labs', role: 'Engineer' }, importedAt: '2026-11-12T00:00:00.000Z' };
  const tracker = '| # | Date | Company | Role | Score | Status |\n|---|---|---|---|---|---|\n| 3 | 2026-06-20 | Example Labs | Engineer | 4/5 | Applied |';
  const view = { counts: { total: 1, imported: 1, changed_since_import: 0, not_imported: 0, redacted: 0 }, applications: [], quarantined: [] };
  type Fn = ReturnType<typeof vi.fn>;
  let store: Record<string, unknown> & Record<'setError' | 'checkTracker' | 'importTracker' | 'redactTrackerRecord' | 'restoreOperationsBackup' | 'refreshOperationsData', Fn>;
  let component: RecordsComponent;

  beforeEach(async () => {
    store = {
      busy: signal(false), trackerRecords: signal({ records: [record], redacted: [] }), operationsBackups: signal([]),
      setError: vi.fn(), refreshOperationsData: vi.fn().mockResolvedValue(undefined),
      checkTracker: vi.fn().mockResolvedValue(view), importTracker: vi.fn().mockResolvedValue({ imported: 1, updated: 0, unchanged: 0, quarantined: [] }),
      redactTrackerRecord: vi.fn().mockResolvedValue({ retention: { backups: ['b1'], preMigrationCopies: [], message: 'm' } }),
      restoreOperationsBackup: vi.fn().mockResolvedValue({})
    };
    TestBed.configureTestingModule({ providers: [{ provide: SessionStore, useValue: store }, { provide: WizardStore, useValue: { current: signal('records') } }] });
    const fixture = TestBed.createComponent(RecordsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    component = fixture.componentInstance;
  });

  it('loads records and backups when opened', () => {
    expect(store.refreshOperationsData).toHaveBeenCalledTimes(1);
  });

  it('will not send an empty tracker; a check is shown until the text changes', async () => {
    await component.check();
    expect(store.checkTracker).not.toHaveBeenCalled();
    expect(store.setError).toHaveBeenCalledWith(FORM_INVALID_MESSAGE);

    component.trackerForm.controls.markdown.setValue(tracker);
    await component.check();
    expect(store.checkTracker).toHaveBeenCalledWith({ markdown: tracker, sourceLabel: 'applications.md' });
    expect(component.view()).toEqual(view);
    component.trackerForm.controls.markdown.setValue(tracker + '\n');
    expect(component.view()).toBeNull();
  });

  it('an import shows its report and drops the earlier check', async () => {
    component.trackerForm.controls.markdown.setValue(tracker);
    await component.check();
    await component.importTracker();
    expect(component.report()?.imported).toBe(1);
    expect(component.view()).toBeNull();
  });

  it('removes a record\'s details only after the box is ticked', async () => {
    component.redactForm.controls.entityId.setValue('legacy-3');
    await component.redact();
    expect(store.redactTrackerRecord).not.toHaveBeenCalled();
    expect(store.setError).toHaveBeenCalledWith(CONFIRM_MESSAGE);

    component.redactForm.controls.confirm.setValue(true);
    await component.redact();
    expect(store.redactTrackerRecord).toHaveBeenCalledWith(record);
    expect(component.retention()?.backups).toEqual(['b1']);
    expect(component.redactForm.controls.confirm.value).toBe(false);
  });

  it('restores only after confirmation, and a new choice resets the box', async () => {
    component.askRestore('operations-20261112T000000000Z.sqlite');
    await component.restore();
    expect(store.restoreOperationsBackup).not.toHaveBeenCalled();
    component.restoreConfirm.setValue(true);
    component.askRestore('operations-20261112T000000001Z.sqlite');
    expect(component.restoreConfirm.value).toBe(false);
    component.restoreConfirm.setValue(true);
    await component.restore();
    expect(store.restoreOperationsBackup).toHaveBeenCalledWith('operations-20261112T000000001Z.sqlite');
    expect(component.pendingRestore()).toBeNull();
  });
});

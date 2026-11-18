import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BackupPanel } from './backup-panel';

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return TestBed.inject(HttpTestingController);
}

describe('BackupPanel', () => {
  it('validates the backup password locally before sending anything', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(BackupPanel);
    const cmp = fixture.componentInstance;
    cmp.password = 'short';
    cmp.password2 = 'short';
    await cmp.downloadProtected();
    expect(cmp.backupError()).toMatch(/at least 10/);
    cmp.password = 'long enough password';
    cmp.password2 = 'different password!!';
    await cmp.downloadProtected();
    expect(cmp.backupError()).toMatch(/do not match/);
    http.verify();
  });

  it('restores only after checking the backup and a typed confirmation, then shows the recovery copy', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(BackupPanel);
    const cmp = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;
    cmp.stage.set({ stageId: '00000000-0000-4000-8000-000000000001', size: 4096, encrypted: true, meta: { createdAt: '2026-11-18T10:00:00.000Z', schemaVersion: 4, appVersion: '0.2.0' }, currentCounts: { jobs: 2 } });
    cmp.restorePassword = 'a long fictional passphrase';
    const v = cmp.verify();
    const vr = http.expectOne('/api/restore/00000000-0000-4000-8000-000000000001/verify');
    expect(vr.request.body).toEqual({ password: 'a long fictional passphrase' });
    vr.flush({ schemaVersion: 4, counts: { jobs: 1 }, encrypted: true, compatible: true, currentCounts: { jobs: 2 } });
    await v;
    fixture.detectChanges();
    expect(el.querySelector('table.counts')?.textContent).toMatch(/Jobs\s*2\s*1/);
    const button = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Restore now'))!;
    expect(button.disabled).toBe(true);

    cmp.confirmText = 'RESTORE';
    const a = cmp.apply();
    const ar = http.expectOne('/api/restore/00000000-0000-4000-8000-000000000001/apply');
    expect(ar.request.body).toEqual({ password: 'a long fictional passphrase', confirm: 'RESTORE' });
    ar.flush({ restored: true, counts: { jobs: 1 }, recoveryBackup: '/data/recovery-backups/before.sqlite', previousDatabase: null, instructions: 'If this was a mistake: …' });
    await a;
    fixture.detectChanges();
    expect(el.textContent).toContain('Restore complete.');
    expect(el.textContent).toContain('/data/recovery-backups/before.sqlite');
    expect(cmp.restorePassword).toBe('');
    http.verify();
  });
});

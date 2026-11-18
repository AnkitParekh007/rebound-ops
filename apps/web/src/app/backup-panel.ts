import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiProblem, ApiService, type RestoreCheck, type RestoreOutcome, type RestoreStage } from './api.service';

const COUNT_LABELS: Record<string, string> = {
  jobs: 'Jobs', applications: 'Applications', activity: 'Activity entries', contacts: 'Contacts', reminders: 'Reminders',
  resumeFiles: 'Resume files', documents: 'Drafts', interviewNotes: 'Interview notes', discoveredJobs: 'Discovered postings',
};

/** Backup (optionally password-protected) and a guarded in-app restore. */
@Component({
  selector: 'app-backup-panel',
  imports: [FormsModule],
  template: `
    <section class="card stack" aria-labelledby="backup-heading">
      <h2 id="backup-heading">Backup and restore</h2>
      <p class="hint">A backup is a complete copy of your database: profile, jobs, applications, notes, drafts, screening answers, contacts, reminders and original resume files. API keys are never included.</p>

      <h3 class="sub">Download a backup</h3>
      <p><a class="btn ghost" href="/api/backup" download>Download an unprotected backup</a></p>
      <form class="stack subcard" (ngSubmit)="downloadProtected()" aria-labelledby="protect-heading">
        <h4 id="protect-heading">Password-protected backup</h4>
        <p class="hint">Encrypted with AES-256-GCM using a key derived from your password (scrypt). ReboundOps does not keep the password; without it the backup cannot be restored.</p>
        <div class="grid two">
          <div class="field"><label for="bk-pw">Password (at least 10 characters)</label><input id="bk-pw" name="bkPw" type="password" autocomplete="new-password" [(ngModel)]="password" /></div>
          <div class="field"><label for="bk-pw2">Repeat password</label><input id="bk-pw2" name="bkPw2" type="password" autocomplete="new-password" [(ngModel)]="password2" /></div>
        </div>
        @if (backupError()) { <p class="error" role="alert">{{ backupError() }}</p> }
        @if (backupDone()) { <p class="muted small" role="status">{{ backupDone() }}</p> }
        <div class="actions"><span class="spacer"></span><button type="submit" class="btn" [disabled]="busy()">Download protected backup</button></div>
      </form>

      <h3 class="sub">Restore from a backup</h3>
      <p class="hint">Restoring replaces everything currently in ReboundOps with the backup’s contents. A copy of your current data is saved first, so it can be brought back.</p>
      @if (restoreError()) { <p class="error" role="alert">{{ restoreError() }}</p> }

      @if (outcome(); as o) {
        <div class="subcard stack" role="status">
          <p><strong>Restore complete.</strong> ReboundOps now shows the restored data.</p>
          <p class="small">Your data from just before the restore was saved to <code>{{ o.recoveryBackup }}</code>.</p>
          <p class="small">{{ o.instructions }}</p>
          <div class="actions"><span class="spacer"></span><button type="button" class="btn" (click)="reload()">Reload ReboundOps</button></div>
        </div>
      } @else if (!stage()) {
        <div class="field">
          <label for="restore-file">Backup file (.sqlite or .rbobak)</label>
          <input id="restore-file" type="file" accept=".sqlite,.rbobak,application/octet-stream,application/vnd.sqlite3" (change)="onFile($event)" />
        </div>
      } @else {
        @if (stage(); as s) {
          <div class="subcard stack" aria-labelledby="restore-review-heading">
            <h4 id="restore-review-heading">Check the backup</h4>
            <p class="small">{{ s.encrypted ? 'Password-protected backup' : 'Unprotected backup' }} · {{ (s.size / 1024).toFixed(0) }} KB@if (s.meta) { · made {{ s.meta.createdAt.slice(0, 10) }} by ReboundOps {{ s.meta.appVersion }} }</p>
            @if (s.encrypted && !check()) {
              <div class="field"><label for="rs-pw">Backup password</label><input id="rs-pw" name="rsPw" type="password" autocomplete="current-password" [(ngModel)]="restorePassword" /></div>
            }
            @if (!check()) {
              <div class="actions">
                <button type="button" class="btn link" (click)="cancel()">Cancel</button>
                <span class="spacer"></span>
                <button type="button" class="btn" (click)="verify()" [disabled]="busy() || (s.encrypted && !restorePassword)">Check backup</button>
              </div>
            }
            @if (check(); as c) {
              <table class="counts">
                <caption class="sr-only">Records now and in the backup</caption>
                <thead><tr><th scope="col">Record</th><th scope="col">Now</th><th scope="col">In backup</th></tr></thead>
                <tbody>
                  @for (k of countKeys(c); track k) { <tr><th scope="row">{{ label(k) }}</th><td>{{ c.currentCounts[k] ?? 0 }}</td><td>{{ c.counts[k] ?? 0 }}</td></tr> }
                </tbody>
              </table>
              <div class="notice">
                <p><strong>This replaces all current data.</strong> Everything shown in the “Now” column will be replaced by the backup. A recovery copy is saved first.</p>
                <div class="field"><label for="rs-confirm">Type RESTORE to confirm</label><input id="rs-confirm" name="rsConfirm" [(ngModel)]="confirmText" autocomplete="off" /></div>
              </div>
              <div class="actions">
                <button type="button" class="btn link" (click)="cancel()">Cancel</button>
                <span class="spacer"></span>
                <button type="button" class="btn danger" (click)="apply()" [disabled]="busy() || confirmText !== 'RESTORE'">Restore now</button>
              </div>
            }
          </div>
        }
      }
      @if (busy()) { <p class="muted" role="status">Working…</p> }
      <details>
        <summary>Restore without the app (command line)</summary>
        <p class="hint">Stop ReboundOps, then run <code>npm run restore -- &lt;backup-file&gt;</code> to check a backup and add <code>--yes</code> to restore it. Protected backups ask for the password (or read <code>REBOUND_BACKUP_PASSWORD</code>). Your current data is kept alongside, never deleted.</p>
      </details>
    </section>
  `,
})
export class BackupPanel {
  private readonly api = inject(ApiService);
  readonly busy = signal(false);
  readonly backupError = signal<string | null>(null);
  readonly backupDone = signal<string | null>(null);
  readonly restoreError = signal<string | null>(null);
  readonly stage = signal<RestoreStage | null>(null);
  readonly check = signal<RestoreCheck | null>(null);
  readonly outcome = signal<RestoreOutcome | null>(null);
  password = '';
  password2 = '';
  restorePassword = '';
  confirmText = '';

  label(k: string) {
    return COUNT_LABELS[k] ?? k;
  }

  countKeys(c: RestoreCheck) {
    return [...new Set([...Object.keys(c.currentCounts), ...Object.keys(c.counts)])];
  }

  async downloadProtected() {
    this.backupError.set(null);
    this.backupDone.set(null);
    if ([...this.password].length < 10) return this.backupError.set('Use a password of at least 10 characters.');
    if (this.password !== this.password2) return this.backupError.set('The passwords do not match.');
    this.busy.set(true);
    try {
      const { blob, filename } = await this.api.encryptedBackup(this.password);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      this.password = '';
      this.password2 = '';
      this.backupDone.set(`Saved ${filename}. Keep the password somewhere safe — it cannot be recovered.`);
    } catch (e) {
      this.backupError.set(e instanceof ApiProblem ? e.message : 'Could not create the backup.');
    } finally {
      this.busy.set(false);
    }
  }

  async onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.restoreError.set(null);
    this.busy.set(true);
    try {
      const s = await this.api.stageRestore(await file.arrayBuffer());
      this.stage.set(s);
      if (!s.encrypted) await this.verify();
    } catch (e) {
      this.restoreError.set(e instanceof ApiProblem ? e.message : 'Could not read the backup file.');
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }

  async verify() {
    const s = this.stage();
    if (!s) return;
    this.busy.set(true);
    this.restoreError.set(null);
    try {
      this.check.set(await this.api.verifyRestore(s.stageId, this.restorePassword || undefined));
    } catch (e) {
      this.restoreError.set(e instanceof ApiProblem ? e.message : 'The backup could not be checked.');
    } finally {
      this.busy.set(false);
    }
  }

  async apply() {
    const s = this.stage();
    if (!s || this.confirmText !== 'RESTORE') return;
    this.busy.set(true);
    this.restoreError.set(null);
    try {
      this.outcome.set(await this.api.applyRestore(s.stageId, this.restorePassword || undefined, this.confirmText));
      this.restorePassword = '';
      this.stage.set(null);
      this.check.set(null);
    } catch (e) {
      this.restoreError.set(e instanceof ApiProblem ? e.message : 'Restore failed; your data was not changed.');
    } finally {
      this.busy.set(false);
    }
  }

  async cancel() {
    const s = this.stage();
    this.stage.set(null);
    this.check.set(null);
    this.restorePassword = '';
    this.confirmText = '';
    if (s) await this.api.cancelRestore(s.stageId).catch(() => undefined);
  }

  reload() {
    location.reload();
  }
}

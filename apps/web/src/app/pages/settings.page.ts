import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { AiMode, AiSettingsView, ImportPreview, ImportResult, ProviderId } from '@reboundops/contracts';
import { ApiProblem, ApiService } from '../api.service';

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule],
  template: `
    <section class="page narrow" aria-labelledby="settings-heading">
      <header class="page-head">
        <div>
          <p class="eyebrow">Settings</p>
          <h1 id="settings-heading">Privacy, AI and your data</h1>
        </div>
      </header>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (status()) { <p class="muted" role="status">{{ status() }}</p> }

      @if (view(); as v) {
        <section class="card stack" aria-labelledby="ai-heading">
          <h2 id="ai-heading">AI assistance</h2>
          <p class="muted">Optional. Every feature works with AI off. When on, AI can only suggest rewording of text you select; suggestions that add facts are withheld.</p>
          <fieldset class="choices">
            <legend class="label">Mode</legend>
            @for (m of modes; track m.value) {
              <label class="choice" [class.selected]="mode === m.value">
                <input type="radio" name="mode" [value]="m.value" [checked]="mode === m.value" (change)="setMode(m.value)" />
                <span class="choice-title">{{ m.title }}</span><span class="choice-body">{{ m.body }}</span>
              </label>
            }
          </fieldset>

          @if (mode !== 'off') {
            <div class="field">
              <label for="provider">Provider</label>
              <select id="provider" name="provider" [(ngModel)]="provider">
                <option [ngValue]="null">Choose…</option>
                @for (p of allowedProviders(); track p.id) {
                  <option [ngValue]="p.id">{{ p.label }}@if (!p.local && !p.keyConfigured) { (needs {{ p.keyEnvVar }}) }</option>
                }
              </select>
            </div>
            @if (provider) {
              <div class="field">
                <label for="model">Model</label>
                <input id="model" name="model" [(ngModel)]="model" [placeholder]="selected()?.defaultModel ?? 'Model name'" />
                @if (selected()?.defaultModel) { <p class="hint">Leave blank to use {{ selected()!.defaultModel }}.</p> }
              </div>
              @if (provider === 'ollama') {
                <div class="field">
                  <label for="base">Ollama address</label>
                  <input id="base" name="base" [(ngModel)]="baseUrl" placeholder="http://127.0.0.1:11434" />
                  <p class="hint">Must be on this computer.</p>
                </div>
              } @else {
                @if (!selected()?.keyConfigured) {
                  <p class="notice">Set <code>{{ selected()?.keyEnvVar }}</code> in the environment that starts the ReboundOps service, then restart it. Keys are never stored in ReboundOps or shown in the app.</p>
                }
                <label class="check"><input type="checkbox" name="consent" [(ngModel)]="consent" /> I agree that text I choose to rewrite may be sent to {{ selected()?.label }}. Nothing is sent without my confirmation each time.</label>
              }
            }
          }
          <div class="actions">
            <span class="muted small">{{ v.reason }}</span>
            <span class="spacer"></span>
            @if (v.active) { <button type="button" class="btn ghost" (click)="test()" [disabled]="busy()">Test connection</button> }
            <button type="button" class="btn primary" (click)="save()" [disabled]="busy()">Save</button>
          </div>
        </section>

        <section class="card stack" aria-labelledby="data-heading">
          <h2 id="data-heading">Your data</h2>
          <p>Everything is stored in a single private database on this computer. ReboundOps has no account and sends nothing anywhere unless you use a cloud AI provider and confirm each request.</p>
          <h3 class="sub">Backup</h3>
          <p><a class="btn primary" href="/api/backup" download>Download a backup</a></p>
          <p class="hint">A complete copy of your database: profile, jobs, applications, notes, drafts, screening answers, contacts, reminders and your original resume files. API keys are never included. It is not encrypted, so keep it somewhere private.</p>
          <p class="hint">To restore, stop ReboundOps and run <code>npm run restore -- &lt;backup-file&gt;</code> to check the file, then add <code>--yes</code> to restore it. Your current data is kept alongside, never deleted.</p>
          <h3 class="sub">Export</h3>
          <p><a class="btn ghost" href="/api/export" download>Download a data export (JSON)</a></p>
          <p class="hint">A readable export of your profile, jobs, applications, notes, contacts and reminders, for use in other tools or for importing. It does not include drafts, screening answers or resume files; use a backup to keep everything.</p>
        </section>

        <section class="card stack" aria-labelledby="import-heading">
          <h2 id="import-heading">Import data</h2>
          <p class="muted">Import a ReboundOps export or a file in the documented import format. You'll see a preview first; nothing is saved until you confirm. Existing profile details are never overwritten, and the file itself is not changed.</p>
          <div class="field">
            <label for="import-file">Import file (.json)</label>
            <input id="import-file" type="file" accept=".json,application/json" (change)="previewFile($event)" />
          </div>
          @if (preview(); as p) {
            <div class="stack review" aria-labelledby="import-preview-heading">
              <h3 id="import-preview-heading" class="sub">Preview</h3>
              <ul>
                <li>{{ p.jobs.toAdd.length }} job{{ p.jobs.toAdd.length === 1 ? '' : 's' }} to add</li>
                <li>{{ p.jobs.duplicates.length }} duplicate{{ p.jobs.duplicates.length === 1 ? '' : 's' }} to skip</li>
                <li>{{ p.jobs.rejected.length }} record{{ p.jobs.rejected.length === 1 ? '' : 's' }} rejected</li>
                <li>Profile: {{ p.profile.fieldsToFill.length }} empty field(s) filled, {{ p.profile.skillsToAdd.length }} skill(s), {{ p.profile.experienceToAdd }} role(s), {{ p.profile.educationToAdd }} education entr{{ p.profile.educationToAdd === 1 ? 'y' : 'ies' }} added</li>
              </ul>
              @if (p.jobs.toAdd.length) {
                <table class="weekly">
                  <caption class="sr-only">Jobs to import</caption>
                  <thead><tr><th scope="col">Job</th><th scope="col">Employer</th><th scope="col">Status</th></tr></thead>
                  <tbody>@for (j of p.jobs.toAdd.slice(0, 50); track j.index) { <tr><th scope="row">{{ j.title }}</th><td>{{ j.employer }}</td><td>{{ j.status }}</td></tr> }</tbody>
                </table>
              }
              @if (p.jobs.rejected.length) {
                <details><summary>Rejected records</summary><ul>@for (r of p.jobs.rejected; track r.index) { <li>Record {{ r.index + 1 }}: {{ r.reason }}</li> }</ul></details>
              }
              <ul class="warnings">@for (w of p.warnings; track w) { <li>{{ w }}</li> }</ul>
              <div class="actions">
                <button type="button" class="btn ghost" (click)="preview.set(null)">Cancel</button>
                <span class="spacer"></span>
                <button type="button" class="btn primary" (click)="commit(p)" [disabled]="busy()">Import</button>
              </div>
            </div>
          }
          @if (imported(); as r) {
            <p class="notice" role="status">Imported {{ r.jobsAdded }} job(s){{ r.profileUpdated ? ' and updated your profile' : '' }}. Skipped {{ r.skipped }}, rejected {{ r.rejected }}.</p>
          }
        </section>
      } @else {
        <p class="muted" role="status">Loading…</p>
      }
    </section>
  `,
})
export class SettingsPage {
  private readonly api = inject(ApiService);
  readonly view = signal<AiSettingsView | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly status = signal('');
  readonly preview = signal<ImportPreview | null>(null);
  readonly imported = signal<ImportResult | null>(null);
  readonly modes: { value: AiMode; title: string; body: string }[] = [
    { value: 'off', title: 'Off', body: 'No AI. All features work.' },
    { value: 'local', title: 'Local model only', body: 'A model running on this computer (Ollama). Nothing leaves this device.' },
    { value: 'cloud', title: 'Local or cloud', body: 'Also allow a cloud provider you choose, with your consent.' },
  ];
  mode: AiMode = 'off';
  provider: ProviderId | null = null;
  model = '';
  baseUrl = '';
  consent = false;
  private readonly modeSig = signal<AiMode>('off');
  private readonly providerSig = signal<ProviderId | null>(null);
  readonly allowedProviders = computed(() => (this.view()?.providers ?? []).filter((p) => this.modeSig() === 'cloud' || p.local));
  readonly selected = computed(() => this.view()?.providers.find((p) => p.id === this.providerSig()) ?? null);

  constructor() {
    void this.load();
  }

  private apply(v: AiSettingsView) {
    this.view.set(v);
    this.mode = v.aiMode;
    this.modeSig.set(v.aiMode);
    this.provider = v.settings.provider;
    this.providerSig.set(v.settings.provider);
    this.model = v.settings.model;
    this.baseUrl = v.settings.baseUrl;
    this.consent = !!(v.settings.provider && v.settings.consent[v.settings.provider]);
  }

  private async load() {
    try {
      this.apply(await this.api.aiSettings());
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not load settings.');
    }
  }

  setMode(m: AiMode) {
    this.mode = m;
    this.modeSig.set(m);
    if (m === 'local' && this.provider && this.provider !== 'ollama') this.provider = null;
  }

  ngDoCheck() {
    if (this.providerSig() !== this.provider) this.providerSig.set(this.provider);
  }

  async save() {
    this.busy.set(true);
    this.error.set(null);
    this.status.set('');
    try {
      await this.api.updateOnboarding({ aiMode: this.mode });
      this.apply(await this.api.updateAiSettings({ provider: this.mode === 'off' ? null : this.provider, model: this.model, baseUrl: this.baseUrl, consentToCloud: this.consent }));
      this.status.set('Settings saved.');
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not save settings.');
    } finally {
      this.busy.set(false);
    }
  }

  async previewFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set(null);
    this.imported.set(null);
    if (file.size > 10 * 1024 * 1024) {
      this.error.set('Import files must be 10 MB or smaller.');
      return;
    }
    try {
      this.preview.set(await this.api.previewImport(file.name, await file.text()));
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Could not read the file.');
    } finally {
      input.value = '';
    }
  }

  async commit(p: ImportPreview) {
    this.busy.set(true);
    try {
      this.imported.set(await this.api.commitImport(p.token));
      this.preview.set(null);
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Import failed. Nothing was changed.');
    } finally {
      this.busy.set(false);
    }
  }

  async test() {
    this.busy.set(true);
    try {
      const r = await this.api.testAi();
      this.status.set(r.ok ? 'Connection works.' : `Connection failed: ${r.detail}`);
    } catch (e) {
      this.error.set(e instanceof ApiProblem ? e.message : 'Test failed.');
    } finally {
      this.busy.set(false);
    }
  }
}

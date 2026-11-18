import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { AiMode, AiSettingsView, ProviderId } from '@reboundops/contracts';
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
          <p><a class="btn ghost" href="/api/export" download>Download a full export (JSON)</a></p>
          <p class="hint">The export contains your profile, jobs, applications, notes, contacts and reminders. Keep it somewhere safe.</p>
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

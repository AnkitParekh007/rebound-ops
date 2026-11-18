import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import axe from 'axe-core';
import { AiAssistPanel } from './ai-assist-panel';

const view = (provider: string | null, local: boolean, active = true) => ({
  settings: { provider, model: 'm', baseUrl: '', consent: {} }, aiMode: local ? 'local' : 'cloud', active, reason: '',
  providers: [{ id: 'ollama', label: 'Ollama', local: true, keyConfigured: true, keyEnvVar: null, defaultModel: null }, { id: 'anthropic', label: 'Anthropic', local: false, keyConfigured: true, keyEnvVar: 'ANTHROPIC_API_KEY', defaultModel: null }],
});

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(AiAssistPanel);
  fixture.componentRef.setInput('applicationId', 'a1');
  fixture.detectChanges();
  return { http, fixture };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('AiAssistPanel', () => {
  it('renders nothing when AI is off', async () => {
    const { http, fixture } = setup();
    http.expectOne('/api/settings/ai').flush(view(null, true, false));
    await tick();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });

  it('shows accepted suggestions with the non-AI result, and withheld ones honestly', async () => {
    const { http, fixture } = setup();
    http.expectOne('/api/settings/ai').flush(view('ollama', true));
    await tick();
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;
    cmp.task = 'missing_skills';
    const p = cmp.run();
    const req = http.expectOne('/api/applications/a1/assist');
    expect(req.request.body).toEqual({ task: 'missing_skills', confirmSend: false });
    req.flush({ task: 'missing_skills', text: 'Kubernetes', items: ['Kubernetes'], accepted: true, problems: [], sent: ['job title, employer and description'], provider: 'ollama', model: 'm', local: true, baseline: ['Kubernetes (required)'] });
    await p;
    fixture.detectChanges();
    expect(el.textContent).toContain('Kubernetes');
    expect(el.textContent).toContain('Without AI (from your records)');
    const result = await axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);

    const q = cmp.run();
    http.expectOne('/api/applications/a1/assist').flush({ task: 'missing_skills', text: '', items: [], accepted: false, problems: ['Adds a number not in your text: "10".'], sent: [], provider: 'ollama', model: 'm', local: true, baseline: [] });
    await q;
    fixture.detectChanges();
    expect(el.textContent).toContain('No suggestion shown.');
    http.verify();
  });

  it('requires per-request consent for a cloud provider', async () => {
    const { http, fixture } = setup();
    http.expectOne('/api/settings/ai').flush(view('anthropic', false));
    await tick();
    fixture.detectChanges();
    const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes('Ask'))!;
    expect(button.disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Send this application’s details to anthropic');
    http.verify();
  });
});

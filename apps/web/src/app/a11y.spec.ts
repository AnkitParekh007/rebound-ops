import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import axe from 'axe-core';
import { App } from './app';
import { IntakePage } from './pages/intake.page';
import { ProfilePage } from './pages/profile.page';
import { SettingsPage } from './pages/settings.page';
import { TrackerPage } from './pages/tracker.page';
import { WelcomePage } from './pages/welcome.page';

/**
 * Automated accessibility smoke checks (WCAG 2.1 A/AA rules that axe can
 * evaluate without layout). Colour contrast needs a real browser and is
 * covered by the design tokens, not here.
 */
const profile = {
  displayName: '', headline: '', targetRoles: [], preferredCountries: [], workArrangements: [], openToRelocation: 'unknown', workAuthorizedCountries: [], requiresSponsorship: 'unknown',
  skills: [], experience: [{ id: 'e1', employer: 'Example', title: 'Analyst', start: '2020-01', end: null, summary: '', highlights: ['Did a thing'], verified: false }],
  contact: { email: '', phone: '', location: '', links: [] }, education: [{ id: 'd1', institution: 'Uni', qualification: '', field: '', start: null, end: null, verified: false }], certifications: [], answers: [], updatedAt: null,
};
const onboarding = { status: 'in_progress', step: 2, aiMode: 'off', goals: { targetRoles: [], timeline: null, weeklyApplicationTarget: null, notes: '' }, updatedAt: null };
const ai = { settings: { provider: null, model: '', baseUrl: '', consent: {} }, aiMode: 'cloud', active: false, reason: 'No provider chosen.', providers: [{ id: 'ollama', label: 'Ollama', local: true, keyConfigured: true, keyEnvVar: null, defaultModel: null }] };

async function audit(component: Type<unknown>, responses: Record<string, object>) {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  for (const [url, body] of Object.entries(responses)) http.match(url).forEach((r) => r.flush(body));
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  document.body.appendChild(el);
  const result = await axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, rules: { 'color-contrast': { enabled: false } } });
  el.remove();
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

describe('accessibility (axe)', () => {
  it('app shell', async () => expect(await audit(App, {})).toEqual([]));
  it('welcome / goals step', async () => expect(await audit(WelcomePage, { '/api/onboarding': onboarding })).toEqual([]));
  it('profile with experience and education rows', async () => expect(await audit(ProfilePage, { '/api/profile': profile })).toEqual([]));
  it('job intake', async () => expect(await audit(IntakePage, {})).toEqual([]));
  it('tracker (empty state)', async () => expect(await audit(TrackerPage, { '/api/applications': [], '/api/assessments': [] })).toEqual([]));
  it('settings', async () => expect(await audit(SettingsPage, { '/api/settings/ai': ai })).toEqual([]));
});

describe('accessibility harness', () => {
  it('detects real violations (negative control)', async () => {
    const el = document.createElement('div');
    // eslint-disable-next-line no-restricted-properties -- static test fixture, not user content
    el.innerHTML = '<img src="x.png"><input type="text"><button></button>';
    document.body.appendChild(el);
    const result = await axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a'] } });
    el.remove();
    expect(result.violations.map((v) => v.id).sort()).toEqual(expect.arrayContaining(['button-name', 'image-alt', 'label']));
  });
});

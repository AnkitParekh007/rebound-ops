import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import axe from 'axe-core';
import { App } from './app';
import { DashboardPage } from './pages/dashboard.page';
import { TrackingPanel } from './tracking-panel';
import { IntakePage } from './pages/intake.page';
import { ProfilePage } from './pages/profile.page';
import { SettingsPage } from './pages/settings.page';
import { TrackerPage } from './pages/tracker.page';
import { WelcomePage } from './pages/welcome.page';
import { DiscoverPage } from './pages/discover.page';
import { InterviewPanel } from './interview-panel';
import { DISCOVERED_FIXTURE, SOURCES_FIXTURE } from './discover.fixtures';

/**
 * Automated accessibility smoke checks (WCAG 2.1 A/AA rules that axe can
 * evaluate without layout). Colour contrast needs a real browser and is
 * covered by the design tokens, not here.
 */
const profile = {
  displayName: '', headline: '', targetRoles: [], preferredCountries: [], workArrangements: [], openToRelocation: 'unknown', workAuthorizedCountries: [], requiresSponsorship: 'unknown',
  skills: [], experience: [{ id: 'e1', employer: 'Example', title: 'Analyst', start: '2020-01', end: null, summary: '', highlights: ['Did a thing'], verified: false }],
  contact: { email: '', phone: '', location: '', links: [] }, education: [{ id: 'd1', institution: 'Uni', qualification: '', field: '', start: null, end: null, verified: false }], certifications: [], answers: [], updatedAt: null,
  skillExperience: [{ skill: 'SQL', years: 3, lastUsed: null }], seniorityLevels: ['mid'], salaryExpectation: null,
};
const onboarding = { status: 'in_progress', step: 2, aiMode: 'off', goals: { targetRoles: [], timeline: null, weeklyApplicationTarget: null, notes: '' }, updatedAt: null };
const at = '2026-03-02T10:00:00.000Z';
const dashboard = {
  total: 2, active: 2, submitted: 1,
  byStatus: { discovered: 0, shortlisted: 1, preparing: 0, ready_for_review: 0, applied: 1, interviewing: 0, offer: 0, rejected: 0, withdrawn: 0 },
  nextActions: [{ applicationId: 'a1', jobTitle: 'Data Engineer', employer: 'Fictional Co', status: 'shortlisted', label: 'Prepare documents' }],
  recentActivity: [{ id: 'x1', applicationId: 'a2', at, kind: 'status_changed', from: 'shortlisted', to: 'applied', note: '', jobTitle: 'SRE', employer: 'Example Ltd' }],
  generatedAt: at,
  analytics: { weekly: [{ weekStart: '2026-02-23', saved: 2, submitted: 1 }], submittedTotal: 1, responded: 0, responseRate: 0, medianDaysToResponse: null, caveat: 'Based on 1 submitted application.' },
  reminders: [{ id: 'r1', applicationId: 'a2', dueOn: '2026-03-01', label: 'Follow up', done: false, doneAt: null, createdAt: at, jobTitle: 'SRE', employer: 'Example Ltd', overdue: true, priority: 'high', notes: '' }],
  followUps: [{ applicationId: 'a2', jobTitle: 'SRE', employer: 'Example Ltd', priority: 'high', reason: 'Reminder overdue since 2026-03-01: Follow up', suggestedKind: null, days: 1 }],
};
const ai = { settings: { provider: null, model: '', baseUrl: '', consent: {} }, aiMode: 'cloud', active: false, reason: 'No provider chosen.', providers: [{ id: 'ollama', label: 'Ollama', local: true, keyConfigured: true, keyEnvVar: null, defaultModel: null }] };

async function audit(component: Type<unknown>, responses: Record<string, object>, inputs: Record<string, unknown> = {}, mustShow?: string) {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(component);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  for (const [url, body] of Object.entries(responses)) http.match(url).forEach((r) => r.flush(body));
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  if (mustShow) expect(el.textContent).toContain(mustShow);
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
  it('settings', async () =>
    expect(
      await audit(
        SettingsPage,
        { '/api/settings/ai': ai, '/api/assessment/weights': { role: 1, skills: 1, experience: 1, location: 1, seniority: 1, salary: 1 }, '/api/follow-up/templates': [{ id: 't1', name: 'Check-in', subject: 'Re: {role}', body: 'Hello' }] },
        {},
        'Follow-up templates',
      ),
    ).toEqual([]));
  it('interview notes panel', async () =>
    expect(
      await audit(
        InterviewPanel,
        { '/api/applications/a1/interviews': [{ id: 'i1', applicationId: 'a1', stage: 'Technical', scheduledFor: at, interviewers: 'Sam Example', preparation: 'Examples', questionsToAsk: 'Team size?', notes: '', outcome: 'pending', createdAt: at, updatedAt: at }] },
        { applicationId: 'a1' },
        'Technical',
      ),
    ).toEqual([]));
  it('discover with consent given and stored postings', async () =>
    expect(await audit(DiscoverPage, { '/api/discovery/sources': { sources: SOURCES_FIXTURE, consent: true }, '/api/discovery/recent': DISCOVERED_FIXTURE }, {}, 'Listed on the board when checked')).toEqual([]));
  it('discover before consent', async () =>
    expect(await audit(DiscoverPage, { '/api/discovery/sources': { sources: SOURCES_FIXTURE, consent: false }, '/api/discovery/recent': [] }, {}, 'Allow ReboundOps to contact job boards?')).toEqual([]));
  it('overview with metrics, next actions and reminders', async () => expect(await audit(DashboardPage, { '/api/dashboard': dashboard }, {}, 'Follow-ups to consider')).toEqual([]));
  it('contacts, reminders and follow-ups panel', async () =>
    expect(
      await audit(
        TrackingPanel,
        {
          '/api/applications/a1/contacts': [{ id: 'c1', applicationId: 'a1', name: 'Sam Example', role: 'Recruiter', email: 'sam@example.test', phone: '', notes: 'Met at a meetup', createdAt: at, updatedAt: at }],
          '/api/applications/a1/reminders': [{ id: 'r1', applicationId: 'a1', dueOn: '2026-03-01', label: 'Follow up', done: false, doneAt: null, createdAt: at, priority: 'high', notes: '' }],
          '/api/follow-up/templates': [{ id: 't1', name: 'Check-in', subject: 'Re: {role}', body: 'Hello' }],
        },
        { applicationId: 'a1' },
        'Sam Example',
      ),
    ).toEqual([]));
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

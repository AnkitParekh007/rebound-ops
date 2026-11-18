import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { JobExtraction, OnboardingState } from '@reboundops/contracts';
import { App } from './app';
import { IntakePage } from './pages/intake.page';
import { WelcomePage } from './pages/welcome.page';

const flush = () => new Promise((r) => setTimeout(r, 0));

function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  return TestBed.inject(HttpTestingController);
}

describe('App shell', () => {
  it('renders a skip link, landmark navigation and the local-data note', async () => {
    setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a.skip-link')?.getAttribute('href')).toBe('#main');
    expect(el.querySelector('nav[aria-label="Main"]')).toBeTruthy();
    expect([...el.querySelectorAll('.nav a')].map((a) => a.textContent?.trim())).toEqual([
      'Overview',
      'Add a job',
      'Tracker',
      'Profile',
      'Setup',
    ]);
    expect(el.textContent).toContain('Your data stays on this computer.');
  });
});

describe('WelcomePage', () => {
  const initial: OnboardingState = {
    status: 'not_started',
    step: 0,
    aiMode: 'off',
    goals: { targetRoles: [], timeline: null, weeklyApplicationTarget: null, notes: '' },
    updatedAt: null,
  };

  it('saves progress on Next and records a skip', async () => {
    const http = setup();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(WelcomePage);
    http.expectOne('/api/onboarding').flush(initial);
    await fixture.whenStable();

    const page = fixture.componentInstance;
    const next = page.next();
    const put = http.expectOne((r) => r.method === 'PUT' && r.url === '/api/onboarding');
    expect(put.request.body).toMatchObject({ status: 'in_progress', step: 1, aiMode: 'off' });
    put.flush({ ...initial, status: 'in_progress', step: 1 });
    await next;
    expect(page.step()).toBe(1);

    const skip = page.skip();
    const put2 = http.expectOne((r) => r.method === 'PUT');
    expect(put2.request.body.status).toBe('skipped');
    put2.flush({ ...initial, status: 'skipped' });
    await skip;
    expect(navigate).toHaveBeenCalledWith('/');
    http.verify();
  });
});

describe('IntakePage', () => {
  const extraction: JobExtraction = {
    title: { value: 'Data Analyst', evidence: 'Job Title: Data Analyst' },
    employer: { value: 'Example Co', evidence: 'Company: Example Co' },
    location: null,
    salary: null,
    workArrangement: null,
    sourceUrl: 'https://jobs.example.test/1',
    sourceHost: 'jobs.example.test',
    description: 'Job Title: Data Analyst\nCompany: Example Co',
    warnings: ['Not verified: the posting was not checked against the live site.'],
  };

  it('keeps provenance honest: unedited fields stay "extracted", edited ones become "user"', async () => {
    const http = setup();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(IntakePage);
    const page = fixture.componentInstance;
    page.description = extraction.description;
    page.url = 'https://jobs.example.test/1';

    const ex = page.extract();
    http.expectOne('/api/jobs/extract').flush(extraction);
    await ex;
    fixture.detectChanges();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Unverified');

    const [title, employer, location] = page.fields();
    employer!.value = 'Example Company Ltd';
    location!.value = 'Remote';
    expect(page.originOf(title!)).toBe('extracted');
    expect(page.originOf(employer!)).toBe('user');

    const save = page.save();
    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/jobs');
    expect(req.request.body.provenance).toEqual({
      title: { origin: 'extracted', evidence: 'Job Title: Data Analyst' },
      employer: { origin: 'user', evidence: null },
      location: { origin: 'user', evidence: null },
      salary: null,
    });
    req.flush({ job: {}, application: { id: 'app-1' } });
    await save;
    await flush();
    http.verify();
  });

  it('offers "Save anyway" when the API reports a duplicate', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(IntakePage);
    const page = fixture.componentInstance;
    page.description = extraction.description;
    const ex = page.extract();
    http.expectOne('/api/jobs/extract').flush(extraction);
    await ex;

    const save = page.save();
    http
      .expectOne('/api/jobs')
      .flush({ error: { code: 'duplicate_job', message: 'dup', details: { existingJobIds: ['j1'] } } }, { status: 409, statusText: 'Conflict' });
    await save;
    expect(page.duplicateOf()).toEqual(['j1']);
    expect(page.error()).toMatch(/already saved/);
  });
});

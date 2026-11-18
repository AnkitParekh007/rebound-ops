import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FitWeightsPanel } from './fit-weights-panel';
import { ProfilePage } from './pages/profile.page';

function setup() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  return TestBed.inject(HttpTestingController);
}

const profile = {
  displayName: 'Jordan Fictional', headline: '', targetRoles: [], preferredCountries: [], workArrangements: [], openToRelocation: 'unknown',
  workAuthorizedCountries: [], requiresSponsorship: 'unknown', skills: ['Python'], experience: [], contact: { email: '', phone: '', location: '', links: [] },
  education: [], certifications: [], answers: [], updatedAt: null,
  skillExperience: [{ skill: 'Python', years: 5, lastUsed: null }], seniorityLevels: ['senior'], salaryExpectation: { minimum: 70000, currency: 'EUR', period: 'year' },
};

describe('FitWeightsPanel', () => {
  it('loads, changes and saves the person’s weights', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(FitWeightsPanel);
    http.expectOne('/api/assessment/weights').flush({ role: 1, skills: 1, experience: 1, location: 1, seniority: 1, salary: 1 });
    await fixture.whenStable();
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('select')).toHaveLength(6);
    cmp.set('salary', 0);
    const p = cmp.save();
    const req = http.expectOne('/api/assessment/weights');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toMatchObject({ salary: 0, role: 1 });
    req.flush({ ...req.request.body });
    await p;
    expect(cmp.saved()).toBe(true);
    http.verify();
  });
});

describe('ProfilePage v0.2.0 fields', () => {
  it('round-trips per-skill years, seniority and minimum pay, and rejects unreadable lines', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(ProfilePage);
    http.expectOne('/api/profile').flush(profile);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    expect(page.skillYears).toBe('Python: 5');
    expect(page.seniority()).toEqual(['senior']);
    expect(page.payMinimum).toBe(70000);

    page.skillYears = 'Python: 5\nnonsense line';
    await page.save();
    expect(page.skillYearsError()).toMatch(/Could not read “nonsense line”/);
    http.expectNone('/api/profile');

    page.skillYears = 'Python: 5\nSQL - 3 years';
    page.toggleSeniority('staff');
    const saving = page.save();
    const req = http.expectOne((r) => r.method === 'PUT' && r.url === '/api/profile');
    expect(req.request.body).toMatchObject({
      skillExperience: [{ skill: 'Python', years: 5 }, { skill: 'SQL', years: 3 }],
      seniorityLevels: ['senior', 'staff'],
      salaryExpectation: { minimum: 70000, currency: 'EUR', period: 'year' },
    });
    req.flush({ ...profile, ...req.request.body });
    await saving;
    http.verify();
  });
});

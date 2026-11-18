import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfilePage } from './pages/profile.page';
import { DocumentsPanel } from './documents-panel';

function setup() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  return TestBed.inject(HttpTestingController);
}

const emptyProfile = {
  displayName: 'Existing Name', headline: '', targetRoles: [], preferredCountries: [], workArrangements: [], openToRelocation: 'unknown',
  workAuthorizedCountries: [], requiresSponsorship: 'unknown', skills: ['SQL'],
  experience: [{ id: 'e0', employer: 'Kept Co', title: 'Analyst', start: '2020-01', end: null, summary: '', highlights: [], verified: true }],
  contact: { email: 'kept@example.test', phone: '', location: '', links: [] }, education: [], certifications: [], answers: [], updatedAt: null,
};

describe('ProfilePage resume import', () => {
  it('adds imported facts as unverified without overwriting existing data', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(ProfilePage);
    http.expectOne('/api/profile').flush(emptyProfile);
    await fixture.whenStable();
    const page = fixture.componentInstance;

    page.pasted = 'resume';
    page.importPasted();
    http.expectOne('/api/resume/import').flush({
      file: { id: 'f1', filename: 'pasted-resume.txt', mediaType: 'text/plain', sha256: 'x', size: 6, importedAt: '2026-01-01T00:00:00.000Z' },
      text: 'resume',
      warnings: [],
      proposal: {
        displayName: 'Imported Name', headline: 'Imported headline',
        contact: { email: 'imported@example.test', phone: '+1 555 0100', location: 'Porto, Portugal', links: [] },
        experience: [
          { id: 'n1', employer: 'Kept Co', title: 'Analyst', start: '2020-01', end: null, summary: '', highlights: [], verified: false },
          { id: 'n2', employer: 'New Co', title: 'Engineer', start: '2018-01', end: '2019-12', summary: '', highlights: ['Did a thing'], verified: false },
        ],
        education: [], certifications: [], skills: ['SQL', 'Python'],
      },
    });
    await fixture.whenStable();
    // The duplicate role is pre-deselected; the new one is selected.
    expect(page.reviewExperience().map((x) => x.selected)).toEqual([false, true]);
    page.applyReview();

    expect(page.displayName).toBe('Existing Name');
    expect(page.email).toBe('kept@example.test');
    expect(page.phone).toBe('+1 555 0100');
    expect(page.headline).toBe('Imported headline');
    expect(page.skills).toBe('SQL, Python');
    expect(page.experience().map((e) => [e.employer, e.verified])).toEqual([['Kept Co', true], ['New Co', false]]);
    http.verify();
  });
});

describe('DocumentsPanel export', () => {
  it('shows why an export was blocked', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(DocumentsPanel);
    fixture.componentRef.setInput('applicationId', 'a1');
    fixture.detectChanges();
    http.expectOne('/api/applications/a1/documents').flush({ resume: null, coverLetter: null, profileChangedSinceDraft: false });
    await fixture.whenStable();

    const p = fixture.componentInstance.download('cover_letter', 'pdf');
    http.expectOne((r) => r.method === 'PUT').flush({ resume: null, coverLetter: null, profileChangedSinceDraft: false });
    await new Promise((r) => setTimeout(r, 0));
    const body = new Blob([JSON.stringify({ error: { code: 'export_check_failed', message: 'Replace 1 placeholder: [[x]]' } })], { type: 'application/json' });
    http.expectOne((r) => r.url.endsWith('/cover_letter/export')).flush(body, { status: 422, statusText: 'Unprocessable' });
    await p;
    expect(fixture.componentInstance.error()).toBe('Export blocked: Replace 1 placeholder: [[x]]');
  });
});

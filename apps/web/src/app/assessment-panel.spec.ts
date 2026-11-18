import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Assessment } from '@reboundops/contracts';
import { AssessmentPanel } from './assessment-panel';

const assessment: Assessment = {
  applicationId: 'a1',
  rubricVersion: 'fit-2026.1',
  assessedAt: '2026-06-01T00:00:00.000Z',
  fit: {
    overall: null,
    scoredCriteria: 1,
    totalCriteria: 4,
    criteria: [
      { key: 'role', label: 'Role alignment', weight: 0.3, score: 5, rationale: 'The title matches your target role "Analyst".', evidence: [{ source: 'job', text: 'Title: Analyst' }], missing: [] },
      { key: 'skills', label: 'Skills mentioned', weight: 0.3, score: null, rationale: 'No skills in your profile to compare with.', evidence: [], missing: ['Skills'] },
    ],
  },
  eligibility: {
    status: 'ineligible',
    checks: [
      {
        key: 'work_authorization',
        label: 'Work authorisation',
        status: 'ineligible',
        reason: 'The posting says it cannot sponsor visas, and you stated you need sponsorship.',
        evidence: [{ source: 'job', text: 'We are unable to offer visa sponsorship.' }, { source: 'profile', text: 'You need visa sponsorship: yes' }],
        missing: [],
      },
    ],
  },
  missingInfo: ['Skills'],
  disclaimer: 'A rule-based estimate.',
};

describe('AssessmentPanel', () => {
  it('shows unscored fit honestly, the disqualifier with both evidence sources, and what to add', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AssessmentPanel);
    fixture.componentRef.setInput('applicationId', 'a1');
    fixture.detectChanges();
    http.expectOne('/api/applications/a1/assessment').flush(assessment);
    // Let the component's async load settle (firstValueFrom → signal update).
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.score')?.getAttribute('aria-label')).toBe('Fit not scored');
    expect(el.textContent).toContain('Not enough information to score fit — 1 of 4');
    expect(el.textContent).toContain('Likely ineligible');
    expect(el.textContent).toContain('Your profile');
    expect(el.textContent).toContain('unable to offer visa sponsorship');
    expect(el.querySelector('.notice li')?.textContent).toBe('Skills');
    expect(el.textContent).toContain('Not scored');
    http.verify();
  });
});

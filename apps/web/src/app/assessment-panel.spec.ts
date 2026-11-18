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
      { key: 'role', label: 'Role alignment', weight: 0.3, score: 5, rationale: 'The title matches your target role "Analyst".', evidence: [{ source: 'job', text: 'Title: Analyst' }], missing: [], confidence: 'medium' },
      { key: 'skills', label: 'Skills mentioned', weight: 0.3, score: null, rationale: 'No skills in your profile to compare with.', evidence: [], missing: ['Skills'], confidence: 'low' },
    ],
    confidence: 'low',
    uncertainty: ['Not scored for lack of information: Skills mentioned.'],
  },
  requirements: [
    { text: '3+ years with SQL', kind: 'required', basis: 'under “Requirements”', matchedSkills: [], missingSkills: ['SQL'], years: { skill: 'SQL', required: 3, stated: null, status: 'unknown' } },
  ],
  missingQualifications: ['SQL (required)'],
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
    // v0.2.0: confidence, missing required qualifications and required/preferred lines are shown.
    expect(el.querySelector('.confidence')?.textContent).toContain('Confidence: low');
    expect(el.textContent).toContain('Required qualifications your profile does not show');
    expect(el.textContent).toContain('SQL (required)');
    expect(el.querySelector('.requirements li')?.textContent).toMatch(/3\+ years with SQL[\s\S]*Required[\s\S]*your years not entered/);
    http.verify();
  });
});

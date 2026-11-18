import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { PackageView } from '@reboundops/contracts';
import { PreparePanel } from './prepare-panel';

const view: PackageView = {
  package: {
    kind: 'package', applicationId: 'a1', updatedAt: '2026-01-01T00:00:00.000Z', officialApplyUrl: null, eligibilityAcknowledged: false,
    exports: { resume: null, cover_letter: null },
    answers: [{ id: 'q1', question: 'What are your salary expectations?', answer: '', status: 'needs_input', source: { kind: 'none', detail: '' }, note: 'Salary expectations are yours to state.' }],
  },
  checklist: [{ key: 'official_link', label: 'Official application link', done: true, detail: '', optional: false }],
  applyUrl: 'https://jobs.example.test/1',
  ready: false,
};

describe('PreparePanel', () => {
  it('labels ungrounded answers and sends the person’s own answer when reviewed', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PreparePanel);
    fixture.componentRef.setInput('applicationId', 'a1');
    fixture.detectChanges();
    http.expectOne('/api/applications/a1/package').flush(view);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Needs your answer');
    expect(el.querySelector('a.btn.primary')?.getAttribute('href')).toBe('https://jobs.example.test/1');
    expect(el.querySelector('a.btn.primary')?.getAttribute('rel')).toContain('noopener');

    const page = fixture.componentInstance;
    page.edits['q1'] = 'Within the posted range.';
    const p = page.review(view.package.answers[0]!);
    const req = http.expectOne((r) => r.method === 'PUT');
    expect(req.request.body).toEqual({ answer: 'Within the posted range.', reviewed: true, saveToProfile: false });
    req.flush(view);
    await p;
    http.verify();
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TrackingPanel } from './tracking-panel';

describe('TrackingPanel', () => {
  it('drafts follow-ups without sending anything, offering only copy or the user’s own mail app', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(TrackingPanel);
    fixture.componentRef.setInput('applicationId', 'a1');
    fixture.detectChanges();
    http.expectOne('/api/applications/a1/contacts').flush([]);
    http.expectOne('/api/applications/a1/reminders').flush([]);
    await fixture.whenStable();

    const p = fixture.componentInstance.draftFollowUp();
    http.expectOne((r) => r.url === '/api/applications/a1/follow-up' && r.params.get('kind') === 'after_applying').flush({
      kind: 'after_applying', to: 'sam@example.test', subject: 'Following up', body: 'Hello Sam,\n[[Add a line]]', placeholders: 1, mailto: null,
    });
    await p;
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('ReboundOps does not send messages.');
    expect(el.textContent).toContain('Fill the [[placeholders]]');
    expect(el.querySelector('a.btn')?.getAttribute('href')).toBe('mailto:sam%40example.test?subject=Following%20up&body=Hello%20Sam%2C%0A%5B%5BAdd%20a%20line%5D%5D');
    // Only GET requests were made: nothing was posted or sent.
    http.verify();
  });
});

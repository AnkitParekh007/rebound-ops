import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DISCOVERED_FIXTURE, SOURCES_FIXTURE } from './discover.fixtures';
import { ago, DiscoverPage } from './pages/discover.page';

function setup() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  return TestBed.inject(HttpTestingController);
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('DiscoverPage', () => {
  it('asks before contacting any job board, then searches with the chosen filters', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(DiscoverPage);
    http.expectOne('/api/discovery/sources').flush({ sources: SOURCES_FIXTURE, consent: false });
    http.expectOne('/api/discovery/recent').flush([]);
    await fixture.whenStable();
    await tick();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Only the board name you type is sent');
    expect(el.querySelector('#search-heading')).toBeNull();

    const page = fixture.componentInstance;
    const allowing = page.allow();
    const consent = http.expectOne('/api/discovery/consent');
    expect(consent.request.body).toEqual({ granted: true });
    consent.flush({ consent: true });
    await allowing;
    fixture.detectChanges();
    expect(el.querySelector('#search-heading')).not.toBeNull();
    // Unsupported providers are not offered for search.
    expect([...el.querySelectorAll('#source option')].map((o) => o.textContent?.trim())).toEqual(['Detect from the URL', 'Greenhouse']);

    page.board = 'https://job-boards.greenhouse.io/examplerobotics';
    page.remoteOnly = true;
    const searching = page.search(false);
    const req = http.expectOne('/api/discovery/search');
    expect(req.request.body).toEqual({ board: 'https://job-boards.greenhouse.io/examplerobotics', query: '', country: '', remoteOnly: true, refresh: false });
    req.flush({ source: 'greenhouse', board: 'examplerobotics', employer: 'Example Robotics', fetchedAt: '2026-11-18T10:00:00.000Z', fromCache: false, totalListed: 2, postings: DISCOVERED_FIXTURE, notes: ['Greenhouse publishes pay ranges per posting.'] });
    await tick();
    http.expectOne('/api/discovery/recent').flush([]);
    await searching;
    fixture.detectChanges();
    expect(el.querySelector('#results-heading')?.textContent).toContain('Example Robotics · Greenhouse');
    const cards = el.querySelectorAll('.posting');
    expect(cards[0]?.textContent).toContain('Listed on the board when checked 3 hours ago');
    expect(cards[0]?.textContent).toContain('Pay not published in the feed');
    expect(cards[0]?.querySelector('a[target="_blank"]')?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(cards[1]?.textContent).toContain('No longer listed on the board');
    expect(cards[1]?.textContent).toContain('Possible duplicate of a saved job: Backend Engineer');
    expect(cards[1]?.textContent).toContain('board name — the provider does not publish the company name');
    http.verify();
  });

  it('saves to the tracker, asking before saving a likely duplicate', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(DiscoverPage);
    http.expectOne('/api/discovery/sources').flush({ sources: SOURCES_FIXTURE, consent: true });
    http.expectOne('/api/discovery/recent').flush(DISCOVERED_FIXTURE);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    const p = DISCOVERED_FIXTURE[1]!;
    page.employerEdits[p.id] = 'Fictional Payments';

    let saving = page.save(p, false);
    http.expectOne('/api/discovery/d2/save').flush({ error: { code: 'duplicate_job', message: 'dup' } }, { status: 409, statusText: 'Conflict' });
    await saving;
    expect(page.dupConfirm()['d2']).toBe(true);

    saving = page.save(p, true);
    const req = http.expectOne('/api/discovery/d2/save');
    expect(req.request.body).toEqual({ employer: 'Fictional Payments', allowDuplicate: true });
    req.flush({ job: {}, application: { id: 'app-9' } });
    await saving;
    fixture.detectChanges();
    expect(page.savedApp()['d2']).toBe('app-9');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Saved — open in tracker');
    http.verify();
  });

  it('formats freshness', () => {
    expect(ago(0.2)).toBe('less than an hour ago');
    expect(ago(1)).toBe('1 hour ago');
    expect(ago(72)).toBe('3 days ago');
  });
});

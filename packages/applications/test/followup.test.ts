import { describe, expect, it } from 'vitest';
import { Profile, type ApplicationView } from '@reboundops/contracts';
import { followUpDraft } from '../src/index.ts';

const app = {
  id: 'a1', jobId: 'j1', status: 'applied', createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z', statusChangedAt: '2026-06-02T00:00:00.000Z', appliedConfirmedAt: '2026-06-02T00:00:00.000Z',
  job: { id: 'j1', title: 'Data Analyst', employer: 'Example Co', location: null, salary: null, workArrangement: null, sourceUrl: null, description: '', provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null }, verification: { status: 'unverified', checkedAt: null, note: '' }, dedupeKey: 'k', capturedAt: '2026-06-01T00:00:00.000Z' },
  activity: [], allowedNext: [],
} satisfies ApplicationView;
const contact = { id: 'c1', applicationId: 'a1', name: 'Sam Recruiter', role: 'Recruiter', email: 'sam@example.test', phone: '', notes: '', createdAt: app.createdAt, updatedAt: app.createdAt };

describe('followUpDraft', () => {
  it('uses only saved facts and leaves placeholders for the person', () => {
    const d = followUpDraft('after_applying', app, Profile.parse({ displayName: 'Casey Example' }), contact);
    expect(d.body).toContain('Hello Sam,');
    expect(d.body).toContain('I applied for the Data Analyst role at Example Co on 2 June 2026');
    expect(d.body).toMatch(/Kind regards,\nCasey Example$/);
    expect(d.placeholders).toBe(1);
    expect(d.mailto).toMatch(/^mailto:sam%40example\.test\?subject=/);
  });

  it('has no recipient or mailto without a contact email', () => {
    const d = followUpDraft('thank_you', app, Profile.parse({}), null);
    expect(d).toMatchObject({ to: null, mailto: null });
    expect(d.body).toContain('[[Your name]]');
  });
});

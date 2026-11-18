import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Profile } from '@reboundops/contracts';
import { ImportFormatError, planImport } from '../src/index.ts';

const fixture = readFileSync(new URL('../../../tests/fixtures/import/synthetic-v1.json', import.meta.url), 'utf8');
const empty = { profile: Profile.parse({}), dedupeKeys: new Set<string>() };

describe('planImport', () => {
  it('plans additions, flags duplicates and rejects bad records individually', () => {
    const plan = planImport(fixture, empty);
    expect(plan.preview.jobs.toAdd.map((j) => [j.title, j.status])).toEqual([['Operations Analyst', 'interviewing'], ['Data Coordinator', 'discovered']]);
    expect(plan.preview.jobs.duplicates).toEqual([expect.objectContaining({ index: 1, reason: 'Appears more than once in the file.' })]);
    expect(plan.preview.jobs.rejected.map((r) => r.index)).toEqual([3, 4, 5]);
    expect(plan.preview.jobs.rejected[2]!.reason).toMatch(/runScript/);
    expect(plan.preview.profile).toMatchObject({ skillsToAdd: ['Excel', 'SQL', 'Tableau'], experienceToAdd: 1, educationToAdd: 1, answersToAdd: 1 });
    expect(plan.profilePatch.experience![0]!.verified).toBe(false);
  });

  it('never overwrites existing profile values', () => {
    const plan = planImport(fixture, { profile: Profile.parse({ displayName: 'Existing Person', skills: ['sql'], contact: { email: 'mine@example.test' } }), dedupeKeys: new Set() });
    expect(plan.profilePatch.displayName).toBeUndefined();
    expect(plan.profilePatch.contact!.email).toBe('mine@example.test');
    expect(plan.preview.profile.skillsToAdd).toEqual(['Excel', 'Tableau']);
  });

  it('skips jobs already in the database', () => {
    const first = planImport(fixture, empty);
    const keys = new Set(first.jobs.map((j) => j.dedupeKey));
    expect(planImport(fixture, { ...empty, dedupeKeys: keys }).preview.jobs.toAdd).toEqual([]);
  });

  it('rejects hostile or malformed files safely', () => {
    const bad = [
      ['not json', /not valid JSON/],
      ['[]', /JSON object/],
      ['{"format":"something-else"}', /Unrecognised file/],
      ['{"format":"reboundops-import","formatVersion":2}', /does not match/],
      ['{"format":"reboundops-import","formatVersion":1,"__proto__":{"polluted":true}}', /does not match/],
      ['{"format":"reboundops-import","formatVersion":1,"profile":{"constructor":{"prototype":{"x":1}}}}', /does not match/],
      [`{"format":"reboundops-import","formatVersion":1,"profile":${'{"a":'.repeat(20)}1${'}'.repeat(20)}}`, /nested too deeply/],
      ['{"format":"reboundops-import","formatVersion":1,"profile":{"links":[{"url":"javascript:alert(1)"}]}}', /does not match/],
    ] as const;
    for (const [content, msg] of bad) expect(() => planImport(content, empty), content.slice(0, 40)).toThrow(msg);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(() => planImport('{"format":"reboundops-import"}', empty)).toThrow(ImportFormatError);
  });
});

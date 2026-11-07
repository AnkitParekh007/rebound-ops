import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobTargetsComponent, REQUIREMENT_LINES_MESSAGE } from './job-targets.component';
import { SessionStore } from '../../core/session-store';
import { FORM_INVALID_MESSAGE } from '../../core/form-validation';
import { fictionalSession } from '../../testing/fixtures';

describe('JobTargetsComponent', () => {
  const session = fictionalSession({
    jobTargets: [{ id: '7d2c1b0a-9f8e-4d6c-8b5a-493827161504', title: 'Fictional role', sourceUrl: '', requirements: [
      { id: '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d', text: 'Build components', status: 'unreviewed', evidenceIds: [] }
    ] }]
  });
  let store: Record<string, unknown> & { addJobTarget: ReturnType<typeof vi.fn>; reviewRequirement: ReturnType<typeof vi.fn>; setError: ReturnType<typeof vi.fn> };
  let component: JobTargetsComponent;

  beforeEach(() => {
    store = {
      busy: signal(false), aiStatus: signal(null), aiPreview: signal(null), aiAnalysis: signal(null),
      addJobTarget: vi.fn().mockResolvedValue(session), reviewRequirement: vi.fn(), setError: vi.fn()
    };
    TestBed.configureTestingModule({ providers: [{ provide: SessionStore, useValue: store }] });
    const fixture = TestBed.createComponent(JobTargetsComponent);
    fixture.componentRef.setInput('session', session);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('requires 1–12 non-empty requirement lines and a contract-valid title and URL', async () => {
    component.targetForm.setValue({ title: 'Role', sourceUrl: '', requirements: ' \n ' });
    await component.addTarget();
    expect(store.setError).toHaveBeenCalledWith(REQUIREMENT_LINES_MESSAGE);

    component.targetForm.setValue({ title: 'Role', sourceUrl: 'http://insecure.example', requirements: 'One' });
    await component.addTarget();
    expect(store.setError).toHaveBeenLastCalledWith(FORM_INVALID_MESSAGE);
    expect(component.error(component.targetForm.controls.sourceUrl)).toBe('Source URL must use HTTPS');
    expect(store.addJobTarget).not.toHaveBeenCalled();
  });

  it('submits trimmed values and one requirement per non-empty line, then resets', async () => {
    component.targetForm.setValue({ title: '  Role ', sourceUrl: ' https://example.org/j ', requirements: 'A\n\n B ' });
    await component.addTarget();
    expect(store.addJobTarget).toHaveBeenCalledWith({ title: 'Role', sourceUrl: 'https://example.org/j', requirements: ['A', 'B'] });
    expect(component.targetForm.controls.title.value).toBe('');
  });

  it('will not mark a requirement supported without a confirmed claim selected', async () => {
    const [target] = session.jobTargets;
    await component.reviewRequirement(target!.id, target!.requirements[0]!.id, 'supported');
    expect(store.reviewRequirement).not.toHaveBeenCalled();
    expect(store.setError).toHaveBeenCalledWith(expect.stringMatching(/participant-confirmed achievement/));

    component.evidenceSelection[target!.requirements[0]!.id] = session.intake.evidence[0]!.id;
    await component.reviewRequirement(target!.id, target!.requirements[0]!.id, 'supported');
    expect(store.reviewRequirement).toHaveBeenCalledWith(target!.id, target!.requirements[0]!.id, 'supported', [session.intake.evidence[0]!.id]);
  });
});

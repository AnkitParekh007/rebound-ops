import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntakeSchema } from '@reboundops/contracts';
import { IntakeComponent, MAX_EVIDENCE_LINES } from './intake.component';
import { SessionStore } from '../../core/session-store';
import { FORM_INVALID_MESSAGE } from '../../core/form-validation';
import { fictionalSession } from '../../testing/fixtures';

describe('IntakeComponent (typed form on IntakeSchema)', () => {
  let store: ReturnType<typeof storeStub>;
  let component: IntakeComponent;

  /** Minimal store double: the signals the template reads, plus spied intents. */
  function storeStub() {
    return {
      busy: signal(false), apiAvailable: signal(true), session: signal(null),
      persistenceStatus: signal(null), savedSessions: signal([]),
      submitIntake: vi.fn().mockResolvedValue(null), setError: vi.fn(), reset: vi.fn(),
      resumeSaved: vi.fn(), restoreBackup: vi.fn()
    };
  }

  beforeEach(() => {
    store = storeStub();
    TestBed.configureTestingModule({ providers: [{ provide: SessionStore, useValue: store }] });
    const fixture = TestBed.createComponent(IntakeComponent);
    fixture.detectChanges(); // renders the real template against the stub
    component = fixture.componentInstance;
  });

  it('keeps the evidence line limit in sync with the contract', () => {
    const items = (n: number) => Array.from({ length: n }, () => fictionalSession().intake.evidence[0]!);
    expect(IntakeSchema.shape.evidence.safeParse(items(MAX_EVIDENCE_LINES)).success).toBe(true);
    expect(IntakeSchema.shape.evidence.safeParse(items(MAX_EVIDENCE_LINES + 1)).success).toBe(false);
  });

  it('starts blank, so fictional data is never submitted by accident; the example loads on request', () => {
    expect(component.form.controls.role.value).toBe('');
    expect(component.form.valid).toBe(false);
    component.demo();
    expect(component.form.valid).toBe(true);
    expect(IntakeSchema.safeParse(component.toIntake()).success).toBe(true);
  });

  it('blocks submission and explains why when a field breaks the contract', async () => {
    component.form.controls.role.setValue('   ');
    await component.submit();
    expect(store.submitIntake).not.toHaveBeenCalled();
    expect(store.setError).toHaveBeenCalledWith(FORM_INVALID_MESSAGE);
    expect(component.error('role')).toBe('This field is required.');
  });

  it('keeps the specific message for too many evidence lines', async () => {
    component.form.controls.evidenceText.setValue(Array.from({ length: 16 }, (_, i) => 'Claim ' + i).join('\n'));
    await component.submit();
    expect(store.setError).toHaveBeenCalledWith('Use at most 15 evidence lines.');
  });

  it('submits trimmed, unverified, manually sourced claims', async () => {
    component.form.patchValue({ role: '  Engineer  ', evidenceText: ' first \n\n second ' });
    await component.submit();
    const build = store.submitIntake.mock.calls[0]![0] as () => ReturnType<IntakeComponent['toIntake']>;
    const intake = build();
    expect(intake.role).toBe('Engineer');
    expect(intake.evidence.map(e => [e.claim, e.status, e.source.label])).toEqual([
      ['first', 'unverified', 'User-entered line 1'],
      ['second', 'unverified', 'User-entered line 2']
    ]);
  });

  it('clear() empties the form; a new active session (guided answers, resume, restore) refills it', () => {
    component.demo();
    component.clear();
    expect(component.form.controls.role.value).toBe('');
    const session = fictionalSession();
    store.session.set(session as never);
    TestBed.tick();
    expect(component.form.controls.role.value).toBe(session.intake.role);
    expect(component.form.controls.evidenceText.value).toBe('Led a fictional component migration');
  });
});

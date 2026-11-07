import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Session } from '@reboundops/contracts';
import { SessionStore } from './session-store';
import { WizardStore } from './wizard';
import { fictionalSession } from '../testing/fixtures';

describe('WizardStore', () => {
  let session: ReturnType<typeof signal<Session | null>>;
  let wizard: WizardStore;

  const status = (id: string) => wizard.steps().find(s => s.id === id)!.status;

  beforeEach(() => {
    history.replaceState(null, '', '/');
    session = signal<Session | null>(null);
    TestBed.configureTestingModule({ providers: [{ provide: SessionStore, useValue: { session } }] });
    wizard = TestBed.inject(WizardStore);
    wizard.init();
  });

  it('starts on "About you" and locks every step that needs a session', () => {
    expect(wizard.current()).toBe('start');
    expect(location.hash).toBe('#start');
    for (const id of ['evidence', 'jobs', 'options', 'plan', 'data', 'feedback']) {
      expect(status(id)).toBe('locked');
    }
    expect(wizard.go('options')).toBe(false);
    expect(wizard.current()).toBe('start');
    expect(wizard.next()).toBeNull();
  });

  it('derives statuses from the session, not from form state', () => {
    session.set(fictionalSession());
    TestBed.tick();
    expect(status('start')).toBe('current');
    expect(status('evidence')).toBe('done'); // the fixture has one confirmed claim
    expect(status('jobs')).toBe('optional');
    expect(status('options')).toBe('todo');
    expect(status('plan')).toBe('locked');
    expect(wizard.steps().find(s => s.id === 'plan')!.lockedReason).toBe('Choose one of your options first');
    expect(wizard.next()?.id).toBe('evidence');
  });

  it('mirrors the current step in the URL hash and counts navigations for focus', () => {
    session.set(fictionalSession());
    TestBed.tick();
    expect(wizard.go('jobs')).toBe(true);
    expect(location.hash).toBe('#jobs');
    expect(wizard.position()).toBe(3);
    expect(wizard.previous()?.id).toBe('evidence');
    expect(wizard.navigations()).toBe(1);
    wizard.go('data');
    expect(wizard.position()).toBe(0);
    expect(wizard.next()).toBeNull();
  });

  it('follows browser Back/forward via hashchange', () => {
    session.set(fictionalSession());
    TestBed.tick();
    history.replaceState(null, '', '#options');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(wizard.current()).toBe('options');
  });

  it('ignores an unknown or locked step in the URL', () => {
    history.replaceState(null, '', '#plan');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(wizard.current()).toBe('start');
    expect(location.hash).toBe('#start');
  });

  it('returns to "About you" when the session is cleared', () => {
    session.set(fictionalSession());
    TestBed.tick();
    wizard.go('evidence');
    session.set(null);
    TestBed.tick();
    expect(wizard.current()).toBe('start');
  });
});

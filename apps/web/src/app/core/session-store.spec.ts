import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { Session } from '@reboundops/contracts';
import { SessionStore } from './session-store';
import { SessionApiService } from './session-api.service';
import type { AiPreview } from './api-types';
import { fictionalSession } from '../testing/fixtures';

type ApiStub = { [K in keyof SessionApiService]: Mock };

function apiStub(): ApiStub {
  const methods = Object.getOwnPropertyNames(SessionApiService.prototype)
    .filter(name => name !== 'constructor' && name !== 'path');
  return Object.fromEntries(methods.map(name => [name, vi.fn()])) as unknown as ApiStub;
}

const conflict = (latest: Session) => new HttpErrorResponse({ status: 409, error: { error: 'STALE_REVISION', session: latest } });
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
};

function preview(session: Session): AiPreview {
  return {
    enabled: true, provider: 'mock', model: 'm', sessionRevision: session.revision, previewHash: 'a'.repeat(64),
    payload: { target: { id: 't', title: 'T', requirements: [{ id: 'r', text: 'R' }] }, evidence: [] }
  };
}

describe('SessionStore', () => {
  let api: ApiStub;
  let store: SessionStore;
  let session: Session;

  beforeEach(() => {
    api = apiStub();
    TestBed.configureTestingModule({ providers: [{ provide: SessionApiService, useValue: api }] });
    store = TestBed.inject(SessionStore);
    session = fictionalSession();
  });

  async function withSession(s = session): Promise<void> {
    api.create.mockResolvedValueOnce(s);
    await store.submitIntake(() => s.intake);
  }

  it('creates a session, then replaces the intake with the current revision', async () => {
    await withSession();
    expect(store.session()).toEqual(session);
    expect(store.notice()).toMatch(/Your answers are recorded/);

    const next = { ...session, revision: 1 };
    api.replaceIntake.mockResolvedValueOnce(next);
    await store.submitIntake(() => session.intake);
    expect(api.replaceIntake).toHaveBeenCalledWith(session.id, 0, session.intake);
    expect(store.session()?.revision).toBe(1);
  });

  it('sends the last-seen revision with every mutation', async () => {
    await withSession({ ...session, revision: 4 });
    api.selectRoute.mockResolvedValueOnce({ ...session, revision: 5 });
    await store.chooseRoute('bridge');
    expect(api.selectRoute).toHaveBeenCalledWith(session.id, 4, 'bridge');
  });

  it('on a 409 conflict loads the server version and asks the user to retry', async () => {
    await withSession();
    const latest = { ...session, revision: 9, reviewNotes: 'changed elsewhere' };
    api.decideEvidence.mockRejectedValueOnce(conflict(latest));
    const result = await store.decideEvidence(session.intake.evidence[0]!.id, 'rejected');
    expect(result).toBeNull();
    expect(store.session()).toEqual(latest);
    expect(store.error()).toMatch(/Latest version loaded; please retry/);
    expect(store.busy()).toBe(false);
  });

  it('runs one request at a time and ignores clicks while busy', async () => {
    await withSession();
    const pending = deferred<Session>();
    api.selectRoute.mockReturnValueOnce(pending.promise);
    const first = store.chooseRoute('return');
    expect(store.busy()).toBe(true);
    expect(await store.chooseRoute('shift')).toBeNull();
    expect(api.selectRoute).toHaveBeenCalledTimes(1);
    pending.resolve({ ...session, revision: 1 });
    await first;
    expect(store.busy()).toBe(false);
  });

  it('surfaces validation errors thrown while building the intake without calling the API', async () => {
    await store.submitIntake(() => { throw new Error('Use at most 15 evidence lines.'); });
    expect(store.error()).toBe('Use at most 15 evidence lines.');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('invalidates a prepared AI preview after any successful session change', async () => {
    await withSession();
    api.previewAi.mockResolvedValueOnce(preview(session));
    await store.previewAi('t');
    expect(store.aiPreview()).not.toBeNull();
    api.recordReview.mockResolvedValueOnce({ ...session, revision: 1 });
    await store.saveReview('note');
    expect(store.aiPreview()).toBeNull();
  });

  it('sends exactly the previewed payload hash and revision on consent, and clears it on a stale preview', async () => {
    await withSession();
    const p = preview(session);
    api.previewAi.mockResolvedValueOnce(p);
    api.aiStatus.mockResolvedValue({ enabled: true });
    await store.previewAi('t');
    api.analyzeAi.mockRejectedValueOnce(new HttpErrorResponse({ status: 409, error: { error: 'STALE_PREVIEW' } }));
    await store.analyzeAi();
    expect(api.analyzeAi).toHaveBeenCalledWith(session.id, p);
    expect(store.aiPreview()).toBeNull();
    expect(store.error()).toMatch(/Prepare a new preview/);
  });

  it('never calls the provider without a prepared, enabled preview', async () => {
    await withSession();
    await store.analyzeAi();
    api.previewAi.mockResolvedValueOnce({ ...preview(session), enabled: false });
    await store.previewAi('t');
    await store.analyzeAi();
    expect(api.analyzeAi).not.toHaveBeenCalled();
  });

  it('refreshes saved sessions after changing persistence', async () => {
    await withSession();
    api.setPersistence.mockResolvedValueOnce({ ...session, persistence: 'disk', revision: 1 });
    api.persistenceStatus.mockResolvedValueOnce({ available: true, savedCount: 1, warnings: [] });
    api.savedSessions.mockResolvedValueOnce([{ id: session.id, role: 'r', updatedAt: 'now', revision: 1 }]);
    await store.changePersistence('disk');
    expect(api.setPersistence).toHaveBeenCalledWith(session.id, 0, 'disk');
    expect(store.savedSessions()).toHaveLength(1);
  });

  it('deletes the session, or reloads it when deletion lost a race', async () => {
    await withSession();
    api.delete.mockRejectedValueOnce(conflict({ ...session, revision: 2 }));
    expect(await store.deleteSession()).toBe(false);
    expect(store.session()?.revision).toBe(2);

    api.delete.mockResolvedValueOnce(undefined);
    api.persistenceStatus.mockResolvedValueOnce({ available: false, savedCount: 0, warnings: [] });
    api.savedSessions.mockResolvedValueOnce([]);
    expect(await store.deleteSession()).toBe(true);
    expect(api.delete).toHaveBeenLastCalledWith(session.id, 2);
    expect(store.session()).toBeNull();
    expect(store.activeSession()).toEqual([]);
  });

  it('exposes the active session as a keyed list and counts completed actions', async () => {
    expect(store.activeSession()).toEqual([]);
    const plan = { routeId: 'return' as const, budgetMinutes: 180, plannedMinutes: 60, actions: [
      { id: 'a1', day: 1, title: 'A', minutes: 30, completed: true },
      { id: 'a2', day: 2, title: 'B', minutes: 30, completed: false }
    ] };
    await withSession({ ...session, plan });
    expect(store.activeSession()).toHaveLength(1);
    expect(store.completedCount()).toBe(1);
  });

  it('reports an offline API on init', async () => {
    api.health.mockRejectedValueOnce(new Error('offline'));
    await store.init();
    expect(store.apiAvailable()).toBe(false);
    expect(store.error()).toMatch(/Local API is not running/);
  });
  it('clears a stale AI connection when status refresh loses the server', async () => {
    api.aiStatus.mockResolvedValueOnce({ enabled: true, connectionStatus: 'connected' });
    await store.refreshAiConnection();
    expect(store.aiStatus()?.connectionStatus).toBe('connected');
    api.aiStatus.mockRejectedValueOnce(new Error('offline'));
    await store.refreshAiConnection();
    expect(store.aiStatus()).toBeNull();
    expect(store.aiConnectionMessage()).toContain('unavailable');
  });

  it('connection failures refresh status and always release the busy state', async () => {
    api.testAiConnection.mockRejectedValueOnce(new Error('provider error'));
    api.aiStatus.mockResolvedValueOnce({ enabled: true, connectionStatus: 'failed' });
    await store.testAiConnection();
    expect(store.aiConnectionBusy()).toBe(false);
    expect(store.aiStatus()?.connectionStatus).toBe('failed');
    expect(store.aiConnectionMessage()).toContain('could not be verified');
  });

});

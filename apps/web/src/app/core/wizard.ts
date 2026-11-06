import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import type { Session } from '@reboundops/contracts';
import { SessionStore } from './session-store';

export type StepId = 'start' | 'evidence' | 'jobs' | 'options' | 'plan' | 'data' | 'feedback';
export type StepStatus = 'current' | 'done' | 'todo' | 'optional' | 'locked';

export interface StepView {
  id: StepId;
  label: string;
  /** Main steps are numbered; side steps sit outside the sequence. */
  kind: 'main' | 'side';
  status: StepStatus;
  /** Plain-language reason shown (and announced) while a step is locked. */
  lockedReason: string;
  /** Id of the step's `<h2>`, which receives focus when the step opens. */
  headingId: string;
}

interface StepDef {
  id: StepId;
  label: string;
  kind: 'main' | 'side';
  headingId: string;
  optional?: boolean;
  /** Returns a reason when the step cannot open yet. */
  locked(session: Session | null): string;
  done(session: Session | null): boolean;
}

const needsSession = (s: Session | null) => s ? '' : 'Answer "About you" first';

const STEP_DEFS: readonly StepDef[] = [
  { id: 'start', label: 'About you', kind: 'main', headingId: 'intake-heading',
    locked: () => '', done: s => !!s },
  { id: 'evidence', label: 'Things you did', kind: 'main', headingId: 'evidence-heading',
    locked: needsSession, done: s => !!s?.intake.evidence.some(e => e.status === 'confirmed') },
  { id: 'jobs', label: 'Jobs you are looking at', kind: 'main', headingId: 'job-target-heading', optional: true,
    locked: needsSession, done: s => (s?.jobTargets.length ?? 0) > 0 },
  { id: 'options', label: 'Your options', kind: 'main', headingId: 'routes-heading',
    locked: needsSession, done: s => !!s?.plan },
  { id: 'plan', label: 'Your 7-day plan', kind: 'main', headingId: 'plan-heading',
    locked: s => s?.plan ? '' : 'Choose one of your options first',
    done: s => !!s?.plan && s.plan.actions.length > 0 && s.plan.actions.every(a => a.completed) },
  { id: 'data', label: 'Keep or delete my data', kind: 'side', headingId: 'privacy-heading', optional: true,
    locked: needsSession, done: () => false },
  { id: 'feedback', label: 'Tell us how it went', kind: 'side', headingId: 'pilot-feedback-heading', optional: true,
    locked: needsSession, done: () => false }
];

const isStepId = (value: string): value is StepId => STEP_DEFS.some(d => d.id === value);

/**
 * Wizard navigation state, derived from the active session.
 *
 * - `steps` is one memoized computed, so every status comes from the same
 *   session snapshot (no scattered per-step signals).
 * - The current step is mirrored into `location.hash`, so the browser Back
 *   button and links work without a router or a server fallback.
 * - If the current step becomes locked (session cleared or deleted), the
 *   wizard returns to "About you".
 * - Navigation never changes the session; it only chooses what is visible.
 */
@Injectable({ providedIn: 'root' })
export class WizardStore {
  private readonly store = inject(SessionStore);
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private readonly _current = signal<StepId>('start');

  readonly current = this._current.asReadonly();

  readonly steps = computed<StepView[]>(() => {
    const session = this.store.session();
    const current = this._current();
    return STEP_DEFS.map(def => {
      const lockedReason = def.locked(session);
      const status: StepStatus = def.id === current ? 'current'
        : lockedReason ? 'locked'
        : def.done(session) ? 'done'
        : def.optional ? 'optional' : 'todo';
      return { id: def.id, label: def.label, kind: def.kind, status, lockedReason, headingId: def.headingId };
    });
  });

  readonly mainSteps = computed(() => this.steps().filter(s => s.kind === 'main'));
  readonly sideSteps = computed(() => this.steps().filter(s => s.kind === 'side'));

  readonly currentStep = computed(() => this.steps().find(s => s.id === this._current())!);
  /** 1-based position among main steps; 0 for side steps. */
  readonly position = computed(() => this.mainSteps().findIndex(s => s.id === this._current()) + 1);
  readonly previous = computed(() => this.neighbour(-1));
  readonly next = computed(() => this.neighbour(1));

  /** Bumped on every user-driven step change, so the shell can move focus. */
  private readonly _navigations = signal(0);
  readonly navigations = this._navigations.asReadonly();

  constructor() {
    const onHash = () => this.fromHash();
    this.window?.addEventListener('hashchange', onHash);
    inject(DestroyRef).onDestroy(() => this.window?.removeEventListener('hashchange', onHash));

    // A locked current step (e.g. after "Clear form" or delete) falls back to the start.
    effect(() => {
      if (this.currentStep().lockedReason) this.go('start', { focus: false });
    });
  }

  /** Reads the initial step from the URL; locked or unknown steps open "About you". */
  init(): void {
    this.fromHash(true);
  }

  canOpen(id: StepId): boolean {
    return !this.steps().find(s => s.id === id)?.lockedReason;
  }

  /** Opens a step if it is unlocked. Returns whether the step is now current. */
  go(id: StepId, options: { focus?: boolean } = {}): boolean {
    if (!this.canOpen(id)) return false;
    const changed = this._current() !== id;
    this._current.set(id);
    this.writeHash(id);
    if (changed && options.focus !== false) this._navigations.update(n => n + 1);
    return true;
  }

  private neighbour(offset: 1 | -1): StepView | null {
    const main = this.mainSteps();
    const index = main.findIndex(s => s.id === this._current());
    if (index < 0) return null;
    const candidate = main[index + offset];
    return candidate && !candidate.lockedReason ? candidate : null;
  }

  private fromHash(initial = false): void {
    const raw = (this.window?.location.hash ?? '').replace(/^#/, '');
    const target: StepId = isStepId(raw) && this.canOpen(raw) ? raw : 'start';
    if (target === this._current()) {
      if (raw !== target) this.writeHash(target, true);
      return;
    }
    this._current.set(target);
    if (raw !== target) this.writeHash(target, true);
    if (!initial) this._navigations.update(n => n + 1);
  }

  private writeHash(id: StepId, replace = false): void {
    const w = this.window;
    if (!w || w.location.hash === '#' + id) return;
    const url = w.location.pathname + w.location.search + '#' + id;
    if (replace) w.history.replaceState(w.history.state, '', url);
    else w.history.pushState(w.history.state, '', url);
  }
}

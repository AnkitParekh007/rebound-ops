import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntakeSchema, type Intake } from '@reboundops/contracts';
import { SessionStore } from '../../core/session-store';
import { WizardStore } from '../../core/wizard';
import { OnboardingComponent } from './onboarding.component';
import { fictionalSession } from '../../testing/fixtures';

describe('OnboardingComponent (guided first visit)', () => {
  let fixture: ComponentFixture<OnboardingComponent>;
  let component: OnboardingComponent;
  let store: ReturnType<typeof storeStub>;
  let wizard: { go: ReturnType<typeof vi.fn> };

  function storeStub() {
    return {
      busy: signal(false), apiAvailable: signal(true), session: signal(null), operationsAvailable: signal(false),
      persistenceStatus: signal(null), savedSessions: signal([]),
      submitIntake: vi.fn().mockResolvedValue(fictionalSession()), setError: vi.fn(),
      resumeSaved: vi.fn(), restoreBackup: vi.fn()
    };
  }

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const render = () => fixture.detectChanges();

  beforeEach(() => {
    store = storeStub();
    wizard = { go: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: SessionStore, useValue: store }, { provide: WizardStore, useValue: wizard }]
    });
    fixture = TestBed.createComponent(OnboardingComponent);
    component = fixture.componentInstance;
    render();
  });

  it('opens with an honest welcome, then one question at a time', () => {
    expect(text()).toContain('no AI is used');
    component.start();
    render();
    expect(text()).toContain('Which of these sounds most like you right now?');
    expect(text()).toContain('Question 1 of about');
  });

  it('does not move on until a required question is answered', () => {
    component.start();
    component.continue();
    render();
    expect(text()).toContain('Choose one option to continue.');
    expect(text()).toContain('Which of these sounds most like you right now?');
  });

  it('branches on the first answer and saves once, from the summary', async () => {
    const f = component.form.controls;
    component.start();
    f.situation.setValue('switch'); component.continue();
    render();
    expect(text()).toContain('What do you do now');
    f.role.setValue('Fictional bookkeeper'); component.continue();
    f.shiftTarget.setValue('Fictional data analyst'); component.continue();
    f.timing.setValue('unsaid'); component.continue();
    f.hours.setValue(4); component.continue();
    component.skip(); // things you did
    render();
    expect(text()).toContain("Here's what I heard");
    expect(text()).toContain('a new kind of work');
    expect(store.submitIntake).not.toHaveBeenCalled();

    await component.save();
    const intake = (store.submitIntake.mock.calls[0]![0] as () => Intake)();
    expect(IntakeSchema.safeParse(intake).success).toBe(true);
    expect(intake).toMatchObject({ role: 'Fictional bookkeeper', shiftTarget: 'Fictional data analyst', urgency: 'flexible', weeklyHours: 4 });
    expect(wizard.go).toHaveBeenCalledWith('evidence');
  });

  it('returns to the summary after a change, and drops answers that no longer apply', () => {
    const f = component.form.controls;
    component.start();
    f.situation.setValue('laid-off'); component.continue();
    f.role.setValue('Fictional cashier'); component.continue();
    f.timing.setValue('soon'); component.continue();
    component.skip(); // feeling
    f.direction.setValue('bridge'); component.continue();
    f.bridgeTarget.setValue('Fictional temp shifts'); component.continue();
    component.skip(); // location
    f.hours.setValue(2); component.continue();
    component.skip(); // evidence
    render();
    expect(text()).toContain('Fictional temp shifts');

    component.change('direction');
    f.direction.setValue('return'); component.continue();
    render();
    expect(text()).toContain("Here's what I heard");
    expect(text()).not.toContain('Fictional temp shifts');
    expect(text()).toContain('1 earlier answer no longer applies');
  });

  it('offers the full form at any time', () => {
    const spy = vi.fn();
    component.fullForm.subscribe(spy);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.minimal')!.click();
    expect(spy).toHaveBeenCalled();
  });
});

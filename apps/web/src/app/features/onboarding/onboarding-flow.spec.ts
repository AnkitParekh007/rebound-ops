import { describe, expect, it } from 'vitest';
import { IntakeSchema } from '@reboundops/contracts';
import {
  type Answers, type QuestionId, type Situation, EMPTY_ANSWERS, QUESTIONS, SITUATIONS, answerText, options,
  suggestedRoute, toIntake, walk, wording
} from './onboarding-flow';

/** A fully answered, fictional set of answers for one situation. */
function answered(situation: Situation, overrides: Partial<Answers> = {}): Answers {
  return {
    ...EMPTY_ANSWERS, situation, situationText: 'Fictional: my team was restructured', breakReason: 'Caring for someone',
    role: 'Fictional warehouse supervisor', wants: ['pay', 'learning'], timing: 'quarter', feeling: 'mixed',
    direction: 'shift', shiftTarget: 'Fictional logistics analyst', bridgeTarget: 'Fictional temp work',
    location: 'Remote', weeklyHours: 4, evidenceText: 'Trained four new starters\nCut picking errors',
    ...overrides
  };
}

const situations = SITUATIONS.map(s => s.value);
const directions = ['return', 'shift', 'bridge', 'unsure'] as const;

describe('guided questions (pure flow)', () => {
  it('asks only the opening question until a situation is chosen', () => {
    expect(walk(EMPTY_ANSWERS)).toEqual(['situation']);
  });

  it('gives every situation a short path with no repeats that ends with hours and things you did', () => {
    for (const situation of situations) {
      for (const direction of directions) {
        const path = walk(answered(situation, { direction }));
        expect(path[0]).toBe('situation');
        expect(new Set(path).size).toBe(path.length);
        expect(path.length).toBeLessThanOrEqual(9);
        expect(path.slice(-2).sort()).toEqual(['evidence', 'hours']);
        expect(path).toContain('role');
      }
    }
  });

  it('builds a contract-valid intake for every situation and direction', () => {
    for (const situation of situations) {
      for (const direction of directions) {
        for (const timing of ['soon', 'quarter', 'flexible', 'unsaid'] as const) {
          const result = IntakeSchema.safeParse(toIntake(answered(situation, { direction, timing })));
          expect(result.success, situation + '/' + direction + '/' + timing).toBe(true);
        }
      }
    }
  });

  it('offers only hour choices the contract accepts', () => {
    for (const option of options('hours', EMPTY_ANSWERS)) {
      expect(IntakeSchema.shape.weeklyHours.safeParse(option.value).success).toBe(true);
    }
  });

  it('never saves answers from questions the user branched away from', () => {
    const intake = toIntake(answered('laid-off', { direction: 'return' }));
    expect(intake.shiftTarget).toBe('');
    expect(intake.bridgeTarget).toBe('');
    expect(intake.priorities).toBe(''); // situation text, break reason and wants are off this path
    expect(toIntake(answered('laid-off', { direction: 'bridge' })).bridgeTarget).toBe('Fictional temp work');
  });

  it('keeps choosing-only answers (situation, feeling) out of the saved intake', () => {
    const text = JSON.stringify(toIntake(answered('laid-off', { feeling: 'not-yet' })));
    expect(text).not.toMatch(/laid-off|not-yet|Not ready/);
    expect(QUESTIONS.situation.saved).toBe(false);
    expect(QUESTIONS.feeling.saved).toBe(false);
  });

  it('turns "rather not say" into a gentle default instead of asking again', () => {
    expect(toIntake(answered('laid-off', { timing: 'unsaid' })).urgency).toBe('quarter');
    expect(toIntake(answered('return', { timing: 'unsaid' })).urgency).toBe('flexible');
    expect(toIntake(answered('better', { timing: 'soon' })).urgency).toBe('soon');
  });

  it('maps break labels, wishes and free text into editable notes', () => {
    expect(toIntake(answered('return')).priorities).toBe('Career break: Caring for someone');
    expect(toIntake(answered('return', { breakReason: '' })).priorities).toBe('');
    expect(toIntake(answered('better')).priorities).toBe('Hoping for: better pay, more chances to learn');
    expect(toIntake(answered('other')).priorities).toBe('Fictional: my team was restructured');
  });

  it('turns each line into an unverified, manually entered claim', () => {
    const { evidence } = toIntake(answered('switch'));
    expect(evidence.map(e => [e.claim, e.status, e.source.kind])).toEqual([
      ['Trained four new starters', 'unverified', 'manual'],
      ['Cut picking errors', 'unverified', 'manual']
    ]);
  });

  it('suggests where to start looking, or "compare all three" when unsure', () => {
    expect(suggestedRoute(answered('switch', { direction: null }))).toBe('shift');
    expect(suggestedRoute(answered('better', { direction: null }))).toBe('return');
    expect(suggestedRoute(answered('laid-off', { direction: 'bridge' }))).toBe('bridge');
    expect(suggestedRoute(answered('other', { direction: 'unsure' }))).toBeNull();
  });

  it('has plain wording for every question and no exclamation marks', () => {
    const ids = Object.keys(QUESTIONS) as QuestionId[];
    for (const situation of situations) {
      for (const id of ids) {
        const copy = wording(id, answered(situation));
        expect(copy.prompt.length).toBeGreaterThan(5);
        expect(Object.values(copy).join(' ')).not.toContain('!');
        expect(answerText(id, answered(situation))).not.toBe(undefined);
      }
    }
  });
});

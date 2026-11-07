import { ROUTE_TITLES, type Intake, type RouteId } from '@reboundops/contracts';
import { evidenceFromLines } from '../../core/intake-mapping';

/*
 * Guided first-visit questions ("About you", guided mode).
 *
 * The script is written in advance: no AI, no network calls. Answers live in
 * memory only and are turned into one Intake when the user confirms the
 * summary. Answers that only choose the next question (situation, feeling)
 * are never sent or saved.
 *
 * DRAFT COPY FOR PILOT TESTING: none of this wording has been tested with
 * participants yet. See docs/onboarding.md.
 */

export type Situation = 'laid-off' | 'switch' | 'return' | 'better' | 'other';
export type Direction = 'return' | 'shift' | 'bridge' | 'unsure';
export type Timing = 'soon' | 'quarter' | 'flexible' | 'unsaid';
export type Feeling = 'ready' | 'mixed' | 'not-yet' | '';
export type Want = 'pay' | 'responsibility' | 'team' | 'flexibility' | 'stability' | 'learning';

export interface Answers {
  situation: Situation | null;
  situationText: string;
  breakReason: string;
  role: string;
  wants: Want[];
  timing: Timing | null;
  feeling: Feeling;
  direction: Direction | null;
  shiftTarget: string;
  bridgeTarget: string;
  location: string;
  weeklyHours: number | null;
  evidenceText: string;
}

export type QuestionId =
  | 'situation' | 'situationText' | 'breakReason' | 'role' | 'wants' | 'timing' | 'feeling'
  | 'direction' | 'shiftTarget' | 'bridgeTarget' | 'location' | 'hours' | 'evidence';

export interface Option<T = string | number> { value: T; label: string; hint?: string }

export interface Question {
  id: QuestionId;
  kind: 'choice' | 'multi' | 'text' | 'lines';
  /** Short name used in the "Here's what I heard" summary. */
  summary: string;
  /** Required questions have no Skip button. */
  required: boolean;
  /** False for answers that only choose the next question and are never saved. */
  saved: boolean;
}

export const EMPTY_ANSWERS: Answers = {
  situation: null, situationText: '', breakReason: '', role: '', wants: [], timing: null, feeling: '',
  direction: null, shiftTarget: '', bridgeTarget: '', location: '', weeklyHours: null, evidenceText: ''
};

export const QUESTIONS: Record<QuestionId, Question> = {
  situation: { id: 'situation', kind: 'choice', summary: 'Where you are', required: true, saved: false },
  situationText: { id: 'situationText', kind: 'text', summary: "What's going on", required: false, saved: true },
  breakReason: { id: 'breakReason', kind: 'choice', summary: 'Your time away', required: false, saved: true },
  role: { id: 'role', kind: 'text', summary: 'Most recent role', required: true, saved: true },
  wants: { id: 'wants', kind: 'multi', summary: 'What would be better', required: false, saved: true },
  timing: { id: 'timing', kind: 'choice', summary: 'Timing', required: true, saved: true },
  feeling: { id: 'feeling', kind: 'choice', summary: 'How you feel about it', required: false, saved: false },
  direction: { id: 'direction', kind: 'choice', summary: 'What you want next', required: true, saved: false },
  shiftTarget: { id: 'shiftTarget', kind: 'text', summary: 'New kind of work', required: false, saved: true },
  bridgeTarget: { id: 'bridgeTarget', kind: 'text', summary: 'Stepping-stone work', required: false, saved: true },
  location: { id: 'location', kind: 'text', summary: 'Where you want to work', required: false, saved: true },
  hours: { id: 'hours', kind: 'choice', summary: 'Time each week', required: true, saved: true },
  evidence: { id: 'evidence', kind: 'lines', summary: "Things you're glad you did", required: false, saved: true }
};

export const SITUATIONS: readonly Option<Situation>[] = [
  { value: 'laid-off', label: "I've recently lost my job", hint: 'Laid off, made redundant, or a contract ended' },
  { value: 'switch', label: 'I want to move into a different kind of work' },
  { value: 'return', label: "I'm coming back after time away from paid work" },
  { value: 'better', label: 'I want a better job in the field I am in' },
  { value: 'other', label: "Something else, or I'm not sure" }
];

const WANTS: readonly Option<Want>[] = [
  { value: 'pay', label: 'Better pay' },
  { value: 'responsibility', label: 'More responsibility' },
  { value: 'team', label: 'A better team or manager' },
  { value: 'flexibility', label: 'Flexibility or location' },
  { value: 'stability', label: 'More stability' },
  { value: 'learning', label: 'More chances to learn' }
];
export const WANT_IDS = WANTS.map(w => w.value);

const BREAK_REASONS: readonly Option<string>[] = [
  { value: '', label: "I'd rather not say" },
  { value: 'Caring for someone', label: 'Caring for someone' },
  { value: 'Parenting', label: 'Parenting' },
  { value: 'Health', label: 'Health' },
  { value: 'Study or training', label: 'Study or training' },
  { value: 'Travel or a sabbatical', label: 'Travel or a sabbatical' },
  { value: 'Other', label: 'Something else' }
];

const HOURS: readonly Option<number>[] = [
  { value: 2, label: '1 to 2 hours' },
  { value: 4, label: '3 to 5 hours' },
  { value: 8, label: '6 to 10 hours' },
  { value: 15, label: '11 to 20 hours' },
  { value: 3, label: 'Not sure yet', hint: "We'll start small. You can change this later." }
];

const FEELINGS: readonly Option<Feeling>[] = [
  { value: 'ready', label: 'Ready to get going' },
  { value: 'mixed', label: 'Up and down' },
  { value: 'not-yet', label: 'Not ready yet, just exploring' }
];

/** The questions the user will see, in order, for the answers so far. Always ends before the summary. */
export function walk(a: Answers): QuestionId[] {
  const target: QuestionId[] = a.direction === 'shift' ? ['shiftTarget'] : a.direction === 'bridge' ? ['bridgeTarget'] : [];
  switch (a.situation) {
    case 'laid-off': return ['situation', 'role', 'timing', 'feeling', 'direction', ...target, 'location', 'hours', 'evidence'];
    case 'switch': return ['situation', 'role', 'shiftTarget', 'timing', 'hours', 'evidence'];
    case 'return': return ['situation', 'breakReason', 'role', 'direction', ...target, 'timing', 'hours', 'evidence'];
    case 'better': return ['situation', 'role', 'wants', 'timing', 'location', 'hours', 'evidence'];
    case 'other': return ['situation', 'situationText', 'role', 'direction', ...target, 'timing', 'hours', 'evidence'];
    default: return ['situation'];
  }
}

/** Expected length when the first answer is not given yet (the longest common path). */
export const TYPICAL_LENGTH = 8;

export interface Wording {
  /** A short, honest acknowledgement of the previous answer. Never claims to know feelings. */
  lead: string;
  prompt: string;
  why: string;
  hint: string;
}

/** Plain-language copy for a question, adapted to earlier answers. */
export function wording(id: QuestionId, a: Answers): Wording {
  const w = (prompt: string, why = '', hint = '', lead = ''): Wording => ({ lead, prompt, why, hint });
  switch (id) {
    case 'situation':
      return w('Which of these sounds most like you right now?', 'So the next few questions fit your situation.',
        'Pick the closest one. You can change it later.');
    case 'situationText':
      return w("In a sentence or two, what's going on with work for you right now?", 'So your notes start in your own words.',
        'Share as much or as little as you like.', 'Thanks. Not every situation fits a box.');
    case 'breakReason':
      return w("You don't need to say why you took time away. If you'd like, pick a label for it.",
        'Only so your notes describe the break your way. It does not change your options.', '',
        'Welcome back. Time away is common, and it does not cancel what you know.');
    case 'role': {
      const leads: Partial<Record<Situation, string>> = {
        'laid-off': 'Thanks for telling me. Losing a job is stressful, and many people start right here.',
        switch: "A change of direction is a big step. Let's start from where you are now.",
        better: "Good. Let's look at what you would change."
      };
      const prompt = a.situation === 'switch' ? 'What do you do now, or what did you do most recently?'
        : a.situation === 'return' ? 'What was your role before the break?'
        : a.situation === 'other' ? "What's your most recent role, or the kind of work you know best?"
        : 'What was your most recent role?';
      return w(prompt, 'Your options and plan start from what you already know.',
        'A job title or a short description is fine, for example "Shop manager" or "Accounts assistant".',
        leads[a.situation ?? 'other'] ?? '');
    }
    case 'wants':
      return w('What would make the next job better? Pick any that matter.', 'They become notes for comparing jobs later.');
    case 'timing':
      return a.situation === 'laid-off'
        ? w('Is there a time by which you need paid work again?', 'It helps balance quick options with longer ones. I will not ask about money.')
        : w('How soon would you like to make a move?', 'It helps balance quick options with longer ones.');
    case 'feeling':
      return w('How are you feeling about looking for work right now?', 'Only to set the pace. This answer is not saved.');
    case 'direction': {
      const leads: Record<Feeling, string> = {
        'not-yet': "That's fine. We'll keep the first step small, and you can stop any time.",
        mixed: "That's very common. We'll go one step at a time.",
        ready: "Good. Let's use that.",
        '': ''
      };
      const prompt = a.situation === 'return' ? 'How would you like to come back?'
        : a.situation === 'other' ? 'Which of these feels closest to what you want next?'
        : 'Looking ahead, what would you like next?';
      return w(prompt, 'You will still see all three kinds of options later and can choose.', '',
        a.situation === 'laid-off' ? leads[a.feeling] : '');
    }
    case 'shiftTarget':
      return w('What kind of work are you curious about?', 'So the "new kind of work" option has a name.',
        'A field, a job title or just an idea. Leave it empty if you are not sure yet.');
    case 'bridgeTarget':
      return w('What kind of short-term, part-time or freelance work could you do?', 'So the "stepping-stone" option has a name.',
        'For example "Bookkeeping for small businesses". Leave it empty if you are not sure yet.');
    case 'location':
      return w('Where would you like to work?', 'Only so your notes include it.',
        'A city, "remote", "anywhere", or leave it empty.');
    case 'hours':
      return w('How many hours a week can you realistically give this?', 'Your 7-day plan will fit inside this time.',
        'A small, steady amount works well.');
    case 'evidence':
      return w("Name one to three things you did that you're glad about.", 'They become the starting points you will check in the next step.',
        'At work, during a break, anywhere. One per line. Short is fine, for example "Trained four new starters".',
        a.situation === 'return' ? 'Volunteering, a course or caring for someone all count.' : 'Almost done.');
  }
}

/** Answer options for choice and multi questions. */
export function options(id: QuestionId, a: Answers): readonly Option[] {
  switch (id) {
    case 'situation': return SITUATIONS;
    case 'breakReason': return BREAK_REASONS;
    case 'wants': return WANTS;
    case 'feeling': return FEELINGS;
    case 'hours': return HOURS;
    case 'timing': return [
      { value: 'soon', label: a.situation === 'laid-off' ? 'As soon as possible' : 'Within a few weeks' },
      { value: 'quarter', label: 'In the next few months' },
      { value: 'flexible', label: a.situation === 'laid-off' ? 'I have some time' : 'No fixed timing' },
      { value: 'unsaid', label: "I'd rather not say" }
    ];
    case 'direction': return [
      { value: 'return', label: a.situation === 'return' ? 'The same kind of role as before' : 'Something similar to before' },
      { value: 'shift', label: 'Something different' },
      { value: 'bridge', label: a.situation === 'return' ? 'Ease back in with part-time, project or contract work' : 'Short-term or freelance work while I look' },
      { value: 'unsure', label: "I don't know yet", hint: 'That is fine. You will compare all three.' }
    ];
    default: return [];
  }
}

/** The kind of option to look at first; null means "compare all three". */
export function suggestedRoute(a: Answers): RouteId | null {
  if (a.situation === 'switch') return 'shift';
  if (a.situation === 'better') return 'return';
  return a.direction && a.direction !== 'unsure' ? a.direction : null;
}

/** The same plain names as "Your options", in lower case for use mid-sentence. */
export const ROUTE_WORDS = Object.fromEntries(
  Object.entries(ROUTE_TITLES).map(([id, title]) => [id, title.charAt(0).toLowerCase() + title.slice(1)])
) as Record<RouteId, string>;

/** "Rather not say" picks a gentle default: no pressure for people already under pressure. */
function urgency(a: Answers): Intake['urgency'] {
  if (a.timing && a.timing !== 'unsaid') return a.timing;
  return a.situation === 'laid-off' || a.situation === 'other' ? 'quarter' : 'flexible';
}

/**
 * Builds the intake from the questions still on the path. Answers to
 * questions the user branched away from are dropped, so nothing they no
 * longer see is saved.
 */
export function toIntake(a: Answers): Intake {
  const on = new Set(walk(a));
  const notes: string[] = [];
  if (on.has('situationText') && a.situationText.trim()) notes.push(a.situationText.trim());
  if (on.has('breakReason') && a.breakReason) notes.push('Career break: ' + a.breakReason);
  if (on.has('wants') && a.wants.length) {
    notes.push('Hoping for: ' + WANTS.filter(w => a.wants.includes(w.value)).map(w => w.label.toLowerCase()).join(', '));
  }
  return {
    role: a.role.trim(),
    location: on.has('location') ? a.location.trim() : '',
    weeklyHours: a.weeklyHours ?? 3,
    urgency: urgency(a),
    priorities: notes.join('\n').slice(0, 1200),
    shiftTarget: on.has('shiftTarget') ? a.shiftTarget.trim() : '',
    bridgeTarget: on.has('bridgeTarget') ? a.bridgeTarget.trim() : '',
    evidence: on.has('evidence') ? evidenceFromLines(a.evidenceText) : []
  };
}

/** Human-readable answer for the summary and the "so far" list. */
export function answerText(id: QuestionId, a: Answers): string {
  const pick = (value: unknown) => options(id, a).find(o => o.value === value)?.label ?? '';
  switch (id) {
    case 'wants': return a.wants.length ? WANTS.filter(w => a.wants.includes(w.value)).map(w => w.label).join(', ') : 'Skipped';
    case 'hours': return pick(a.weeklyHours);
    case 'evidence': return a.evidenceText.trim() ? a.evidenceText.trim().split(/\r?\n/).filter(l => l.trim()).join('; ') : 'Skipped for now';
    case 'situation': case 'breakReason': case 'timing': case 'direction': return pick(a[id]);
    case 'feeling': return pick(a.feeling) || 'Skipped';
    default: return a[id].trim() || 'Skipped';
  }
}

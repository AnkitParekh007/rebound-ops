import { createSession, type Session } from '@reboundops/contracts';

/** Fictional session built with the real contract factory, so fixtures stay schema-valid. */
export function fictionalSession(overrides: Partial<Session> = {}): Session {
  const base = createSession({
    role: 'Fictional Frontend Engineer', location: '', weeklyHours: 3, urgency: 'quarter',
    priorities: '', shiftTarget: '', bridgeTarget: '',
    evidence: [{
      id: '5a1f1c3e-6b7d-4e8f-9a0b-1c2d3e4f5a6b', claim: 'Led a fictional component migration',
      status: 'confirmed', source: { kind: 'manual', label: 'User-entered line 1' }
    }]
  }, '0f0e0d0c-0b0a-4908-8706-050403020100', '2026-11-05T00:00:00.000Z');
  return { ...base, ...overrides };
}

import { OnboardingState, Profile } from '@reboundops/contracts';

export function defaultOnboarding(): OnboardingState {
  return {
    status: 'not_started',
    step: 0,
    aiMode: 'off',
    goals: { targetRoles: [], timeline: null, weeklyApplicationTarget: null, notes: '' },
    updatedAt: null,
  };
}

export function defaultProfile(): Profile {
  return Profile.parse({});
}

/** Shallow merge with nested goals, so partial onboarding updates never drop fields. */
export function mergeOnboarding(
  current: OnboardingState,
  update: Partial<Omit<OnboardingState, 'updatedAt'>>,
  now: Date,
): OnboardingState {
  return OnboardingState.parse({
    ...current,
    ...update,
    goals: { ...current.goals, ...(update.goals ?? {}) },
    updatedAt: now.toISOString(),
  });
}

/** Normalises a free-text list: trims, drops blanks, de-duplicates case-insensitively. */
export function normalizeList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim().replace(/\s+/g, ' ');
    const key = value.toLowerCase();
    if (value && !seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
  }
  return out;
}

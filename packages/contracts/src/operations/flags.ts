/**
 * Feature-flag registry for the seven operations features (FND-07).
 *
 * Every flag defaults to OFF. A flag is enabled only by naming it in the
 * `REBOUNDOPS_FEATURES` environment variable (comma-separated), so a fresh
 * install, CI and the preview archive never expose unfinished operations work.
 * Unknown names are reported back instead of being silently ignored, so a typo
 * cannot look like a working toggle.
 */

export type ReleaseId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7';

export interface FeatureFlagMeta {
  /** Feature number in the operations plan (#1–#7). */
  readonly feature: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly release: ReleaseId;
  readonly description: string;
}

export const FEATURE_FLAGS = {
  autofill: { feature: 2, release: 'R1', description: 'Page-aware Autofill with answer provenance and readback' },
  eligibilityScreening: { feature: 3, release: 'R2', description: 'Job eligibility and quality screening reports' },
  autoApply: { feature: 1, release: 'R3', description: 'Controlled Auto Apply runner; per-adapter submit stays separately gated' },
  inboxImport: { feature: 4, release: 'R4', description: 'Recruiter message import, matching and tasks' },
  gmailRead: { feature: 4, release: 'R4', description: 'Optional read-only Gmail connector' },
  followupDrafts: { feature: 4, release: 'R4', description: 'Copyable follow-up drafts; never sends' },
  contactImport: { feature: 5, release: 'R5', description: 'Contact import and normalization' },
  referralMatching: { feature: 5, release: 'R5', description: 'Evidence-linked referral suggestions' },
  referralDrafts: { feature: 5, release: 'R5', description: 'Copyable outreach drafts and candidate packet' },
  applicationInterviewContext: { feature: 6, release: 'R6', description: 'Pinned submitted-document context for interviews' },
  interviewCoaching: { feature: 6, release: 'R6', description: 'Rubric feedback and claim-consistency checks' },
  strategyMetrics: { feature: 7, release: 'R7', description: 'Deterministic cohort metrics and data-quality report' },
  strategyRecommendations: { feature: 7, release: 'R7', description: 'Rule-based strategy suggestions' },
  strategyExperiments: { feature: 7, release: 'R7', description: 'User-approved experiments and review tasks' }
} as const satisfies Record<string, FeatureFlagMeta>;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const FEATURE_FLAG_ENV = 'REBOUNDOPS_FEATURES';

export interface ResolvedFeatureFlags {
  readonly enabled: Readonly<Record<FeatureFlag, boolean>>;
  /** Names in the environment variable that are not registered flags. */
  readonly unknown: readonly string[];
}

export function isFeatureFlag(name: string): name is FeatureFlag {
  return Object.prototype.hasOwnProperty.call(FEATURE_FLAGS, name);
}

export function resolveFeatureFlags(env: Readonly<Record<string, string | undefined>>): ResolvedFeatureFlags {
  const enabled = Object.fromEntries(Object.keys(FEATURE_FLAGS).map((k) => [k, false])) as Record<FeatureFlag, boolean>;
  const unknown: string[] = [];
  for (const raw of (env[FEATURE_FLAG_ENV] ?? '').split(',')) {
    const name = raw.trim();
    if (!name) continue;
    if (isFeatureFlag(name)) enabled[name] = true;
    else if (!unknown.includes(name)) unknown.push(name);
  }
  return { enabled: Object.freeze(enabled), unknown: Object.freeze(unknown) };
}

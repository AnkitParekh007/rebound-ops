import { z } from 'zod';

/**
 * Eligibility screening vocabulary (operations feature #3, flag
 * `eligibilityScreening`).
 *
 * A screening report lists the hard requirements a job posting states and,
 * for each one, whether the person's reviewed profile facts meet it. The
 * engine (`engine/web/src/lib/eligibility/screen.mjs`) mirrors these lists as
 * plain JavaScript; `tests/operations-parity.test.mjs` fails if they drift.
 *
 * A report never hides or drops a job. It is information for the person.
 */

/** What a posting can require. */
export const ELIGIBILITY_REQUIREMENT_KINDS = [
  'work_authorization',
  'sponsorship',
  'citizenship_or_clearance',
  'location',
  'language',
  'degree',
  'experience_years'
] as const;
export const EligibilityRequirementKindSchema = z.enum(ELIGIBILITY_REQUIREMENT_KINDS);
export type EligibilityRequirementKind = z.infer<typeof EligibilityRequirementKindSchema>;

/**
 * Requirements no profile fact can settle today, so their verdict is always
 * `unknown`: the report quotes them for the person to check.
 */
export const UNVERIFIED_REQUIREMENT_KINDS: readonly EligibilityRequirementKind[] = [
  'citizenship_or_clearance',
  'language',
  'degree'
];

/**
 * `meets` and `does_not_meet` are decided from reviewed profile facts only.
 * `unknown` means the profile does not say, or the posting is unclear.
 */
export const ELIGIBILITY_VERDICTS = ['meets', 'does_not_meet', 'unknown'] as const;
export const EligibilityVerdictSchema = z.enum(ELIGIBILITY_VERDICTS);
export type EligibilityVerdict = z.infer<typeof EligibilityVerdictSchema>;

/**
 * The report's summary, from its checks: any `does_not_meet` is `blocked`,
 * else any `unknown` is `needs_review`, else `eligible`; no checks at all is
 * `no_requirements` (nothing was found, which is not the same as eligible).
 */
export const ELIGIBILITY_OUTCOMES = ['blocked', 'needs_review', 'eligible', 'no_requirements'] as const;
export const EligibilityOutcomeSchema = z.enum(ELIGIBILITY_OUTCOMES);
export type EligibilityOutcome = z.infer<typeof EligibilityOutcomeSchema>;

export const EligibilityCheckSchema = z
  .object({
    kind: EligibilityRequirementKindSchema,
    verdict: EligibilityVerdictSchema,
    /** The posting's own words the check is about, quoted verbatim. */
    evidence: z.string().min(1).max(400),
    /** Why the verdict was reached, in plain words. */
    detail: z.string().min(1).max(500),
    /** The profile keys the verdict relied on, e.g. `location.authorized_in`. */
    basis: z.array(z.string().min(1).max(80)).max(10)
  })
  .superRefine((c, ctx) => {
    if (UNVERIFIED_REQUIREMENT_KINDS.includes(c.kind) && c.verdict !== 'unknown') {
      ctx.addIssue({ code: 'custom', path: ['verdict'], message: 'No profile fact settles this requirement yet' });
    }
    if (c.verdict === 'does_not_meet' && c.basis.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['basis'], message: 'A failed requirement must name the profile fact it relied on' });
    }
  });
export type EligibilityCheck = z.infer<typeof EligibilityCheckSchema>;

/** The outcome a list of checks implies. */
export function eligibilityOutcome(checks: readonly Pick<EligibilityCheck, 'verdict'>[]): EligibilityOutcome {
  if (checks.length === 0) return 'no_requirements';
  if (checks.some((c) => c.verdict === 'does_not_meet')) return 'blocked';
  if (checks.some((c) => c.verdict === 'unknown')) return 'needs_review';
  return 'eligible';
}

export const EligibilityReportSchema = z
  .object({
    outcome: EligibilityOutcomeSchema,
    checks: z.array(EligibilityCheckSchema).max(50)
  })
  .superRefine((r, ctx) => {
    if (r.outcome !== eligibilityOutcome(r.checks)) {
      ctx.addIssue({ code: 'custom', path: ['outcome'], message: 'The outcome does not follow from the checks' });
    }
  });
export type EligibilityReport = z.infer<typeof EligibilityReportSchema>;

// The engine mirrors operations enums (answer policy, eligibility screen) from
// @reboundops/contracts because the engine has no build step (roadmap gap C2).
// This fails as soon as one side changes without the other.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ANSWER_SOURCES, SENSITIVE_CATEGORIES, ANSWER_HOLD_REASONS } from '../packages/contracts/dist/index.js';
import * as engine from '../engine/web/src/lib/apply/answer-policy.mjs';

test('engine answer policy enums match the operations contracts', () => {
  assert.deepEqual([...engine.ANSWER_SOURCES], [...ANSWER_SOURCES]);
  assert.deepEqual([...engine.SENSITIVE_CATEGORIES], [...SENSITIVE_CATEGORIES]);
  assert.deepEqual([...engine.ANSWER_HOLD_REASONS], [...ANSWER_HOLD_REASONS]);
});

test('engine eligibility screen enums and flag match the operations contracts', async () => {
  const contracts = await import('../packages/contracts/dist/index.js');
  const screen = await import('../engine/web/src/lib/eligibility/screen.mjs');
  assert.deepEqual([...screen.ELIGIBILITY_REQUIREMENT_KINDS], [...contracts.ELIGIBILITY_REQUIREMENT_KINDS]);
  assert.deepEqual([...screen.UNVERIFIED_REQUIREMENT_KINDS], [...contracts.UNVERIFIED_REQUIREMENT_KINDS]);
  assert.deepEqual([...screen.ELIGIBILITY_VERDICTS], [...contracts.ELIGIBILITY_VERDICTS]);
  assert.deepEqual([...screen.ELIGIBILITY_OUTCOMES], [...contracts.ELIGIBILITY_OUTCOMES]);
  assert.equal(screen.FEATURE_FLAG_ENV, contracts.FEATURE_FLAG_ENV);
  assert.ok(Object.hasOwn(contracts.FEATURE_FLAGS, screen.ELIGIBILITY_FLAG));
  const { enabled } = contracts.resolveFeatureFlags({ [contracts.FEATURE_FLAG_ENV]: screen.ELIGIBILITY_FLAG });
  assert.equal(enabled.eligibilityScreening, screen.eligibilityScreeningEnabled({ [contracts.FEATURE_FLAG_ENV]: screen.ELIGIBILITY_FLAG }));
});

test('every report the engine screen produces parses as an EligibilityReport', async () => {
  const { EligibilityReportSchema } = await import('../packages/contracts/dist/index.js');
  const { screenEligibility, eligibilityFacts } = await import('../engine/web/src/lib/eligibility/screen.mjs');
  // Fictional postings covering every requirement kind and verdict.
  const description = [
    'Requirements:',
    '- You must be authorized to work in the US.',
    '- We are unable to sponsor visas.',
    '- Visa sponsorship is available for the Berlin office.',
    '- Must hold an active security clearance.',
    '- You must be based in Spain.',
    '- Fluent German is required.',
    "- Bachelor's degree in Physics.",
    '- 5+ years of backend work.'
  ].join('\n');
  const years = { status: 'stated', min: 5, max: null, confident: true, display: '5+', mentions: [{ kind: 'required', quote: '5+ years of backend work.' }] };
  const profiles = [
    {},
    { location: { authorized_in: ['United States'], country: 'Spain' }, candidate: { years_of_experience: 8 } },
    { location: { authorized_in: ['Germany'], needs_sponsorship: true, country: 'Germany' }, candidate: { years_of_experience: 2 } }
  ];
  for (const profile of profiles) {
    for (const location of ['', 'Remote - US', 'Madrid, Spain']) {
      const report = screenEligibility({ description, location }, eligibilityFacts(profile), { years });
      const parsed = EligibilityReportSchema.safeParse(report);
      assert.ok(parsed.success, JSON.stringify(parsed.error?.issues));
    }
  }
  assert.ok(EligibilityReportSchema.safeParse(screenEligibility({ description: 'We build tools.' }, eligibilityFacts({}))).success);
});

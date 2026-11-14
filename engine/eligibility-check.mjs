#!/usr/bin/env node

/**
 * eligibility-check.mjs: screen one job posting's hard requirements against
 * your profile (operations feature #3, behind the `eligibilityScreening` flag).
 *
 * Zero LLM calls. It quotes each requirement the posting states (work
 * authorization, sponsorship, citizenship or clearance, where you must live,
 * languages, degrees, years of experience) and says whether your reviewed
 * profile facts meet it, do not meet it, or do not say. It never hides, drops
 * or ranks a job, and writes nothing. The rules live in
 * web/src/lib/eligibility/screen.mjs.
 *
 * Profile keys read: location.authorized_in, location.needs_sponsorship,
 * location.country and candidate.years_of_experience. Nothing else.
 *
 * Usage:
 *   REBOUNDOPS_FEATURES=eligibilityScreening node eligibility-check.mjs jds/acme.md
 *   REBOUNDOPS_FEATURES=eligibilityScreening node eligibility-check.mjs jds/acme.md --location "Berlin, Germany" --json
 *
 * Exit codes: 0 report printed (whatever its outcome), 1 bad usage or
 * unreadable input, 2 the flag is off.
 */

import { readFileSync } from 'fs';
import { isMainModule } from './lib/is-main-module.mjs';
import { flagValue, hasFlag, validateFlags } from './lib/cli-flags.mjs';
import { getProfilePath } from './path-resolver.mjs';
import { loadYaml } from './lib/yaml-document.mjs';
import { parseYearsRequirement } from './jd-years.mjs';
import {
  eligibilityFacts,
  eligibilityScreeningEnabled,
  screenEligibility,
  ELIGIBILITY_FLAG,
  FEATURE_FLAG_ENV,
} from './web/src/lib/eligibility/screen.mjs';

const USAGE = 'Usage: node eligibility-check.mjs <jd-file> [--location "<job location>"] [--json]';

const VERDICT_LABEL = { meets: 'meets', does_not_meet: 'does not meet', unknown: 'check yourself' };
const OUTCOME_LABEL = {
  blocked: 'Blocked: your profile does not meet at least one stated requirement.',
  needs_review: 'Needs review: some requirements are not settled by your profile.',
  eligible: 'Eligible: your profile meets every requirement this screen found.',
  no_requirements: 'No hard requirements found. That is not the same as eligible: read the posting.',
};

/** Screen a posting text with an already-parsed profile. */
export function runEligibilityCheck({ description, location, profile }) {
  return screenEligibility({ description, location }, eligibilityFacts(profile), { years: parseYearsRequirement(description) });
}

/** Plain-text rendering of a report. */
export function formatReport(report) {
  const lines = [OUTCOME_LABEL[report.outcome] ?? report.outcome];
  for (const c of report.checks) {
    lines.push('', `- ${c.kind.replace(/_/g, ' ')}: ${VERDICT_LABEL[c.verdict] ?? c.verdict}`, `  Posting: "${c.evidence}"`, `  ${c.detail}`);
  }
  return lines.join('\n');
}

function readProfile() {
  const path = getProfilePath();
  let text;
  try {
    text = readFileSync(path, 'utf-8');
  } catch {
    console.error(`No profile at ${path}; every check will say "check yourself".`);
    return {};
  }
  try {
    return loadYaml(text) ?? {};
  } catch (err) {
    console.error(`Could not parse ${path} (${err instanceof Error ? err.message : String(err)}); every check will say "check yourself".`);
    return {};
  }
}

function main(argv) {
  validateFlags(argv, ['--location', '--json', '--help', '-h'], USAGE, { valueFlags: ['--location'], requireOperand: true });
  if (hasFlag(argv, '--help') || hasFlag(argv, '-h')) {
    console.log(USAGE);
    return 0;
  }
  if (!eligibilityScreeningEnabled(process.env)) {
    console.error(`Eligibility screening is off. Turn it on with ${FEATURE_FLAG_ENV}=${ELIGIBILITY_FLAG}.`);
    return 2;
  }
  const location = flagValue(argv, '--location') ?? '';
  const file = argv.find((a, i) => !a.startsWith('-') && argv[i - 1] !== '--location');
  if (!file) {
    console.error(USAGE);
    return 1;
  }
  let description;
  try {
    description = readFileSync(file, 'utf-8');
  } catch (err) {
    console.error(`Could not read ${file}: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
  const report = runEligibilityCheck({ description, location, profile: readProfile() });
  console.log(hasFlag(argv, '--json') ? JSON.stringify(report, null, 2) : formatReport(report));
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}

/**
 * Manual UX probe (not CI). Drives two personas through onboarding → evidence →
 * job target → live AI preview/consent. Writes a JSON notes file.
 *
 * Requires: REBOUNDOPS_AI_ENABLED=true + ANTHROPIC_API_KEY, API on :4174, web on :4200.
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.REBOUNDOPS_WEB_URL || 'http://127.0.0.1:4200';
const OUT = path.resolve('tmp/persona-ux-probe');
mkdirSync(OUT, { recursive: true });

const notes = {
  startedAt: new Date().toISOString(),
  aiStatus: null,
  personas: [],
  complaints: [],
  positives: [],
};

/** Name of the first locator to become visible, or 'timeout'. */
async function firstOf(locators, timeout) {
  const waits = Object.entries(locators).map(([name, locator]) =>
    locator.first().waitFor({ state: 'visible', timeout }).then(() => name));
  return Promise.any(waits).catch(() => 'timeout');
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

async function pickRadio(page, label) {
  const radio = page.getByRole('radio', { name: label });
  await radio.click();
  await page.getByRole('button', { name: 'Continue' }).click();
}

// Every onboarding text and multi-line question renders as #ob-input, so the
// current question is filled regardless of how its prompt is worded (the role
// prompt differs per situation, e.g. "What do you do now, or …" for a switch).
async function fillCurrentAndContinue(page, value) {
  await page.locator('#ob-input').fill(value);
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function runPersona(browser, persona) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const log = {
    id: persona.id,
    label: persona.label,
    path: [],
    errors: [],
    ai: null,
    timings: {},
  };
  page.on('pageerror', (e) => log.errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') log.errors.push(`console: ${msg.text()}`);
  });

  const t0 = Date.now();
  await page.goto(BASE);
  await page.getByRole('button', { name: "Let's start" }).click();
  await shot(page, `${persona.id}-01-situation`);

  await pickRadio(page, persona.situation);
  log.path.push(`situation:${persona.situation}`);

  // Role
  await fillCurrentAndContinue(page, persona.role);
  log.path.push(`role:${persona.role}`);

  // Branch-specific follow-ups until hours
  for (let i = 0; i < 12; i++) {
    const heading = await page.getByRole('heading', { level: 2 }).first().innerText();
    log.path.push(`screen:${heading.slice(0, 80)}`);

    if (/hours a week|how many hours/i.test(heading)) break;
    if (/here'?s what i heard|check your answers/i.test(heading)) break;

    const radios = page.getByRole('radio');
    const radioCount = await radios.count();
    const textbox = page.getByRole('textbox').first();
    const hasText = await textbox.isVisible().catch(() => false);

    if (radioCount > 0) {
      const choice = persona.radioByHeading?.(heading) || 0;
      await radios.nth(Math.min(choice, radioCount - 1)).click();
      await page.getByRole('button', { name: 'Continue' }).click();
      continue;
    }
    if (hasText) {
      const value = persona.textByHeading?.(heading) || persona.shiftTarget || 'AI Engineer';
      await textbox.fill(value);
      await page.getByRole('button', { name: 'Continue' }).click();
      continue;
    }
    // Skip if available else continue
    const skip = page.getByRole('button', { name: 'Skip' });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    else await page.getByRole('button', { name: 'Continue' }).click();
  }

  // Hours
  if (await page.getByRole('radio').count()) {
    await pickRadio(page, /3.?5|4 hours|a few hours/i).catch(async () => {
      await page.getByRole('radio').nth(1).click();
      await page.getByRole('button', { name: 'Continue' }).click();
    });
  }

  // Achievements / things you did
  const thingsHeading = page.getByRole('heading', { level: 2 }).first();
  await thingsHeading.waitFor({ timeout: 10000 }).catch(() => {});
  const headingNow = await thingsHeading.innerText().catch(() => '');
  if (/glad you did|things you|achievement|evidence/i.test(headingNow) || await page.locator('#ob-input').count()) {
    // The evidence question is one textarea with one claim per line.
    await fillCurrentAndContinue(page, persona.evidence.join('\n'));
  }

  await shot(page, `${persona.id}-02-summary`);
  // Confirm create session
  const create = page.getByRole('button', { name: /Create recovery session|Confirm|Save and continue|Looks right/i });
  await create.first().click();
  await page.getByRole('heading', { name: /Evidence|Things you did|you control/i }).first().waitFor({ timeout: 20000 });
  log.timings.onboardingMs = Date.now() - t0;
  await shot(page, `${persona.id}-03-session`);

  // Confirm evidence items. Always target the next ENABLED Confirm button: a
  // disabled first button must not stop the items after it being confirmed.
  const enabledConfirm = page.getByRole('button', { name: 'Confirm', exact: true }).and(page.locator(':enabled'));
  const confirmCount = await page.getByRole('button', { name: 'Confirm', exact: true }).count();
  for (let i = 0; i < confirmCount; i++) {
    if (!(await enabledConfirm.count())) break;
    await enabledConfirm.first().click();
    await page.waitForTimeout(200);
  }
  // Add an extra FE→AI relevant claim if needed
  const addClaim = page.getByRole('button', { name: /Add claim|Add achievement|Add evidence/i });
  if (await addClaim.isVisible().catch(() => false)) {
    await addClaim.click();
    const claimBox = page.getByLabel(/claim|achievement|what you did/i).first();
    if (await claimBox.isVisible().catch(() => false)) {
      await claimBox.fill(persona.extraClaim);
      const save = page.getByRole('button', { name: /Save|Add/i }).first();
      await save.click();
      const confirm = page.getByRole('button', { name: 'Confirm' }).last();
      if (await confirm.isVisible()) await confirm.click();
    }
  }

  // Navigate to job targets
  const targetsNav = page.getByRole('button', { name: /Job targets|Targets|Requirements/i })
    .or(page.getByRole('link', { name: /Job targets|Targets/i }));
  if (await targetsNav.first().isVisible().catch(() => false)) {
    await targetsNav.first().click();
  } else {
    // wizard steps
    const step = page.getByRole('button', { name: /targets|jobs/i });
    if (await step.first().isVisible().catch(() => false)) await step.first().click();
  }

  await page.waitForTimeout(500);
  await shot(page, `${persona.id}-04-targets`);

  // Add the job target through the job-target form itself (job-targets.component.html):
  // scoping to that form keeps the hidden intake form's "Recent role" field out of it.
  const targetForm = page.locator('form.target-form');
  await targetForm.waitFor({ timeout: 15000 });
  await targetForm.getByLabel('Job title / opportunity').fill(persona.jobTitle);
  // One requirement per line, all of them.
  await targetForm.getByLabel(/Requirements from this opportunity/).fill(persona.requirements.join('\n'));
  await targetForm.getByRole('button', { name: 'Add requirements for review' }).click();
  await page.locator('article.job-target h3', { hasText: persona.jobTitle }).first().waitFor({ timeout: 15000 });
  log.path.push(`target:${persona.jobTitle} (${persona.requirements.length} requirements)`);

  await shot(page, `${persona.id}-05-target-added`);

  // Preview AI for this target, then wait for the payload itself or an error:
  // the panel's static "explicit consent" text is visible before any preview.
  const errorAlert = page.locator('.message.error[role="alert"]');
  const targetCard = page.locator('article.job-target', { hasText: persona.jobTitle }).first();
  await targetCard.getByRole('button', { name: 'Preview optional AI review payload' }).click();
  const previewOutcome = await firstOf({ preview: page.locator('.preview-json'), error: errorAlert }, 20000);
  await shot(page, `${persona.id}-06-ai-preview`);
  if (previewOutcome !== 'preview') {
    const message = previewOutcome === 'error' ? await errorAlert.innerText() : 'timed out waiting for the preview';
    log.ai = { error: `preview failed: ${message}` };
    notes.complaints.push(`${persona.id}: preview failed (${message})`);
  } else {
    const previewText = await page.locator('.preview-json').innerText();
    const consent = page.getByRole('button', { name: 'I consent: send this exact payload' });
    if (!(await consent.isEnabled())) {
      log.ai = { error: 'Consent button disabled — AI may not be enabled in UI', previewSnippet: previewText.slice(0, 800) };
      notes.complaints.push(`${persona.id}: consent disabled`);
    } else {
      const aiStart = Date.now();
      await consent.click();
      // The findings panel or the app's error alert; record a timeout as such.
      const outcome = await firstOf({ result: page.locator('.ai-findings'), error: errorAlert }, 90000);
      log.timings.aiMs = Date.now() - aiStart;
      await shot(page, `${persona.id}-07-ai-result`);
      const snippet = outcome === 'result'
        ? await page.locator('.ai-findings').innerText()
        : outcome === 'error' ? await errorAlert.innerText() : '';
      log.ai = {
        outcome,
        latencyMs: outcome === 'timeout' ? null : log.timings.aiMs,
        snippet: snippet.slice(0, 2500),
        previewSnippet: previewText.slice(0, 800),
      };
      if (outcome !== 'result') notes.complaints.push(`${persona.id}: AI review ${outcome}`);
    }
  }

  // AI status after
  const status = await page.request.get('http://127.0.0.1:4174/api/ai/status').then((r) => r.json());
  log.aiStatusAfter = status;

  notes.personas.push(log);
  await context.close();
  return log;
}

const personas = [
  {
    id: 'A-laid-off',
    label: 'Frontend engineer, recently laid off, switching to AI engineer',
    situation: /recently lost my job/i,
    role: 'Frontend Engineer',
    shiftTarget: 'AI Engineer',
    radioByHeading(h) {
      if (/time by which|need paid work/i.test(h)) return 1; // next few months
      if (/feeling about looking/i.test(h)) return 0; // ready
      if (/what would you like next/i.test(h)) return 1; // something different
      if (/where.*work|location/i.test(h)) return 0;
      if (/hours/i.test(h)) return 1;
      return 0;
    },
    textByHeading(h) {
      if (/curious about|kind of work/i.test(h)) return 'AI Engineer';
      if (/where/i.test(h)) return 'Remote / India';
      return 'AI Engineer';
    },
    evidence: [
      'Built and shipped React/TypeScript design-system components used across 4 product teams',
      'Led accessibility remediation to WCAG 2.2 AA for the customer dashboard',
      'Prototyped an internal LLM-assisted code review helper using the Anthropic API',
    ],
    extraClaim: 'Owned frontend performance work that cut LCP by ~35% on the marketing funnel',
    jobTitle: 'AI Engineer',
    requirements: [
      'Build LLM-powered product features with strong evaluation and safety practices',
      'Production experience with TypeScript services and frontend integration',
      'Ability to design RAG or tool-calling workflows and measure quality',
    ],
    jobDescription: `AI Engineer
We need someone who can ship LLM features into production products.
Requirements:
- Build LLM-powered product features with strong evaluation and safety practices
- Production experience with TypeScript services and frontend integration
- Ability to design RAG or tool-calling workflows and measure quality
Nice to have: prior frontend engineering background.`,
  },
  {
    id: 'B-employed-switch',
    label: 'Frontend engineer, employed, switching to AI engineer',
    situation: /different kind of work/i,
    role: 'Frontend Engineer',
    shiftTarget: 'AI Engineer',
    radioByHeading(h) {
      if (/time|urgency|timing/i.test(h)) return 2; // some time
      if (/hours/i.test(h)) return 2;
      return 0;
    },
    textByHeading(h) {
      if (/curious|new field|kind of work|direction/i.test(h)) return 'AI Engineer';
      return 'AI Engineer';
    },
    evidence: [
      '5 years building SPA dashboards in React, Next.js and TypeScript',
      'Introduced component testing and Storybook across a 12-person frontend team',
      'Built a retrieval demo that answers support questions from docs using embeddings',
    ],
    extraClaim: 'Mentored juniors on state management and web performance',
    jobTitle: 'AI Application Engineer',
    requirements: [
      'Ship AI features in customer-facing web apps',
      'Evaluate model quality with offline and online metrics',
      'Collaborate with product on safe UX for AI suggestions',
    ],
    jobDescription: `AI Application Engineer
Help product teams add AI into existing web apps.
Requirements:
- Ship AI features in customer-facing web apps
- Evaluate model quality with offline and online metrics
- Collaborate with product on safe UX for AI suggestions`,
  },
];

const browser = await chromium.launch({ headless: true });
try {
  notes.aiStatus = await fetch('http://127.0.0.1:4174/api/ai/status').then((r) => r.json());
  for (const persona of personas) {
    console.log('Running', persona.id);
    await runPersona(browser, persona);
  }
} catch (err) {
  notes.fatal = String(err?.stack || err);
  console.error(err);
  process.exitCode = 1; // the notes are still written below, but the run did not complete
} finally {
  await browser.close();
  notes.finishedAt = new Date().toISOString();
  writeFileSync(path.join(OUT, 'notes.json'), JSON.stringify(notes, null, 2));
  console.log('Wrote', path.join(OUT, 'notes.json'));
}

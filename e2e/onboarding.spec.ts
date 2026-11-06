import { test, expect, type Page } from '@playwright/test';
import { openStep } from './steps';

const heading = (page: Page, name: RegExp | string) => page.getByRole('heading', { level: 2, name });
const next = (page: Page) => page.getByRole('button', { name: 'Continue' }).click();

test('first visit: guided questions branch, allow changes and hand off to the step wizard', async ({ page }) => {
  const created: string[] = [];
  page.on('request', r => { if (r.method() === 'POST' && r.url().endsWith('/api/sessions')) created.push(r.url()); });

  await page.goto('/');
  await expect(heading(page, /Let's work out your next step/)).toBeVisible();
  await expect(page.getByText('no AI is used')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Recovery workflow' })).toHaveCount(0);

  await page.getByRole('button', { name: "Let's start" }).click();
  await expect(heading(page, /Which of these sounds most like you/)).toBeFocused();
  await next(page);
  await expect(page.getByText('Choose one option to continue.')).toBeVisible();
  await page.getByLabel("I've recently lost my job").check();
  await next(page);

  await expect(heading(page, /most recent role/)).toBeFocused();
  await expect(page.getByText('Question 2 of about')).toBeVisible();
  await page.getByLabel('What was your most recent role?').fill('Fictional retail supervisor');
  await next(page);
  await page.getByLabel('In the next few months').check();
  await next(page);
  await page.getByLabel('Up and down').check();
  await next(page);
  await expect(page.getByText("That's very common. We'll go one step at a time.")).toBeVisible();
  await page.getByLabel('Short-term or freelance work while I look').check();
  await next(page);
  await page.getByLabel(/short-term, part-time or freelance work/).fill('Fictional weekend stock counts');
  await next(page);
  await page.getByRole('button', { name: 'Skip' }).click(); // location
  await page.getByLabel('3 to 5 hours').check();
  await next(page);
  await page.getByLabel(/Name one to three things/).fill('Fictional: trained four new starters\nFictional: cut stock errors');
  await next(page);

  await expect(heading(page, "Here's what I heard. Did I get it right?")).toBeFocused();
  await expect(page.getByText('a stepping-stone role')).toBeVisible();
  await expect(page.getByText('Fictional weekend stock counts')).toBeVisible();
  expect(created, 'nothing is sent before the summary is confirmed').toEqual([]);

  // Change an answer: questions that no longer apply drop out, and Continue returns to the summary.
  await page.getByRole('button', { name: 'Change What you want next' }).click();
  await page.getByLabel('Something similar to before').check();
  await next(page);
  await expect(heading(page, /Here's what I heard/)).toBeVisible();
  await expect(page.getByText('Fictional weekend stock counts')).toHaveCount(0);
  await expect(page.getByText('a good place to start might be similar work to before', { exact: false })).toBeVisible();

  await page.getByRole('button', { name: "Looks right, let's continue" }).click();
  await expect(page.getByRole('heading', { name: 'Evidence you control' })).toBeVisible();
  expect(created).toHaveLength(1);
  await expect(page.getByText('Fictional: trained four new starters')).toBeVisible();

  // The full form now shows the answers, never the fictional sample.
  await openStep(page, 'About you');
  await expect(page.getByLabel('Recent role')).toHaveValue('Fictional retail supervisor');
  await expect(page.getByLabel('Adjacent direction')).toHaveValue('');
  await expect(page.getByLabel('Contract / bridge direction')).toHaveValue('');
  await expect(page.getByLabel('Available hours per week')).toHaveValue('4');
});

test('guided questions work with the keyboard alone and with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: "Let's start" }).focus();
  await page.keyboard.press('Enter');
  await expect(heading(page, /Which of these sounds most like you/)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel("I've recently lost my job")).toBeFocused();
  // Arrow keys move between choices without skipping ahead.
  await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel('I want to move into a different kind of work')).toBeChecked();
  await expect(heading(page, /Which of these sounds most like you/)).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).focus();
  await page.keyboard.press('Enter');
  await expect(heading(page, /What do you do now/)).toBeFocused();
  const animation = await page.locator('.ob-card').evaluate(el => getComputedStyle(el).animationName);
  expect(animation).toBe('none');
});

test('answers stay in memory only: a reload starts again, and the full form is always available', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: "Let's start" }).click();
  await page.getByLabel("Something else, or I'm not sure").check();
  await next(page);
  await page.getByLabel(/what's going on with work/).fill('Fictional answer that must not survive a reload');
  await page.reload();
  await expect(heading(page, /Let's work out your next step/)).toBeVisible();
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
  expect(storage).not.toContain('Fictional answer');

  await page.getByRole('button', { name: "I'd rather fill in one form" }).click();
  await expect(page.getByLabel('Recent role')).toHaveValue('');
  await page.getByRole('button', { name: 'Answer a few questions instead' }).click();
  await expect(heading(page, /Let's work out your next step/)).toBeVisible();
});

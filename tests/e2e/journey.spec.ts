import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const posting = readFileSync(new URL('../fixtures/jobs/labelled.txt', import.meta.url), 'utf8');
const resume = readFileSync(new URL('../fixtures/resumes/jordan-fictional.txt', import.meta.url), 'utf8');

test('Journey: first launch → onboarding → preferences → job intake → assessment → tracker → overview', async ({ page }) => {
  // First launch lands on the welcome flow.
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A calmer way to run your job search');

  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.getByRole('radio', { name: /Local only/ })).toBeChecked();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Target roles').fill('Platform Engineer, SRE');
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Target roles').fill('Platform Engineer, SRE');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("You're set up");
  await page.getByRole('button', { name: 'Fill in profile' }).click();

  // Preferences.
  await expect(page).toHaveURL(/\/profile$/);
  // M3: import a master resume, review, verify.
  await page.getByLabel('…or paste resume text').fill(resume);
  await page.getByRole('button', { name: 'Read pasted text' }).click();
  await expect(page.getByRole('heading', { name: /Review what was found/ })).toBeVisible();
  await page.getByRole('button', { name: 'Add selected to profile' }).click();
  for (const box of await page.getByRole('checkbox', { name: /I have checked this entry is accurate|^Verified$/ }).all()) await box.check();
  await page.getByLabel('Name', { exact: true }).fill('Alex Fictional');
  await page.getByLabel('Preferred countries').fill('Portugal, Spain');
  await page.getByRole('checkbox', { name: 'Hybrid' }).check();
  await page.getByLabel('Skills you can evidence').fill('TypeScript, PostgreSQL, Kubernetes');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved.')).toBeVisible();

  // Job intake with evidence.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Add a job' }).click();
  await page.getByLabel('Job posting URL (optional)').fill('https://careers.example.test/brightwater/77');
  await page.getByLabel('Job description').fill(posting);
  await page.getByRole('button', { name: 'Read details' }).click();
  await expect(page.getByLabel(/Job title/)).toHaveValue('Senior Platform Engineer');
  await expect(page.getByLabel('Salary')).toHaveValue('€68,000 - €82,000 per year');
  await expect(page.getByText('Unverified — not checked against the live posting')).toBeVisible();
  await expect(page.locator('#p-salary')).toContainText('From the text');
  await page.getByLabel('Location').fill('Lisbon (hybrid)');
  await expect(page.locator('#p-location')).toContainText('Entered by you');
  await page.getByRole('button', { name: 'Save to tracker' }).click();

  // Application detail and status workflow.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Senior Platform Engineer');
  await expect(page.locator('.status.large')).toHaveText('Discovered');
  await expect(page.getByRole('link', { name: /official posting/ })).toHaveAttribute('href', 'https://careers.example.test/brightwater/77');
  // M2: grounded assessment with evidence and an honest eligibility status.
  const fit = page.getByRole('region', { name: 'Fit and eligibility' });
  await expect(fit.getByText('Role alignment')).toBeVisible();
  await expect(fit.locator('.score-value')).not.toHaveText('—');
  await expect(fit.locator('.eligibility').first()).toHaveText('Eligibility unconfirmed');
  await expect(fit).toContainText('Countries where you are authorised to work');

  // M3: tailored drafts and verified exports.
  await page.getByRole('button', { name: 'Generate drafts' }).click();
  await expect(page.getByText('Senior Platform Engineer — Lumenfield Systems')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('region', { name: 'Tailored documents' }).getByRole('button', { name: 'Download PDF' }).first().click();
  expect((await download).suggestedFilename()).toMatch(/Resume\.pdf$/);
  await expect(page.getByText(/content check passed/)).toBeVisible();

  await page.getByRole('button', { name: 'Shortlisted' }).click();
  await expect(page.locator('.status.large')).toHaveText('Shortlisted');

  // Applied requires explicit confirmation; cancelling changes nothing.
  await page.getByRole('button', { name: 'Applied' }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirm you applied' });
  await expect(dialog.getByRole('button', { name: 'Mark as applied' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('.status.large')).toHaveText('Shortlisted');
  await page.getByRole('button', { name: 'Applied' }).click();
  await dialog.getByRole('checkbox', { name: 'I submitted this application myself' }).check();
  await dialog.getByRole('button', { name: 'Mark as applied' }).click();
  await expect(page.locator('.status.large')).toHaveText('Applied');

  await page.getByLabel('Add a note').fill('Referred by a former colleague.');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.locator('.timeline')).toContainText('Referred by a former colleague.');

  // Tracker list and overview reflect stored data, and survive a reload.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Tracker' }).click();
  await expect(page.locator('.app-row')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.app-row .status')).toHaveText('Applied');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Overview' }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  await expect(page.locator('.metric').filter({ hasText: 'Submitted (confirmed)' }).locator('dd')).toHaveText('1');
  await expect(page.locator('.metric').filter({ hasText: 'Tracked' }).locator('dd')).toHaveText('1');
});

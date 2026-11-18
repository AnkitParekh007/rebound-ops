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
  // Wait for the imported entries to render: locator.all() does not wait.
  const verifyBoxes = page.getByRole('checkbox', { name: /I have checked this entry is accurate|^Verified$/ });
  await expect(page.getByRole('checkbox', { name: 'I have checked this entry is accurate' }).first()).toBeVisible();
  for (const box of await verifyBoxes.all()) await box.check();
  for (const box of await verifyBoxes.all()) await expect(box).toBeChecked();
  await page.getByRole('group', { name: 'About you' }).getByLabel('Name', { exact: true }).fill('Alex Fictional');
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

  // Edit and save the draft, then export the edited resume as DOCX.
  const docs = page.getByRole('region', { name: 'Tailored documents' });
  await docs.getByLabel('Summary', { exact: true }).fill('Platform engineer focused on reliable delivery.');
  await docs.getByRole('button', { name: 'Save resume edits' }).click();
  await expect(page.getByText('Resume edits saved.')).toBeVisible();
  const docx = page.waitForEvent('download');
  await docs.getByRole('button', { name: 'Download DOCX' }).first().click();
  expect((await docx).suggestedFilename()).toMatch(/Resume\.docx$/);
  await expect(page.getByText(/Resume\.docx downloaded — content check passed/)).toBeVisible();

  // Application prep: official link and a reviewed screening answer.
  const prep = page.getByRole('region', { name: 'Prepare to apply' });
  await prep.getByLabel('Official application URL').fill('https://careers.example.test/brightwater/77/apply');
  await prep.getByRole('button', { name: 'Save link' }).click();
  await expect(prep.getByRole('link', { name: /Open the official application/ })).toHaveAttribute('href', 'https://careers.example.test/brightwater/77/apply');
  await prep.getByLabel(/Paste questions/).fill('Why do you want this role?');
  await prep.getByRole('button', { name: 'Draft answers' }).click();
  const answer = prep.getByLabel('Answer to: Why do you want this role?');
  await expect(answer).toBeVisible();
  await answer.fill('The platform focus matches my recent work.');
  await prep.getByRole('button', { name: 'Mark reviewed' }).click();
  await expect(prep.locator('.answer-status')).toHaveText('Reviewed');

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

  // Contacts, reminders and a follow-up draft (never sent).
  const track = page.getByRole('region', { name: 'Contacts and follow-ups' });
  await expect(track.getByText('Follow up if you have not heard back')).toBeVisible(); // added when marked applied
  await track.getByLabel('Reminder', { exact: true }).fill('Prepare for phone screen');
  await track.getByLabel('Due date').fill('2026-12-01');
  await track.getByRole('button', { name: 'Add reminder' }).click();
  await expect(track.getByText('Prepare for phone screen')).toBeVisible();
  const contactForm = track.getByRole('form', { name: 'Add a contact' });
  await contactForm.getByLabel('Name').fill('Sam Example');
  await contactForm.getByLabel('Role').fill('Recruiter');
  await contactForm.getByLabel('Email').fill('sam@example.test');
  await contactForm.getByRole('button', { name: 'Save contact' }).click();
  await expect(track.getByText('Sam Example')).toBeVisible();
  await track.getByRole('button', { name: 'Draft', exact: true }).click();
  await expect(track.getByLabel('Message', { exact: true })).toHaveValue(/Sam/);
  await expect(track.getByText('ReboundOps does not send messages.')).toBeVisible();

  // Everything above survives a reload.
  await page.reload();
  await expect(page.getByRole('region', { name: 'Tailored documents' }).getByLabel('Summary', { exact: true })).toHaveValue('Platform engineer focused on reliable delivery.');
  await expect(page.getByRole('region', { name: 'Prepare to apply' }).locator('.answer-status')).toHaveText('Reviewed');
  await expect(page.getByRole('region', { name: 'Contacts and follow-ups' }).getByText('Sam Example')).toBeVisible();

  // The same posting again is caught as a duplicate.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Add a job' }).click();
  await page.getByLabel('Job description').fill(posting);
  await page.getByRole('button', { name: 'Read details' }).click();
  await page.getByRole('button', { name: 'Save to tracker' }).click();
  await expect(page.getByText('This looks like a job you already saved. Save anyway to keep both.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save anyway' })).toBeVisible();

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

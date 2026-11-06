import { test, expect } from '@playwright/test';
import { openStep, useFullForm } from './steps';

test('exact source citation, user correction and dependent job review revocation', async ({ page }) => {
  await page.goto('/');
  await useFullForm(page);
  await page.getByRole('button', { name: /Create recovery session/i }).click();
  await expect(page.getByRole('heading', { name: 'Evidence you control' })).toBeVisible();

  await page.getByLabel('Source title').fill('Fictional design-system summary');
  await page.getByLabel('Source text (pasted locally, maximum 10,000 characters)')
    .fill('The project team migrated a reusable component library and improved keyboard accessibility.');
  await page.getByRole('button', { name: 'Add private source' }).click();
  await expect(page.getByText('Fictional design-system summary')).toBeVisible();

  await page.getByRole('button', { name: 'Correct & cite' }).first().click();
  await page.getByLabel('Revised claim').fill('Migrated reusable UI components');
  await page.getByLabel('Correction reason').fill('Backed a claim with exact source text');
  await page.getByLabel('Source document for the citation').selectOption({ index: 1 });
  await page.getByLabel('Exact unique quotation from the source document')
    .fill('migrated a reusable component library');
  await page.getByRole('button', { name: 'Save correction' }).click();

  await expect(page.getByText('migrated a reusable component library', { exact: false })).toBeVisible();
  await expect(page.getByText('Backed a claim with exact source text')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm', exact: true }).first().click();

  await openStep(page, 'Jobs you are looking at');
  await page.getByLabel('Job title / opportunity').fill('Frontend UI engineer');
  await page.getByLabel('Requirements from this opportunity — one per line').fill('Build reusable components');
  await page.getByRole('button', { name: 'Add requirements for review' }).click();
  await page.getByLabel('Evidence to link (only user-confirmed claims)').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Supported by my evidence' }).click();
  await expect(page.getByText('supported', { exact: true })).toBeVisible();

  await openStep(page, 'Things you did');
  await page.getByRole('button', { name: 'Correct & cite' }).first().click();
  await page.getByLabel('Revised claim').fill('Worked on component migration');
  await page.getByLabel('Correction reason').fill('Removed an overstated contribution');
  await page.getByRole('button', { name: 'Save correction' }).click();
  await expect(page.getByText('Removed an overstated contribution')).toBeVisible();
  await openStep(page, 'Jobs you are looking at');
  await expect(page.getByText('unreviewed', { exact: true })).toBeVisible();
});

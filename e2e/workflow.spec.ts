import { test, expect } from '@playwright/test';
import { openStep } from './steps';
import { readFile } from 'node:fs/promises';

test('guided recovery journey, manual job comparison, backup and restore', async ({ page }) => {
  await page.goto('/');
  const create = page.getByRole('button', { name: /Create recovery session/i });
  await expect(create).toBeEnabled();
  await create.click();
  await expect(page.getByRole('heading', { name: 'Evidence you control' })).toBeVisible();

  await page.getByRole('button', { name: 'Confirm', exact: true }).first().click();
  await expect(page.getByText('User-entered line 1 · confirmed')).toBeVisible();

  await openStep(page, 'Jobs you are looking at');
  await page.getByLabel('Job title / opportunity').fill('Frontend Platform Engineer');
  await page.getByLabel('Requirements from this opportunity — one per line')
    .fill('Build accessible component systems');
  await page.getByRole('button', { name: 'Add requirements for review' }).click();
  await expect(page.getByText('Build accessible component systems')).toBeVisible();

  await page.getByLabel('Evidence to link (only user-confirmed claims)').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Supported by my evidence' }).click();
  await expect(page.getByText('supported', { exact: true })).toBeVisible();

  await openStep(page, 'Your options');
  await page.getByRole('button', { name: 'Test Return' }).click();
  await expect(page.getByRole('heading', { name: 'Make progress manageable' })).toBeVisible();
  await page.locator('input[type=checkbox]').first().check();
  await expect(page.getByText('1 of 5 actions completed')).toBeVisible();

  const markdownDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Markdown' }).click();
  expect((await markdownDownload).suggestedFilename()).toBe('reboundops-seven-day-plan.md');

  await openStep(page, 'Keep or delete my data');
  const backupDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download session JSON' }).click();
  const backup = await backupDownload;
  expect(backup.suggestedFilename()).toBe('reboundops-session.json');
  const buffer = await readFile(await backup.path());

  await page.getByRole('button', { name: 'Delete local session' }).click();
  await expect(page.getByRole('heading', { name: 'Evidence you control' })).toHaveCount(0);
  await page.getByLabel('Resume a previous local backup').setInputFiles({
    name: 'session.json', mimeType: 'application/json', buffer
  });

  // A restored session with a plan reopens on the plan step.
  await expect(page.getByRole('heading', { name: 'Make progress manageable' })).toBeVisible();
  await expect(page.getByText('1 of 5 actions completed')).toBeVisible();
  await openStep(page, 'Jobs you are looking at');
  await expect(page.getByText('Build accessible component systems')).toBeVisible();
  await openStep(page, 'Things you did');
  await expect(page.getByRole('heading', { name: 'Evidence you control' })).toBeVisible();
});

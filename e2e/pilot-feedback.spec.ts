import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('pilot feedback is disabled without consent and downloads without API calls or career data', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Recent role').fill('PRIVATE SYNTHETIC ROLE');
  await page.getByLabel('Location or work preference').fill('PRIVATE SYNTHETIC LOCATION');
  await page.getByLabel('Priorities and constraints').fill('PRIVATE SYNTHETIC PRIORITIES');
  await page.getByLabel('Demonstrated achievements — one per line')
    .fill('PRIVATE SYNTHETIC EVIDENCE CLAIM');
  await page.getByRole('button', { name: /Create recovery session/i }).click();
  await expect(page.getByRole('heading', { name: 'Private pilot feedback' })).toBeVisible();
  const downloadButton = page.getByRole('button', { name: 'Download private feedback' });
  await expect(downloadButton).toBeDisabled();

  await page.getByLabel('Anonymous participant code (optional; not a name)').fill('P01');
  await page.getByLabel('Were the Return / Shift / Bridge directions understandable?').selectOption('partly');
  await page.getByLabel('Was it clear what stays on your computer and what could be sent to AI?').selectOption('no');
  await page.getByLabel('What, if anything, was most useful?').fill('Three routes were easy to compare.');
  await page.getByLabel('What was confusing, unhelpful or broken?').fill('Could not find the next step.');
  await page.getByLabel('Did you actually attempt a real-world action from the plan?').selectOption('not_attempted');
  await page.getByLabel('Would you choose to use ReboundOps again?').selectOption('maybe');
  await expect(downloadButton).toBeDisabled();

  await page.getByLabel('I choose to create a local feedback file from these answers.').check();
  await expect(downloadButton).toBeEnabled();

  const outgoing: string[] = [];
  page.on('request', req => {
    if (req.method() !== 'GET') outgoing.push(req.method() + ' ' + req.url());
  });
  const downloadEvent = page.waitForEvent('download');
  await downloadButton.click();
  const file = await downloadEvent;
  expect(file.suggestedFilename()).toBe('reboundops-private-pilot-feedback.md');
  const report = await readFile(await file.path(), 'utf8');

  expect(report).toContain('Anonymous participant code: P01');
  expect(report).toContain('Direction options understandable: partly');
  expect(report).toContain('Privacy/data sharing understandable: no');
  expect(report).toContain('Most useful: Three routes were easy to compare.');
  expect(report).toContain('Confusing or not working: Could not find the next step.');
  expect(report).toContain('Real-world action status (self-report): not_attempted');
  expect(report).toContain('Would use ReboundOps again: maybe');
  expect(report).not.toContain('PRIVATE SYNTHETIC ROLE');
  expect(report).not.toContain('PRIVATE SYNTHETIC LOCATION');
  expect(report).not.toContain('PRIVATE SYNTHETIC PRIORITIES');
  expect(report).not.toContain('PRIVATE SYNTHETIC EVIDENCE CLAIM');
  expect(outgoing).toEqual([]);

  await page.getByRole('button', { name: 'Clear these answers' }).click();
  await expect(downloadButton).toBeDisabled();
  await expect(page.getByLabel('What, if anything, was most useful?')).toHaveValue('');
  await expect(page.getByLabel('I choose to create a local feedback file from these answers.')).not.toBeChecked();
});

test('pilot responses are not saved in session backups and are cleared between sessions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Create recovery session/i }).click();
  await page.getByRole('button', { name: 'Test Return' }).click();

  await page.getByLabel('Anonymous participant code (optional; not a name)').fill('P07');
  await page.getByLabel('When are you answering?').selectOption('seven_day_followup');
  await page.getByLabel('What, if anything, was most useful?').fill('Private feedback sentinel 9831');
  await page.getByLabel('Did you actually attempt a real-world action from the plan?').selectOption('completed');
  await page.getByLabel('I choose to create a local feedback file from these answers.').check();

  const reportDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download private feedback' }).click();
  const report = await readFile(await (await reportDownload).path(), 'utf8');
  expect(report).toContain('Study stage: seven_day_followup');
  expect(report).toContain('Route selected in current session: return');
  expect(report).toContain('Real-world action status (self-report): completed');
  expect(report).toContain('Self-reported answers, not independently verified outcomes');

  const backupDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download session JSON' }).click();
  const backup = await readFile(await (await backupDownload).path(), 'utf8');
  expect(backup).not.toContain('Private feedback sentinel 9831');
  expect(backup).not.toContain('P07');
  expect(backup).not.toContain('seven_day_followup');
  await page.getByRole('button', { name: 'Clear form' }).click();
  await page.getByRole('button', { name: /Create recovery session/i }).click();
  await expect(page.getByLabel('What, if anything, was most useful?')).toHaveValue('');
  await expect(page.getByLabel('Anonymous participant code (optional; not a name)')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Download private feedback' })).toBeDisabled();
});

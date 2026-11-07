import { test, expect } from '@playwright/test';
import { useFullForm } from './steps';
import { expectAxeClean } from './a11y';

test('contract validation blocks invalid intake locally with accessible inline errors', async ({ page }) => {
  const created: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().endsWith('/api/sessions')) created.push(request.url());
  });
  await page.goto('/');
  await useFullForm(page, { example: false });
  await page.getByRole('button', { name: 'Clear form' }).click();
  await page.getByLabel('Available hours per week').fill('25');
  await page.getByRole('button', { name: /Create recovery session/i }).click();

  await expect(page.getByRole('alert')).toHaveText('Please review the form values and source claims.');
  const role = page.getByLabel('Recent role');
  await expect(role).toHaveAttribute('aria-invalid', 'true');
  await expect(role).toHaveAccessibleDescription('This field is required.');
  await expect(page.getByLabel('Available hours per week')).toHaveAccessibleDescription('Enter 20 or less.');
  expect(created, 'no API call for an invalid form').toEqual([]);

  await expectAxeClean(page, 'invalid-intake-form');

  await role.fill('Fictional Platform Engineer');
  await page.getByLabel('Available hours per week').fill('4');
  await expect(role).toHaveAttribute('aria-invalid', 'false');
  await page.getByRole('button', { name: /Create recovery session/i }).click();
  await expect(page.getByRole('heading', { name: 'Evidence you control' })).toBeVisible();
  expect(created).toHaveLength(1);
});

import { test, expect } from '@playwright/test';
import { openStep, useFullForm } from './steps';

test('small-screen recovery flow does not require horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await useFullForm(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: /Create recovery session/i }).click();
  await expect(page.getByRole('heading', { name: 'Evidence you control' })).toBeVisible();
  await openStep(page, 'Your options');
  await page.getByRole('button', { name: 'Test Return' }).click();
  await expect(page.getByRole('heading', { name: 'Make progress manageable' })).toBeVisible();
  const widthOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(widthOverflow).toBeLessThanOrEqual(1);
});

test('intake fields and submission work without a pointer', async ({ page }) => {
  await page.goto('/');
  await useFullForm(page);
  await page.getByLabel('Recent role').focus();
  await expect(page.getByLabel('Recent role')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Location or work preference')).toBeFocused();
  await page.getByRole('button', { name: /Create recovery session/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Evidence you control' })).toBeVisible();
});

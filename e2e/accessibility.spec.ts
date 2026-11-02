import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('core flow has no serious or critical WCAG violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const initial = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(initial.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')
    .map(v => v.id + ': ' + v.description)).toEqual([]);

  await page.getByRole('button', { name: /Create recovery session/i }).click();
  await expect(page.getByRole('heading', { name: 'Evidence you control' })).toBeVisible();
  const inSession = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(inSession.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')
    .map(v => v.id + ': ' + v.description)).toEqual([]);
});

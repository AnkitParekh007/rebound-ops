import { test, expect } from '@playwright/test';
import { expectAxeClean } from './a11y';

test('core flow has no serious/critical axe findings and no new residual ones', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectAxeClean(page, 'welcome');

  await page.getByRole('button', { name: "Let's start" }).click();
  await expect(page.getByRole('heading', { name: /Which of these sounds most like you/ })).toBeFocused();
  // Scan the settled card, not the short fade-in (partial opacity would skew contrast).
  await page.locator('.ob-card').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
  await expect(page.locator('.ob-card')).toHaveCSS('opacity', '1');
  await expectAxeClean(page, 'first-question');
  await page.getByRole('button', { name: 'Switch to the full form' }).click();
  await page.getByRole('button', { name: 'Use fictional example' }).click();

  await page.getByRole('button', { name: /Create recovery session/i }).click();
  await expect(page.getByRole('heading', { name: 'Evidence you control' })).toBeVisible();
  await expectAxeClean(page, 'in-session');
});

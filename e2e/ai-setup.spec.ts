import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test('AI setup is discoverable before intake and keeps provider keys out of the browser', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Set up AI assistance', exact: true }).first().click();
  const setup = page.locator('#ai-setup');
  await expect(setup.getByRole('heading', { name: 'Set up AI assistance' })).toBeVisible();
  await expect(setup).toContainText('AI not configured');
  await expect(setup.getByRole('button', { name: 'Test connection' })).toBeDisabled();
  await expect(setup.locator('input')).toHaveCount(0);
  const audit = await new AxeBuilder({ page }).include('#ai-setup').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(audit.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('connection test requires a separate click and shows verified status without sending session data', async ({ page }) => {
  let connected = false;
  let calls = 0;
  await page.route('**/api/ai/status', route => route.fulfill({ json: {
    enabled: true, provider: 'fictional-anthropic', model: 'fixture-model',
    connectionStatus: connected ? 'connected' : 'not-tested',
    attempts: 0, maxAttempts: 10, successful: 0, failed: 0, reportedInputTokens: 0, reportedOutputTokens: 0
  } }));
  await page.route('**/api/ai/test-connection', async route => {
    expect(route.request().postDataJSON()).toEqual({ consent: true });
    calls++; connected = true;
    await route.fulfill({ json: { connected: true, checkedAt: '2026-11-08T00:00:00Z' } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Set up AI assistance', exact: true }).first().click();
  const setup = page.locator('#ai-setup');
  await expect(setup).toContainText('Configured — connection not tested');
  expect(calls).toBe(0);
  await setup.getByRole('button', { name: 'Test connection' }).click();
  await expect(setup).toContainText('AI connected');
  expect(calls).toBe(1);
});

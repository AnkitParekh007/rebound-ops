import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

function seriousFindings(result: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return result.violations
    .filter(v => v.impact === 'critical' || v.impact === 'serious')
    .flatMap(v => v.nodes.map(node =>
      ({ rule: v.id, target: node.target.join(' '), failure: node.failureSummary ?? '' })));
}

test('core flow has no serious or critical WCAG violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const initial = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(seriousFindings(initial)).toEqual([]);

  await page.getByRole('button', { name: /Create recovery session/i }).click();
  await expect(page.getByRole('heading', { name: 'Evidence you control' })).toBeVisible();
  const inSession = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(seriousFindings(inSession)).toEqual([]);
});

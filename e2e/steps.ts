import type { Page } from '@playwright/test';

export type StepLabel =
  | 'About you' | 'Things you did' | 'Jobs you are looking at' | 'Your options'
  | 'Your 7-day plan' | 'Keep or delete my data' | 'Tell us how it went';

/** Opens a wizard step from the step list, expanding it first on small screens. */
export async function openStep(page: Page, label: StepLabel): Promise<void> {
  const nav = page.getByRole('navigation', { name: 'Recovery workflow' });
  const toggle = nav.locator('.wizard-toggle');
  if (await toggle.isVisible() && (await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await nav.getByRole('button', { name: new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*,') }).click();
}

/**
 * From the guided welcome screen, switches to the single full form and loads
 * the fictional example (the form starts blank so fiction is never submitted
 * by accident).
 */
export async function useFullForm(page: Page, options: { example?: boolean } = {}): Promise<void> {
  await page.getByRole('button', { name: "I'd rather fill in one form" }).click();
  if (options.example !== false) await page.getByRole('button', { name: 'Use fictional example' }).click();
}

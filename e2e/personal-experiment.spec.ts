import { test, expect } from '@playwright/test';
import { openStep, useFullForm } from './steps';

test('a reviewed concrete experiment replaces a template without changing its time budget', async ({page}) => {
  await page.goto('/');await useFullForm(page);
  await page.getByRole('button',{name:/Create recovery session/i}).click();
  await openStep(page,'Your options');await page.getByRole('button',{name:/^Choose /}).first().click();
  await openStep(page,'Your 7-day plan');
  const budget=await page.locator('.time-pill').innerText();
  await page.getByText('Make a step specific to your evidence gap',{exact:true}).click();
  await page.getByLabel('Your concrete experiment').fill('Build a small Terraform sandbox and record which steps remain unproven.');
  await page.getByRole('button',{name:'Save experiment',exact:true}).click();
  await expect(page.locator('.plan-list')).toContainText('Build a small Terraform sandbox');
  await expect(page.locator('.time-pill')).toHaveText(budget);
});

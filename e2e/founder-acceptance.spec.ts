import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const scenarios = [
  { id: 'return', title: 'Return', role: 'Fictional Senior Frontend Developer',
    shift: 'Fictional DevOps engineer', bridge: 'Fictional UI contractor',
    target: 'Fictional Staff Frontend Engineer' },
  { id: 'shift', title: 'Shift', role: 'Fictional UI Platform Engineer',
    shift: 'Fictional Accessibility Specialist', bridge: 'Fictional audit contractor',
    target: 'Fictional Accessibility Engineer' },
  { id: 'bridge', title: 'Bridge', role: 'Fictional Software Team Lead',
    shift: 'Fictional Platform Engineer', bridge: 'Fictional component-library consulting',
    target: 'Fictional short-term UI consultant' }
] as const;

for (const scenario of scenarios) {
  test('founder acceptance: full ' + scenario.title + ' journey, source, action, export and restore', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Recent role').fill(scenario.role);
    await page.getByLabel('Available hours per week').fill('6');
    await page.getByLabel('Location or work preference').fill('Fictional remote-only');
    await page.getByLabel('Priorities and constraints').fill('Synthetic data only; prefer small experiments');
    await page.getByLabel('Demonstrated achievements — one per line').fill(
      'Built a fictional UI library\nHelped a fictional team with release practices'
    );
    await page.getByLabel('Adjacent direction').fill(scenario.shift);
    await page.getByLabel('Contract / bridge direction').fill(scenario.bridge);
    await page.getByRole('button', { name: /Create recovery session/i }).click();
    await expect(page.getByRole('heading', { name: 'Evidence you control' })).toBeVisible();
    await expect(page.getByText('User-entered line 1 · unverified')).toBeVisible();

    await page.getByLabel('Source title').fill('Synthetic team project note');
    await page.getByLabel('Source text (pasted locally, maximum 10,000 characters)')
      .fill('Synthetic work log: built a reusable UI library and reviewed keyboard controls.');
    await page.getByRole('button', { name: 'Add private source' }).click();
    await page.getByRole('button', { name: 'Correct & cite' }).first().click();
    await page.getByLabel('Revised claim').fill('Built a reusable UI library');
    await page.getByLabel('Correction reason').fill('Adjusted the claim to match quoted work');
    await page.getByLabel('Source document for the citation').selectOption({ index: 1 });
    await page.getByLabel('Exact unique quotation from the source document')
      .fill('built a reusable UI library');
    await page.getByRole('button', { name: 'Save correction' }).click();
    await expect(page.getByText('Adjusted the claim to match quoted work')).toBeVisible();
    await expect(page.getByText('Built a reusable UI library', { exact: true })).toBeVisible();

    // Correction cannot silently become "confirmed" without participant action.
    await expect(page.getByText('Synthetic team project note · unverified')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm', exact: true }).first().click();
    await expect(page.getByText('Synthetic team project note · confirmed')).toBeVisible();

    await page.getByLabel('Job title / opportunity').fill(scenario.target);
    await page.getByLabel('Requirements from this opportunity — one per line')
      .fill('Build reusable accessible components\nDemonstrate a production accessibility audit');
    await page.getByRole('button', { name: 'Add requirements for review' }).click();
    await expect(page.getByText('Build reusable accessible components', { exact: true })).toBeVisible();
    await page.getByLabel('Evidence to link (only user-confirmed claims)').first().selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Supported by my evidence' }).first().click();
    await page.getByRole('button', { name: 'Evidence gap' }).last().click();
    await expect(page.getByText('supported', { exact: true })).toBeVisible();
    await expect(page.getByText('gap', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Test ' + scenario.title }).click();
    await expect(page.getByRole('heading', { name: 'Make progress manageable' })).toBeVisible();
    const budgetLabel = await page.locator('.time-pill').innerText();
    const [planned, available] = budgetLabel.match(/\d+/g)!.map(Number);
    expect(available).toBe(360);
    expect(planned).toBeLessThanOrEqual(available);
    await page.locator('.plan-list input[type="checkbox"]').first().check();
    await expect(page.getByText(/1 of \d+ actions completed/)).toBeVisible();

    const note = 'Fictional check-in: scheduled a short portfolio experiment for ' + scenario.title;
    await page.getByLabel('Check-in notes and real-world outcomes').fill(note);
    await page.getByRole('button', { name: 'Save check-in' }).click();
    await expect(page.locator('.saved-review')).toContainText(note);

    const markdownEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Markdown' }).click();
    const markdownDownload = await markdownEvent;
    expect(markdownDownload.suggestedFilename()).toBe('reboundops-seven-day-plan.md');
    const markdown = await readFile(await markdownDownload.path(), 'utf8');
    expect(markdown).toContain(scenario.role);
    expect(markdown).toContain('## Evidence and provenance');
    expect(markdown).toContain('built a reusable UI library');
    expect(markdown).toContain('Corrections (user-supplied)');
    expect(markdown).toContain('[supported] Build reusable accessible components');
    expect(markdown).toContain('[gap] Demonstrate a production accessibility audit');
    expect(markdown).toContain('- ' + scenario.title + ':');
    expect(markdown).toContain(note);
    expect(markdown).toContain('[x] Day 1');

    const backupEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download session JSON' }).click();
    const backupDownload = await backupEvent;
    expect(backupDownload.suggestedFilename()).toBe('reboundops-session.json');
    const buffer = await readFile(await backupDownload.path());
    const snapshot = JSON.parse(buffer.toString());
    expect(snapshot.intake.role).toBe(scenario.role);
    expect(snapshot.plan.routeId).toBe(scenario.id);
    expect(snapshot.plan.actions[0].completed).toBe(true);
    expect(snapshot.reviewNotes).toBe(note);
    expect(snapshot.sourceDocuments).toHaveLength(1);
    expect(snapshot.corrections).toHaveLength(1);
    expect(snapshot.persistence).toBe('memory');

    await page.getByRole('button', { name: 'Delete local session' }).click();
    await expect(page.getByRole('heading', { name: 'Evidence you control' })).toHaveCount(0);
    await page.getByLabel('Resume a previous local backup').setInputFiles({
      name: 'fictional-backup.json', mimeType: 'application/json', buffer
    });
    await expect(page.getByRole('heading', { name: 'Evidence you control' })).toBeVisible();
    await expect(page.getByText(scenario.target, { exact: true })).toBeVisible();
    await expect(page.locator('.saved-review')).toContainText(note);
    await expect(page.getByText(/1 of \d+ actions completed/)).toBeVisible();
    await expect(page.getByText('Synthetic team project note · confirmed')).toBeVisible();
  });
}

for (const scenario of scenarios) {
  test('founder acceptance: ' + scenario.title + ' keeps a one-hour weekly budget', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Available hours per week').fill('1');
    await page.getByRole('button', { name: /Create recovery session/i }).click();
    await page.getByRole('button', { name: 'Test ' + scenario.title }).click();
    const budgetLabel = await page.locator('.time-pill').innerText();
    const [planned, available] = budgetLabel.match(/\d+/g)!.map(Number);
    expect(available).toBe(60);
    expect(planned).toBeGreaterThan(0);
    expect(planned).toBeLessThanOrEqual(60);
    expect(await page.locator('.plan-list input[type=checkbox]').count()).toBeGreaterThan(0);
  });
}

test('founder acceptance: no external AI request or local disk saving is enabled by default', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Location or work preference').fill('PRIVATE_TEST_LOCATION');
  await page.getByLabel('Priorities and constraints').fill('PRIVATE_TEST_NOTES');
  await page.getByLabel('Demonstrated achievements — one per line').fill(
    'Synthetic confirmed achievement\nSynthetic unverified achievement'
  );
  await page.getByRole('button', { name: /Create recovery session/i }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).first().click();
  await page.getByLabel('Job title / opportunity').fill('Fictional frontend role');
  await page.getByLabel('Requirements from this opportunity — one per line')
    .fill('Deliver accessible components');
  await page.getByRole('button', { name: 'Add requirements for review' }).click();
  await page.getByRole('button', { name: 'Preview optional AI review payload' }).click();

  const preview = page.locator('pre.preview-json');
  await expect(preview).toContainText('Synthetic confirmed achievement');
  await expect(preview).not.toContainText('Synthetic unverified achievement');
  await expect(preview).not.toContainText('PRIVATE_TEST_LOCATION');
  await expect(preview).not.toContainText('PRIVATE_TEST_NOTES');
  await expect(page.getByRole('button', { name: 'I consent: send this exact payload' })).toBeDisabled();

  const status = await page.request.get('/api/health');
  expect(status.ok()).toBe(true);
  expect((await status.json()).persistence).toBe('memory');
  const disk = await page.request.get('/api/persistence/status');
  expect((await disk.json()).available).toBe(false);
});

test('founder acceptance: incorrect source quote is rejected without changing the claim', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Create recovery session/i }).click();
  await page.getByLabel('Source title').fill('Fictional project note');
  await page.getByLabel('Source text (pasted locally, maximum 10,000 characters)')
    .fill('Completed a fictional component migration.');
  await page.getByRole('button', { name: 'Add private source' }).click();
  await page.getByRole('button', { name: 'Correct & cite' }).first().click();
  await page.getByLabel('Revised claim').fill('Completed a component migration');
  await page.getByLabel('Correction reason').fill('Made claim more precise');
  await page.getByLabel('Source document for the citation').selectOption({ index: 1 });
  await page.getByLabel('Exact unique quotation from the source document')
    .fill('this passage is not in the document');
  await page.getByRole('button', { name: 'Save correction' }).click();
  await expect(page.getByRole('alert')).toContainText('The excerpt must appear exactly');
  await expect(page.getByText('User-entered line 1 · unverified')).toBeVisible();

  await page.getByLabel('Exact unique quotation from the source document')
    .fill('Completed a fictional component migration.');
  await page.getByRole('button', { name: 'Save correction' }).click();
  await expect(page.getByText('Fictional project note · unverified')).toBeVisible();
});

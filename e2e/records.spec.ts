import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { openStep, useFullForm } from './steps';
import { expectAxeClean } from './a11y';

// Application records (R0 operations store) run against the second e2e API on
// port 4175, which has an operations flag on and a throwaway data folder. That
// store is shared by every browser project, so this journey runs in Chromium
// only, and uses #s unique to the run so a retry never meets its own rows.
const OPERATIONS = 'http://127.0.0.1:4175';

async function startSession(page: Page): Promise<void> {
  await useFullForm(page);
  await page.getByRole('button', { name: /Create recovery session/i }).click();
  await expect(page.getByRole('heading', { name: 'Evidence you control' })).toBeVisible();
}

test('the step is not offered while every operations flag is off', async ({ page }) => {
  await page.goto('/#records');
  await startSession(page);
  const nav = page.getByRole('navigation', { name: 'Recovery workflow' });
  await expect(nav.getByRole('button', { name: /^Keep or delete my data\s*,/ })).toBeAttached();
  await expect(nav.getByRole('button', { name: /^Application records\s*,/ })).toHaveCount(0);
});

test('import, export, back up, remove a record\'s details and restore', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'One shared operations store; run once.');
  const a = 100_000 + (Date.now() % 800_000);
  const b = a + 1;
  const tracker = [
    '# Applications Tracker', '',
    '| # | Date | Company | Via | Role | Score | Status | PDF | Report | Notes |',
    '|---|---|---|---|---|---|---|---|---|---|',
    `| ${a} | 2026-06-20 | Fictional Startup Studio | — | Backend Engineer | 4.2/5 | Applied | ✅ | — | fictional note |`,
    `| ${b} | 2026-06-21 | Example Labs | — | Platform Engineer | 3.9/5 | Interview | ✅ | — | fictional note |`,
    `| ${b + 1} | 2026-13-40 | Placeholder Inc | — | Engineer | 3/5 | Applied | — | — | bad date |`, ''
  ].join('\n');

  await page.goto(OPERATIONS + '/');
  await startSession(page);
  await openStep(page, 'Application records');
  await expect(page.getByRole('heading', { name: 'Application records', level: 2 })).toBeFocused();

  // Check first: nothing is written.
  await page.getByLabel('Tracker text').fill(tracker);
  await page.getByRole('button', { name: 'Check what would change' }).click();
  const table = page.getByRole('region', { name: 'Applications in the tracker and the store' });
  await expect(table.getByRole('row', { name: new RegExp(`^${a} .*Not imported yet`) })).toBeVisible();
  await expect(page.getByText(/The date is not a real YYYY-MM-DD date/)).toBeVisible();
  await expectAxeClean(page, 'application records after a check');

  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('2 added');
  await expect(page.getByText('2 added, 0 updated, 0 unchanged, 1 held back.', { exact: true })).toBeVisible();

  // Export: the downloaded table holds both records.
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download as Markdown' }).click()]);
  expect(download.suggestedFilename()).toBe('applications.md');
  const exported = await readFile((await download.path())!, 'utf8');
  expect(exported).toContain(`| ${a} | 2026-06-20 | Fictional Startup Studio |`);
  expect(exported).toContain(`| ${b} | 2026-06-21 | Example Labs |`);

  // Back up, then remove one record's details.
  await page.getByRole('button', { name: 'Back up now' }).click();
  await expect(page.getByRole('status')).toContainText(/Backup operations-.*\.sqlite saved/);
  const backupName = (await page.getByRole('status').textContent())!.match(/operations-\S+\.sqlite/)![0];

  await page.getByLabel('Record', { exact: true }).selectOption({ label: `#${a} · Fictional Startup Studio — Backend Engineer` });
  await page.getByRole('button', { name: 'Remove details' }).click();
  await expect(page.getByText('Tick the box to confirm.').first()).toBeVisible();
  await page.getByLabel('I understand this cannot be undone.').check();
  await page.getByRole('button', { name: 'Remove details' }).click();
  await expect(page.getByRole('status')).toContainText('may still hold it');
  await expect(page.getByText(`Backup ${backupName}`)).toBeVisible();
  await expect(page.getByLabel('Record', { exact: true }).getByRole('option', { name: new RegExp(`#${a} `) })).toHaveCount(0);

  // Restore the backup taken before the removal: the details come back.
  await page.getByRole('button', { name: `Restore backup ${backupName}` }).click();
  await page.getByLabel('I want to replace every record with this backup.').check();
  await page.getByRole('button', { name: 'Restore this backup' }).click();
  await expect(page.getByRole('status')).toContainText('so you can undo this');
  await expect(page.getByLabel('Record', { exact: true }).getByRole('option', { name: `#${a} · Fictional Startup Studio — Backend Engineer` })).toHaveCount(1);
  await expectAxeClean(page, 'application records after a restore');
});

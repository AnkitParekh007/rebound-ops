/**
 * v0.2.0 browser coverage. Runs after journey.spec.ts (single worker, files in
 * name order) against the same throwaway data folder, and sets up the state it
 * needs through the API. Fictional data only; no job board is contacted.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { buildPdf, font, page as pdfPage, stream } from '../helpers/pdf-fixtures.ts';

const resumeLines = readFileSync(new URL('../fixtures/resumes/jordan-fictional.txt', import.meta.url), 'utf8')
  .split('\n')
  .filter((l) => l.trim() && /^[\x20-\x7e]+$/.test(l)) // plain ASCII lines keep the hand-built PDF simple
  .slice(0, 18);

function resumePdf(): Buffer {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const ops = resumeLines.map((l, i) => `${i === 0 ? '' : '0 -16 Td '}(${esc(l)}) Tj`).join(' ');
  return buildPdf(['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', pdfPage('5 0 R'), font, stream(`BT /F1 10 Tf 56 780 Td ${ops} ET`)]);
}

const user = { origin: 'user', evidence: null };
async function createJob(request: APIRequestContext, title: string): Promise<string> {
  const res = await request.post('/api/jobs', {
    data: { title, employer: 'Fictional E2E Co', description: `${title} at a fictional company.`, sourceUrl: null, workArrangement: null, provenance: { title: user, employer: user, location: null, salary: null }, allowDuplicate: true },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).application.id as string;
}

test.beforeEach(async ({ request }) => {
  await request.put('/api/onboarding', { data: { status: 'completed' } });
});

test('PDF resume import shows extraction confidence and needs review', async ({ page }) => {
  await page.goto('/profile');
  await page.locator('#resume-file').setInputFiles({ name: 'jordan.pdf', mimeType: 'application/pdf', buffer: resumePdf() });
  await expect(page.getByRole('heading', { name: 'Review what was found in jordan.pdf' })).toBeVisible();
  await expect(page.locator('.extraction')).toContainText('Extraction confidence:');
  await expect(page.locator('.extraction')).toContainText('text read from PDF');
  // Nothing is added until the person chooses to.
  await expect(page.getByRole('button', { name: 'Add selected to profile' })).toBeVisible();
});

test('A scanned PDF offers manual entry and keeps the original', async ({ page }) => {
  await page.goto('/profile');
  const scan = buildPdf(['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', pdfPage('5 0 R'), font, stream('q 0.2 g 72 72 451 698 re f Q')]);
  await page.locator('#resume-file').setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: scan });
  await expect(page.getByRole('alert')).toContainText('no selectable text');
  await page.getByLabel('Resume text', { exact: true }).fill(resumeLines.join('\n'));
  await page.getByRole('button', { name: 'Read my text' }).click();
  await expect(page.locator('.extraction')).toContainText('text you entered');
});

test('Deleting a contact can be undone, and a rejected application reopens with its history', async ({ page, request }) => {
  const id = await createJob(request, 'E2E Undo Role');
  await page.goto(`/tracker/${id}`);
  const track = page.getByRole('region', { name: 'Contacts and follow-ups' });
  const form = track.getByRole('form', { name: 'Add a contact' });
  await form.getByLabel('Name').fill('Robin Placeholder');
  await form.getByRole('button', { name: 'Save contact' }).click();
  await track.getByRole('button', { name: 'Delete contact Robin Placeholder' }).click();
  await expect(track.locator('.undo-bar')).toContainText('Deleted contact “Robin Placeholder”');
  await track.getByRole('button', { name: 'Undo' }).click();
  await expect(track.getByText('Robin Placeholder')).toBeVisible();

  await page.getByRole('button', { name: 'Rejected', exact: true }).click();
  await expect(page.locator('.status.large')).toHaveText('Rejected');
  await page.getByRole('button', { name: 'Preparing', exact: true }).click();
  await expect(page.locator('.status.large')).toHaveText('Preparing');
  await expect(page.locator('.timeline')).toContainText('Reopened: Rejected → Preparing');
  await expect(page.locator('.timeline')).toContainText('Earlier history is kept.');
});

test('Discover asks before contacting job boards and explains unsupported providers', async ({ page }) => {
  await page.goto('/discover');
  await expect(page.getByRole('heading', { name: 'Allow ReboundOps to contact job boards?' })).toBeVisible();
  await page.getByRole('button', { name: 'Allow contacting job boards' }).click();
  await page.getByLabel('Careers-page URL or board name').fill('https://example.wd1.myworkdayjobs.com/en-US/External');
  await page.getByRole('button', { name: 'Look up' }).click();
  await expect(page.getByRole('alert')).toContainText('Workday does not publish a documented public job-posting API');
  await page.getByText('Which job boards are supported, and their limits').click();
  await expect(page.getByText('Not available')).toBeVisible();
});

test('Password-protected backup, then in-app restore with confirmation and a recovery copy', async ({ page, request }) => {
  await createJob(request, 'E2E Kept By Backup');
  await page.goto('/settings');
  const panel = page.getByRole('region', { name: 'Backup and restore' });
  await panel.getByLabel('Password (at least 10 characters)').fill('fictional passphrase 42');
  await panel.getByLabel('Repeat password').fill('fictional passphrase 42');
  const downloading = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Download protected backup' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^reboundops-backup-\d{4}-\d{2}-\d{2}\.rbobak$/);
  const file = await download.path();

  await createJob(request, 'E2E Added After Backup');
  await panel.locator('#restore-file').setInputFiles(file);
  await panel.getByLabel('Backup password').fill('fictional passphrase 42');
  await panel.getByRole('button', { name: 'Check backup' }).click();
  await expect(panel.locator('table.counts')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Restore now' })).toBeDisabled();
  await panel.getByLabel('Type RESTORE to confirm').fill('RESTORE');
  await panel.getByRole('button', { name: 'Restore now' }).click();
  await expect(panel.getByText('Restore complete.')).toBeVisible();
  await expect(panel).toContainText('recovery-backups');

  const titles = ((await (await request.get('/api/applications')).json()) as { job: { title: string } }[]).map((a) => a.job.title);
  expect(titles).toContain('E2E Kept By Backup');
  expect(titles).not.toContain('E2E Added After Backup');
});

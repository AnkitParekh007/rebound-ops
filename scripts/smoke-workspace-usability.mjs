/** Targeted usability regressions; fictional data, no provider calls. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
export async function smokeWorkspaceUsability(page, origin, { capture = async () => {} } = {}) {
  const goto = async route => { await page.goto(origin + '/#/' + route, { waitUntil: 'networkidle' }); };
  const axe = async label => {
    const results = await new AxeBuilder({ page }).include('#content').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    assert.deepEqual(results.violations.map(v => ({ rule: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })), [], label + ': axe findings in the changed main content');
  };
  await goto('guide');
  await page.getByRole('heading', { name: 'From uncertainty to one useful action', exact: true }).waitFor();
  assert.equal(await page.locator('.rj-guide-card').count(), 6);
  await axe('workspace guide'); await capture('guide');
  const themeBefore = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: 'Theme', exact: true }).click();
  await page.waitForFunction(value => document.documentElement.getAttribute('data-theme') !== value, themeBefore);
  await page.waitForTimeout(250); // Let colour transitions settle before contrast measurement.
  await axe('workspace guide alternate theme'); await capture('guide-alternate-theme');
  await page.getByRole('button', { name: 'Theme', exact: true }).click();
  await page.getByRole('link', { name: 'My next step', exact: true }).filter({ visible: true }).last().focus();
  await page.keyboard.press('Enter'); await page.getByText('Make a step specific to your evidence gap', { exact: true }).waitFor();
  await page.getByText('Make a step specific to your evidence gap', { exact: true }).click();
  const expected = await page.evaluate(() => { const actions = window.ReboundState.session().plan.actions; return (actions.find(a => !a.completed) || actions[0]).id; });
  assert.equal(await page.getByLabel('Step to replace', { exact: true }).inputValue(), expected);
  await page.setViewportSize({ width: 320, height: 800 });
  await goto('guide'); await page.getByRole('heading', { name: 'From uncertainty to one useful action', exact: true }).waitFor();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'guide reflows at 320 CSS pixels');
  await capture('guide-narrow'); await page.setViewportSize({ width: 1440, height: 1000 });
  await goto('evaluate');
  await page.locator('#eval-jd').fill('Fictional platform role: Node.js services and Kubernetes delivery pipelines. Production AWS and Terraform ownership required. No real employer or application.');
  // Explicit manual mode must work even if a provider is configured elsewhere.
  let body;
  page.on('request', request => { if (request.url().endsWith('/api/evaluate')) body = request.postDataJSON(); });
  await page.getByRole('button', { name: 'Prepare an editable prompt — no provider call', exact: true }).click();
  const draft = page.getByRole('textbox', { name: 'Prompt to review before sharing', exact: true }); await draft.waitFor();
  assert.equal(body.mode, 'manual');
  const copy = page.getByRole('button', { name: /Copy prompt/ });
  assert(await copy.isDisabled());
  const approval = page.getByRole('checkbox', { name: /I reviewed this edited prompt and choose to share/ });
  await approval.focus(); await page.keyboard.press('Space'); assert(await copy.isEnabled());
  await draft.fill((await draft.inputValue()).replace(/Fictional/g, 'Synthetic')); assert(await copy.isDisabled()); assert.equal(await approval.isChecked(), false);
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download prompt privately', exact: true }).click();
  const file = await download;
  assert.equal(file.suggestedFilename(), 'reboundops-reviewed-prompt.txt');
  assert.equal(readFileSync(await file.path(), 'utf8'), await draft.inputValue(), 'download includes edits, not the original sources');
  await page.getByText('Bring a web-chat answer back', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Review name', exact: true }).fill('Fictional usability answer');
  const consent = page.getByRole('checkbox', { name: 'I reviewed this answer and want to keep it locally', exact: true }); await consent.check();
  await page.getByLabel('Import an answer from a text file', { exact: true }).setInputFiles({ name: 'fictional-answer.md', mimeType: 'text/markdown', buffer: Buffer.from('MANUAL TEST ANSWER. Production AWS ownership remains unproven. No model was called.') });
  await page.getByText('Imported into this form only. Review the answer and confirm before saving.', { exact: true }).waitFor(); assert.equal(await consent.isChecked(), false);
  await axe('editable prompt and imported answer'); await capture('manual-review');
  await consent.check(); await page.getByRole('button', { name: 'Save reviewed answer locally', exact: true }).click();
  await page.getByRole('link', { name: 'Open saved review', exact: true }).click(); await page.getByText(/MANUAL TEST ANSWER/).waitFor();
  await capture('saved-answer');
  console.log('PASS: guide, keyboard links/approval, 320px reflow, scoped axe, unfinished-task default, editable sharing approval, private download and reviewed file import.');
}

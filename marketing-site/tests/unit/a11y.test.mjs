/**
 * axe-core on every built page in jsdom. jsdom has no layout engine, so colour contrast is checked
 * from the design tokens in contrast.test.mjs instead, and the browser run (tests/e2e) repeats axe
 * with real rendering in CI.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { htmlFiles, dist } from './_lib.mjs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

for (const file of htmlFiles) {
  test(`axe: ${file}`, async () => {
    const dom = new JSDOM(readFileSync(join(dist, file), 'utf8'), { runScripts: 'outside-only', pretendToBeVisual: true });
    dom.window.eval(axeSource);
    const result = await dom.window.axe.run(dom.window.document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    const v = Array.from(result.violations, (x) => `${x.id} (${x.impact}): ${x.nodes.length} × ${x.nodes[0]?.target.join(' ')} — ${x.help}`);
    assert.deepEqual(v, [], `${file}\n${v.join('\n')}`);
    dom.window.close();
  });
}

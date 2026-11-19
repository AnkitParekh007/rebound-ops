#!/usr/bin/env node
/**
 * Lighthouse (mobile and desktop presets) for every page of the built site, served by astro preview.
 * Uses Playwright's bundled Chromium (CHROME_PATH overrides). Lighthouse is fetched with npx at a pinned
 * version so it is not a project dependency. Writes reports/lighthouse/summary.json and .md.
 * Prints the real scores; it never fills in numbers it could not measure.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { startPreview } from './preview-server.mjs';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(site, 'reports/lighthouse');
mkdirSync(out, { recursive: true });
const LH = 'lighthouse@13.6.0';
const PORT = 4329;
const pages = ['/', '/features/', '/how-it-works/', '/preview/', '/download/', '/privacy/', '/docs/', '/faq/', '/changelog/'];
const chrome = process.env.CHROME_PATH || chromium.executablePath();

const server = await startPreview({ cwd: site, port: PORT });

const rows = [];
for (const preset of ['mobile', 'desktop']) {
  for (const p of pages) {
    const file = join(out, `${preset}${p.replace(/\//g, '_') || '_'}.json`);
    const args = ['-y', LH, `http://127.0.0.1:${PORT}${p}`, '--quiet', '--output=json', `--output-path=${file}`,
      '--chrome-flags=--headless=new --no-sandbox', '--only-categories=performance,accessibility,best-practices,seo'];
    if (preset === 'desktop') args.push('--preset=desktop');
    try {
      execFileSync('npx', args, { cwd: site, env: { ...process.env, CHROME_PATH: chrome }, stdio: ['ignore', 'ignore', 'inherit'], timeout: 180_000 });
      const r = JSON.parse(readFileSync(file, 'utf8'));
      const s = (k) => Math.round((r.categories[k]?.score ?? NaN) * 100);
      rows.push({ preset, page: p, performance: s('performance'), accessibility: s('accessibility'), bestPractices: s('best-practices'), seo: s('seo'),
        lcpMs: Math.round(r.audits['largest-contentful-paint']?.numericValue ?? NaN), cls: r.audits['cumulative-layout-shift']?.numericValue, tbtMs: Math.round(r.audits['total-blocking-time']?.numericValue ?? NaN) });
    } catch (e) {
      rows.push({ preset, page: p, error: String(e.message).split('\n')[0] });
    }
    console.log(JSON.stringify(rows.at(-1)));
  }
}
writeFileSync(join(out, 'summary.json'), JSON.stringify({ lighthouse: LH, chrome, at: new Date().toISOString(), rows }, null, 2));
const md = ['| Preset | Page | Perf | A11y | Best pr. | SEO | LCP ms | CLS | TBT ms |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((r) => r.error ? `| ${r.preset} | ${r.page} | error: ${r.error} |||||||` : `| ${r.preset} | ${r.page} | ${r.performance} | ${r.accessibility} | ${r.bestPractices} | ${r.seo} | ${r.lcpMs} | ${r.cls?.toFixed(3)} | ${r.tbtMs} |`)];
writeFileSync(join(out, 'summary.md'), md.join('\n') + '\n');
console.log(md.join('\n'));
server.stop();
process.exit(rows.some((r) => r.error) ? 1 : 0);

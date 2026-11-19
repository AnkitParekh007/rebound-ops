#!/usr/bin/env node
/**
 * Screenshots of this marketing site for visual review: every page at mobile (390) and desktop
 * (1440) widths, light and dark, plus reduced-motion variants of the home page.
 * Writes reports/site-screenshots/*.png (not committed). Run after `npm run build`.
 */
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { startPreview } from './preview-server.mjs';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(site, 'reports/site-screenshots');
mkdirSync(out, { recursive: true });
const PORT = 4331;
const server = await startPreview({ cwd: site, port: PORT });
const pages = ['/', '/features/', '/how-it-works/', '/preview/', '/download/', '/privacy/', '/docs/', '/faq/', '/changelog/', '/404.html'];
const browser = await chromium.launch();
try {
const variants = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];
for (const v of variants) {
  for (const scheme of ['light', 'dark']) {
    for (const reduced of [false, true]) {
      const ctx = await browser.newContext({ viewport: v.viewport, deviceScaleFactor: v.deviceScaleFactor ?? 1, isMobile: v.isMobile, hasTouch: v.hasTouch, colorScheme: scheme, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const page = await ctx.newPage();
      for (const p of reduced ? ['/'] : pages) {
        await page.goto(`http://127.0.0.1:${PORT}${p}`, { waitUntil: 'networkidle' });
        // Reveal everything so full-page shots show the final state.
        await page.evaluate(() => document.querySelectorAll('[data-reveal],[data-step-reveal]').forEach((e) => e.classList.add('is-in')));
        await page.waitForTimeout(reduced ? 200 : 1200);
        const name = `${v.name}-${scheme}${reduced ? '-reduced' : ''}${p === '/' ? '-home' : p.replace(/\/|\.html/g, '-').replace(/-+$/, '')}.png`;
        await page.screenshot({ path: join(out, name), fullPage: true });
        console.log(name);
      }
      await ctx.close();
    }
  }
}
} finally {
  // Stop the preview server explicitly: while it runs, Node cannot exit and the CI step hangs.
  await browser.close();
  server.stop();
}

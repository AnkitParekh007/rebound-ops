#!/usr/bin/env node
/**
 * Screenshots of this marketing site for visual review: every page at mobile (390) and desktop
 * (1440) widths, light and dark, plus reduced-motion variants of the home page.
 * Writes reports/site-screenshots/*.png (not committed). Run after `npm run build`.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(site, 'reports/site-screenshots');
mkdirSync(out, { recursive: true });
const PORT = 4331;
const server = spawn('npx', ['astro', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], { cwd: site, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }, stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 100; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break; } catch { /* starting */ }
  await new Promise((r) => setTimeout(r, 200));
}
const pages = ['/', '/features/', '/how-it-works/', '/preview/', '/download/', '/privacy/', '/docs/', '/faq/', '/changelog/', '/404.html'];
const browser = await chromium.launch();
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
await browser.close();

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/', '/features/', '/how-it-works/', '/preview/', '/download/', '/privacy/', '/docs/', '/faq/', '/changelog/', '/404.html'];

async function noConsoleErrors(page: Page, path: string) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  return errors;
}

for (const path of PAGES) {
  test(`loads without errors: ${path}`, async ({ page }) => {
    expect(await noConsoleErrors(page, path)).toEqual([]);
    await expect(page.locator('h1')).toHaveCount(1);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`axe (WCAG 2.2 AA incl. contrast), ${scheme}: ${path}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    });
  }
}

test('no horizontal overflow from 320 px to 1920 px', async ({ page }) => {
  for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of PAGES) {
      await page.goto(path);
      const { overflow, culprits } = await page.evaluate(() => {
        const root = document.documentElement;
        const limit = root.clientWidth + 0.5;
        // Elements sticking out past the viewport whose overflow no ancestor clips: the deepest
        // ones name the cause when this fails.
        const clipped = (el: Element) => {
          for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
            if (getComputedStyle(a).overflowX !== 'visible') return true;
          }
          return false;
        };
        const out = [...document.body.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > limit && !clipped(el));
        const deepest = out.filter((el) => !out.some((o) => o !== el && el.contains(o)));
        const describe = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${[...el.classList].filter((c) => !c.startsWith('astro-')).map((c) => `.${c}`).join('')} (right ${Math.round(el.getBoundingClientRect().right)})`;
        return { overflow: root.scrollWidth - root.clientWidth, culprits: deepest.slice(0, 5).map(describe) };
      });
      expect(overflow, `${path} at ${width}px; sticking out: ${culprits.join(', ') || 'none found'}`).toBeLessThanOrEqual(0);
    }
  }
});

test('home page layout shift stays below 0.1', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  const cls = await page.evaluate(() => new Promise<number>((resolve) => {
    let total = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) total += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    setTimeout(() => resolve(total), 300);
  }));
  expect(cls).toBeLessThan(0.1);
});

test('theme toggle cycles system → light → dark and persists', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const btn = page.locator('[data-theme-toggle]').first();
  await expect(html).not.toHaveAttribute('data-theme', /./);
  await btn.click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await btn.click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.goto('/features/');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.locator('[data-theme-toggle]').first().click();
  await expect(html).not.toHaveAttribute('data-theme', /./);
});

test('hero: reduced motion means no autoplay and a static, readable stage', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-play]')).toBeHidden();
  const stage = page.locator('.stage');
  await expect(stage).toHaveAttribute('data-scene', 'discover');
  await page.waitForTimeout(5000);
  await expect(stage).toHaveAttribute('data-scene', 'discover');
  await page.getByRole('button', { name: 'Evaluate' }).click();
  await expect(stage).toHaveAttribute('data-scene', 'evaluate');
  await expect(page.locator('[data-caption="evaluate"]')).toBeVisible();
});

test('hero: autoplay advances and can be paused', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the stage starts below the fold on phones, so autoplay waits until it is visible');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const stage = page.locator('.stage');
  await expect(stage).toHaveAttribute('data-scene', 'evaluate', { timeout: 7000 });
  await page.getByRole('button', { name: 'Pause the animation' }).click();
  const scene = await stage.getAttribute('data-scene');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(5000);
  await expect(stage).toHaveAttribute('data-scene', scene!);
});

test('scroll-revealed content is visible with reduced motion and without JavaScript', async ({ browser }) => {
  for (const opts of [{ reducedMotion: 'reduce' as const }, { javaScriptEnabled: false }]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto('/');
    const hidden = await page.locator('[data-reveal]').evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity === '0').length);
    expect(hidden, JSON.stringify(opts)).toBe(0);
    if (opts.javaScriptEnabled === false) await expect(page.locator('[role="tabpanel"]')).toHaveCount(5);
    await ctx.close();
  }
});

test('playground tabs follow the ARIA keyboard pattern', async ({ page }) => {
  await page.goto('/');
  const first = page.getByRole('tab', { name: /Fit score/ });
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Documents/ })).toBeFocused();
  await expect(page.getByRole('tab', { name: /Documents/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#pg-panel-docs')).toBeVisible();
  await expect(page.locator('#pg-panel-fit')).toBeHidden();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: /AI on\/off/ })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(first).toBeFocused();
});

test('fit demo: choosing a job shows its own assessment', async ({ page }) => {
  await page.goto('/features/');
  const demo = page.locator('.fit-demo').first();
  await expect(demo.locator('.result[data-for="northwind"]')).toBeVisible();
  // Click the visible card, as a user does: the transparent radio sits underneath its text.
  await demo.locator('label.job-opt', { hasText: 'Site Reliability Lead' }).click();
  await expect(demo.getByRole('radio', { name: /Site Reliability Lead/ })).toBeChecked();
  await expect(demo.locator('.result[data-for="quarry"]')).toBeVisible();
  await expect(demo.locator('.result[data-for="northwind"]')).toBeHidden();
  await expect(demo.locator('.result[data-for="quarry"]').getByText('Ineligible')).toBeVisible();
});

test('tracker demo: Applied needs explicit confirmation; closed apps reopen', async ({ page }) => {
  await page.goto('/features/');
  const t = page.locator('[data-tracker]').first();
  for (const to of ['Shortlisted', 'Preparing', 'Ready for review']) await t.getByRole('button', { name: `Move to ${to}` }).click();
  const apply = t.getByRole('button', { name: 'Move to Applied' });
  await expect(apply).toBeDisabled();
  await t.getByLabel('I submitted this application on the employer’s site').check();
  await apply.click();
  await expect(t.locator('[data-status]')).toHaveText('Applied');
  await t.getByRole('button', { name: 'Withdraw' }).click();
  await expect(t.locator('[data-status]')).toHaveText('Withdrawn');
  await t.getByRole('button', { name: 'Reopen' }).click();
  await expect(t.locator('[data-status]')).toHaveText('Applied');
});

test('mobile menu opens, traps nothing, and closes with Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/');
  const btn = page.getByRole('button', { name: 'Menu' });
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Docs' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await expect(btn).toBeFocused();
});

test('touch targets in the header and demos are at least 44 px', async ({ page }) => {
  await page.goto('/');
  const small = await page.locator('header a:visible, header button:visible, [role="tab"]:visible, .job-opt:visible, .tracker-demo button:visible').evaluateAll((els) =>
    els.map((e) => ({ t: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30), r: e.getBoundingClientRect() })).filter((x) => x.r.height < 44 && x.r.width > 0).map((x) => `${x.t} ${Math.round(x.r.height)}px`),
  );
  expect(small).toEqual([]);
});

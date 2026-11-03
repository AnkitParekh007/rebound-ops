import { test, expect } from '@playwright/test';

test('production-local static root serves only compiled assets, not repository files', async ({ request }) => {
  const home = await request.get('/');
  expect(home.ok()).toBe(true);
  expect(await home.text()).toContain('ReboundOps');

  for (const file of ['/package-lock.json', '/SECURITY.md', '/apps/api/package.json']) {
    const res = await request.get(file);
    expect(res.status(), file + ' must not be served from the compiled web root').not.toBe(200);
  }
});

test('production-local API denies foreign browser origins', async ({ request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBe(true);

  const crossSite = await request.get('/api/health', {
    headers: { origin: 'https://untrusted.example', 'sec-fetch-site': 'cross-site' }
  });
  expect(crossSite.status()).toBe(403);
  expect((await crossSite.json()).error).toMatch(/^(CROSS_SITE_REJECTED|ORIGIN_REJECTED)$/);
});

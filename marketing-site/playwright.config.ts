import { defineConfig, devices } from '@playwright/test';

/**
 * Browser checks against the built site served by `astro preview`.
 * Run after `npm run build`. CI uses Playwright's bundled Chromium.
 */
const PORT = Number(process.env.PREVIEW_PORT ?? 4321);
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx astro preview --port ${PORT} --host localhost`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    env: { ASTRO_TELEMETRY_DISABLED: '1' },
  },
});

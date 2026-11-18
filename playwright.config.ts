import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Each run uses a fresh, throwaway data directory with fictional data only.
const dataDir = process.env['REBOUND_E2E_DATA_DIR'] ?? mkdtempSync(join(tmpdir(), 'rbo-e2e-'));
const API_PORT = 4185;
const WEB_PORT = 4184;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    channel: process.env['PW_CHANNEL'] ?? 'chrome',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node apps/api/src/main.ts',
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: { REBOUND_DATA_DIR: dataDir, REBOUND_API_PORT: String(API_PORT), REBOUND_WEB_PORT: String(WEB_PORT), REBOUND_LOG_LEVEL: 'error' },
      reuseExistingServer: false,
    },
    {
      command: `npx ng serve --port ${WEB_PORT} --host 127.0.0.1 --proxy-config proxy.e2e.json`,
      cwd: 'apps/web',
      url: `http://127.0.0.1:${WEB_PORT}`,
      env: { NG_CLI_ANALYTICS: 'false' },
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});

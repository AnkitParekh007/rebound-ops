// Starts a second local API for the application-records e2e spec: one
// operations flag on and a fresh, throwaway data folder, removed on exit.
// The default e2e server (port 4174) keeps every flag off.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dataDir = mkdtempSync(join(tmpdir(), 'reboundops-e2e-operations-'));
const child = spawn(process.execPath, ['dist/api/server.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '4175', REBOUNDOPS_FEATURES: 'autofill', REBOUNDOPS_DATA_DIR: dataDir }
});
const cleanUp = () => { try { rmSync(dataDir, { recursive: true, force: true }); } catch { /* best effort */ } };
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => { cleanUp(); process.exit(code ?? 0); });

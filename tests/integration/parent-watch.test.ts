/**
 * The desktop shell's shutdown signal: with REBOUND_PARENT_WATCH=stdin the server closes cleanly
 * (database closed, data-folder lock released, exit code 0) when its stdin closes.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const main = fileURLToPath(new URL('../../apps/api/src/main.ts', import.meta.url));
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => resolve(port));
    });
  });

async function waitForHealth(port: number, timeoutMs = 20_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('server did not become healthy');
}

describe('desktop parent watch', () => {
  it('shuts down cleanly and releases the lock when stdin closes', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'rbo-parent-'));
    dirs.push(dataDir);
    const port = await freePort();
    const child = spawn(process.execPath, [main], {
      env: { ...process.env, REBOUND_PARENT_WATCH: 'stdin', REBOUND_API_PORT: String(port), REBOUND_DATA_DIR: dataDir, REBOUND_WEB_DIST: '' },
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    const exited = new Promise<number | null>((resolve) => child.once('exit', (code) => resolve(code)));
    await waitForHealth(port);
    expect(existsSync(join(dataDir, 'api.lock'))).toBe(true);

    child.stdin.end();
    const code = await Promise.race([exited, new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 10_000))]);
    if (code === 'timeout') child.kill('SIGKILL');
    expect(code).toBe(0);
    expect(existsSync(join(dataDir, 'api.lock'))).toBe(false);
  }, 40_000);

  it('ignores stdin unless the watch is enabled', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'rbo-parent-'));
    dirs.push(dataDir);
    const port = await freePort();
    const child = spawn(process.execPath, [main], {
      env: { ...process.env, REBOUND_PARENT_WATCH: '', REBOUND_API_PORT: String(port), REBOUND_DATA_DIR: dataDir, REBOUND_WEB_DIST: '' },
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    try {
      await waitForHealth(port);
      child.stdin.end();
      await new Promise((r) => setTimeout(r, 1000));
      expect(child.exitCode).toBeNull();
      expect((await fetch(`http://127.0.0.1:${port}/api/health`)).ok).toBe(true);
    } finally {
      const exited = new Promise((r) => child.once('exit', r));
      child.kill('SIGTERM');
      await exited;
    }
  }, 40_000);
});

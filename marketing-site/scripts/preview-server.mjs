/**
 * Starts `astro preview` for the built site as a direct child process and returns a handle to stop it.
 *
 * - Runs Astro's own bin with this Node, not through `npx`, so `stop()` reaches the server process
 *   itself rather than a wrapper that leaves the server orphaned.
 * - Passes `--ignore-lock`, which keeps the server in the foreground (Astro otherwise backgrounds it
 *   when it detects an AI agent) and lets it run alongside another preview server.
 * - Throws if the server is not answering within `timeoutMs`, instead of carrying on against nothing.
 *
 * Callers must call `stop()` when they are done: a live child process keeps Node from exiting.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const astroBin = join(dirname(require.resolve('astro/package.json')), 'bin/astro.mjs');

export async function startPreview({ cwd, port, host = '127.0.0.1', timeoutMs = 30_000 }) {
  const child = spawn(process.execPath, [astroBin, 'preview', '--port', String(port), '--host', host, '--ignore-lock'], {
    cwd,
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  let exited = null;
  child.on('exit', (code, signal) => { exited = { code, signal }; });
  const stop = () => { if (exited === null) child.kill('SIGTERM'); };
  process.once('exit', stop);

  const url = `http://${host}:${port}/`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (exited) throw new Error(`astro preview exited before serving ${url} (code ${exited.code}, signal ${exited.signal})`);
    try {
      if ((await fetch(url)).ok) return { url, stop };
    } catch { /* still starting */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  stop();
  throw new Error(`astro preview did not answer at ${url} within ${timeoutMs} ms`);
}

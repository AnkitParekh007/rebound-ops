#!/usr/bin/env node
/** Extract, verify and start the candidate exactly as a recipient would. */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const output = resolve('dist/preview');
const archives = readdirSync(output).filter(s => /^reboundops-v0\.2\.0-rc1-[a-f0-9]{12}\.tar\.gz$/.test(s));
if (archives.length !== 1) throw new Error('Expected exactly one preview archive.');
const name = archives[0];
const archive = join(output, name);
const recorded = readFileSync(archive + '.sha256', 'utf8').split(/\s+/)[0];
const actual = createHash('sha256').update(readFileSync(archive)).digest('hex');
if (recorded !== actual) throw new Error('Preview archive checksum mismatch.');
const temp = mkdtempSync(join(tmpdir(), 'reboundops-preview-smoke-'));
let child;
try {
  execFileSync('tar', ['-xzf', archive, '-C', temp]);
  const folder = join(temp, name.slice(0, -7));
  const verify = spawnSync(process.execPath, ['scripts/verify-preview.mjs'],
    { cwd: folder, stdio: 'inherit' });
  if (verify.status !== 0) throw new Error('Manifest verification failed.');

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const install = spawnSync(npmCommand,
    ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'],
    { cwd: folder, stdio: 'inherit', timeout: 180_000 });
  if (install.status !== 0) throw new Error('Clean production-only npm ci failed.');

  const port = await new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const chosen = server.address().port;
      server.close(() => resolvePort(chosen));
    });
  });
  const env = { ...process.env, PORT: String(port) };
  delete env.REBOUNDOPS_AI_ENABLED;
  delete env.ANTHROPIC_API_KEY;
  delete env.REBOUNDOPS_DATA_DIR;
  child = spawn(process.execPath, ['dist/api/server.js'], {
    cwd: folder, env, stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk.toString().slice(0, 400); });
  const host = 'http://127.0.0.1:' + port;
  let alive = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) throw new Error('Server quit: ' + stderr.slice(0, 300));
    try {
      const status = await fetch(host + '/api/health', { signal: AbortSignal.timeout(1_000) });
      if (status.ok) {
        const result = await status.json();
        if (result.status !== 'ok' || result.aiEnabled || result.persistence !== 'memory') {
          throw new Error('Preview did not start with privacy defaults.');
        }
        alive = true; break;
      }
    } catch { /* server still starting */ }
    await delay(250);
  }
  if (!alive) throw new Error('Extracted preview API failed to start.');
  const page = await fetch(host + '/', { signal: AbortSignal.timeout(3_000) });
  if (!page.ok || !(await page.text()).includes('ReboundOps')) {
    throw new Error('Compiled Angular site not served from extracted archive.');
  }
  const ai = await fetch(host + '/api/ai/status');
  if ((await ai.json()).enabled) throw new Error('Preview unexpectedly enabled paid AI.');
  console.log('Extracted candidate smoke test passed: compiled site, localhost API, disabled AI, memory-only storage.');
} finally {
  if (child && child.exitCode === null) {
    child.kill();
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(1_000)]);
  }
  rmSync(temp, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
}

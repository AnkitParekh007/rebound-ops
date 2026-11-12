#!/usr/bin/env node
/** Extract, verify and start the candidate exactly as a recipient would. */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { httpGet } from './smoke-http.mjs';

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
  // The attested sidecar SBOM must be byte-identical to the one inside the archive.
  const inside = readFileSync(join(folder, 'sbom.cdx.json'));
  const sidecar = readFileSync(join(output, name.replace(/\.tar\.gz$/, '.cdx.json')));
  if (!inside.equals(sidecar)) throw new Error('Sidecar SBOM differs from the archived SBOM.');
  const bom = JSON.parse(inside.toString('utf8'));
  if (bom.bomFormat !== 'CycloneDX' || !bom.components?.length) throw new Error('Archived SBOM is malformed.');

  const npmCli = process.env.npm_execpath;
  const npmCommand = npmCli ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const installArgs = [
    ...(npmCli ? [npmCli] : []), 'ci', '--omit=dev', '--ignore-scripts',
    '--no-audit', '--no-fund'
  ];
  const install = spawnSync(npmCommand, installArgs,
    { cwd: folder, stdio: 'inherit', timeout: 240_000, shell: !npmCli && process.platform === 'win32' });
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
  let health = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) throw new Error('Server quit: ' + stderr.slice(0, 300));
    try {
      const status = await httpGet(host + '/api/health', { timeoutMs: 1_000 });
      if (status.ok) { health = status.json(); break; }
    } catch { /* server still starting */ }
    await delay(250);
  }
  if (!health) throw new Error('Extracted preview API failed to start.');
  // Checked outside the polling try/catch, so a wrong default fails the smoke
  // test instead of being retried as "still starting".
  if (health.status !== 'ok' || health.aiEnabled || health.persistence !== 'memory') {
    throw new Error('Preview did not start with privacy defaults.');
  }
  const page = await httpGet(host + '/', { timeoutMs: 3_000 });
  if (!page.ok || !page.body.includes('ReboundOps')) {
    throw new Error('Compiled Angular site not served from extracted archive.');
  }
  const ai = await httpGet(host + '/api/ai/status');
  if (ai.json().enabled) throw new Error('Preview unexpectedly enabled paid AI.');
  console.log('Extracted candidate smoke test passed: compiled site, localhost API, disabled AI, memory-only storage.');
} finally {
  if (child && child.exitCode === null) {
    child.kill();
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(1_000)]);
  }
  rmSync(temp, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
}

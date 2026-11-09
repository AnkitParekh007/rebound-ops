import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function command(program, args, cwd, quiet = false) {
  const result = spawnSync(program, args, { cwd, stdio: quiet ? 'pipe' : 'inherit', timeout: 300_000 });
  return result.status === 0 && !result.error;
}

/** Locks and a dependency check also recover interrupted or outdated installs. */
export function prepareDependencies(directory, { run = command } = {}) {
  const manifest = join(directory, 'package.json');
  const lock = join(directory, 'package-lock.json');
  if (!existsSync(manifest) || !existsSync(lock)) {
    throw new Error(`Missing package.json or package-lock.json in ${directory}. Restore a complete checkout before starting.`);
  }
  const fingerprint = createHash('sha256').update(readFileSync(manifest)).update(readFileSync(lock))
    .update(`${process.platform}/${process.arch}/${process.versions.node.split('.')[0]}`).digest('hex');
  const stamp = join(directory, 'node_modules', '.reboundops-runtime');
  const current = existsSync(stamp) && readFileSync(stamp, 'utf8') === fingerprint;
  if (current && run('npm', ['ls', '--depth=0', '--json'], directory, true)) return;
  console.log(`→ Installing locked dependencies: ${directory}`);
  // Browser setup is explicit below, including verification; do not rely on an
  // engine postinstall that can swallow a failed browser download.
  const args = ['ci', '--no-audit', '--no-fund'];
  if (['rebound-ops-engine', '@reboundops/rebound-ops-ui'].includes(JSON.parse(readFileSync(manifest, 'utf8')).name)) args.push('--ignore-scripts');
  if (!run('npm', args, directory)) throw new Error(`Dependency installation failed in ${directory}. Fix the npm error and rerun the launcher.`);
  if (!run('npm', ['ls', '--depth=0', '--json'], directory, true)) throw new Error(`Incomplete dependencies in ${directory}. Run npm ci there, then retry.`);
  writeFileSync(stamp, fingerprint);
}

export async function prepareBrowser(engineRoot, { run = command, load, env = process.env } = {}) {
  const require = createRequire(join(engineRoot, 'package.json'));
  const chromium = load ? await load() : require('playwright').chromium;
  const executablePath = env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  if (executablePath && !existsSync(executablePath)) throw new Error('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH does not point to an existing browser.');
  if (!executablePath && !existsSync(chromium.executablePath())) {
    console.log('→ Installing Chromium for local PDF export…');
    if (!run(process.execPath, [join(dirname(require.resolve('playwright')), 'cli.js'), 'install', 'chromium'], engineRoot)) {
      throw new Error('Chromium installation failed. From engine/, run npx playwright install chromium, then rerun the launcher.');
    }
  }
  let browser;
  try {
    browser = await chromium.launch({ headless: true, timeout: 15_000, ...(executablePath ? { executablePath } : {}) });
  } catch {
    throw new Error('Chromium could not start. From engine/, run npx playwright install --with-deps chromium (Linux), or configure PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to a supported Chrome. Then rerun the launcher.');
  } finally { await browser?.close(); }
  console.log('→ Runtime ready: recovery, workspace, engine and PDF browser verified.');
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const engineRoot = resolve(process.env.REBOUND_OPS_ROOT || join(root, 'engine'));
  for (const directory of [root, join(root, 'workspace'), engineRoot]) prepareDependencies(directory);
  await prepareBrowser(engineRoot);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Startup stopped: ${error.message}`); process.exitCode = 1; });
}

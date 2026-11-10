import { spawn, spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { createServer } from 'node:net';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { npmCommand } from './npm-command.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const workspace = join(root, 'workspace');
const api = join(root, 'apps', 'api');
const host = '127.0.0.1';
const keys = [
  'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY',
  'OPENROUTER_API_KEY', 'QWEN_API_KEY', 'GITHUB_MODELS_API_KEY'
];

function withoutProviderKeys(env) {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !keys.includes(key.toUpperCase())));
}

export function launcherEnvironments(base, args) {
  let ai = base.REBOUNDOPS_AI_ENABLED || 'false';
  for (const arg of args) {
    if (arg === '--ai') ai = 'true';
    else if (arg === '--no-ai') ai = 'false';
    else throw new Error('Unknown option: ' + arg);
  }
  if (!['true', 'false'].includes(ai)) throw new Error('REBOUNDOPS_AI_ENABLED must be true or false.');
  if (ai === 'true' && !base.ANTHROPIC_API_KEY) {
    throw new Error('AI opt-in needs ANTHROPIC_API_KEY in this terminal. See https://rebound-ops.org/docs/ai/');
  }
  const clean = withoutProviderKeys({ ...base, REBOUNDOPS_AI_ENABLED: ai });
  const recovery = { ...clean };
  if (ai === 'true') recovery.ANTHROPIC_API_KEY = base.ANTHROPIC_API_KEY;
  return { clean, recovery };
}

function port(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1024 || number > 65535) {
    throw new Error(label + ' must be an integer between 1024 and 65535.');
  }
  return number;
}

async function checkPort(number) {
  const probe = createServer();
  await new Promise((ready, reject) => {
    probe.once('error', reject);
    probe.listen(number, host, () => probe.close(ready));
  }).catch(error => {
    if (error.code === 'EADDRINUSE') {
      throw new Error(`Port ${number} is already in use. Stop the existing local service or choose another port.`);
    }
    throw error;
  });
}

const children = new Set();
const stopping = new AbortController();
let signalCode;

function startChild(program, args, cwd, env, group = false) {
  const detached = group && process.platform !== 'win32';
  const child = spawn(program, args, { cwd, env, stdio: 'inherit', detached });
  const entry = { child, detached };
  const done = new Promise(resolveExit => {
    child.once('error', error => resolveExit({ error }));
    child.once('close', (code, signal) => resolveExit({ code, signal }));
  });
  children.add(entry);
  void done.then(() => children.delete(entry));
  return { done };
}

function stopChild({ child, detached }, signal) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    // Kill only this owned child's tree. Killing npm alone can leave an
    // installer/compiler holding files open and prevent stop/restart.
    const taskkill = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe');
    const result = spawnSync(taskkill, ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', timeout: 3000 });
    if (result.error || result.status !== 0) child.kill(signal);
    return;
  }
  if (!detached) { child.kill(signal); return; }
  try { process.kill(-child.pid, signal); }
  catch (error) { if (error.code !== 'ESRCH') throw error; }
}

function stopServices() {
  for (const entry of children) stopChild(entry, 'SIGTERM');
  if (!children.size) return;
  const deadline = setTimeout(() => {
    for (const entry of children) stopChild(entry, 'SIGKILL');
  }, 4000);
  deadline.unref();
}

async function runStep(label, program, args, env) {
  const result = await startChild(program, args, root, env, true).done;
  stopping.signal.throwIfAborted();
  if (result.code !== 0) throw new Error(`${label} failed${result.error ? ': ' + result.error.message : '. See the output above.'}`);
}

async function waitForService(service, url, name) {
  const health = async () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      stopping.signal.throwIfAborted();
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(500) });
        await response.body?.cancel();
        if (response.ok) return;
      } catch { /* The service may still be starting. */ }
      await delay(200, undefined, { signal: stopping.signal });
    }
    throw new Error(name + ' did not become ready. See the output above.');
  };
  await Promise.race([health(), service.done.then(() => { throw new Error(name + ' exited before readiness.'); })]);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: npm start [-- --ai | --no-ai] or npm run doctor');
    return;
  }
  const doctor = args[0] === '--doctor';
  const { clean, recovery } = launcherEnvironments(process.env, doctor ? ['--no-ai', ...args.slice(1)] : args);
  const version = process.versions.node.split('.').map(Number);
  const [major, minor, patch] = version;
  if (!(major >= 26 || (major === 24 && minor >= 15) || (major === 22 && (minor > 22 || (minor === 22 && patch >= 3))))) {
    throw new Error('Install Node.js 24.15+ (24.x), 22.22.3+ (22.x), or 26+.');
  }
  const invocation = npmCommand(clean);
  const npm = invocation.program, npmArgs = invocation.prefix;
  if (spawnSync(npm, [...npmArgs, '--version'], { env: invocation.env, stdio: 'ignore' }).status !== 0) {
    throw new Error('npm is unavailable. Install a supported Node.js distribution with npm, then retry.');
  }

  const engine = resolve(clean.REBOUND_OPS_ROOT || join(root, 'engine'));
  for (const directory of [root, workspace, engine]) {
    if (!existsSync(join(directory, 'package-lock.json'))) throw new Error('Missing package-lock.json in ' + directory);
  }
  const uiPort = port(clean.PORT || 4317, 'PORT');
  const apiPort = port(clean.REBOUNDOPS_API_PORT || 4174, 'REBOUNDOPS_API_PORT');
  if (uiPort === apiPort) throw new Error('Workspace and recovery API ports must differ.');
  await Promise.all([checkPort(uiPort), checkPort(apiPort)]);
  stopping.signal.throwIfAborted();
  console.log(`Preflight passed: Node ${process.versions.node}, npm, lockfiles, and ports ${uiPort}/${apiPort}.`);
  if (doctor) return;

  const env = {
    ...invocation.env, REBOUND_OPS_ROOT: engine, REBOUNDOPS_API_PORT: String(apiPort),
    REBOUNDOPS_DATA_DIR: clean.REBOUNDOPS_DATA_DIR || join(clean.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'reboundops', 'sessions')
  };
  await runStep('Runtime setup', process.execPath, ['scripts/prepare-local-runtime.mjs'], env);
  await runStep('Application build', npm, [...npmArgs, 'run', 'build'], env);
  const apiService = startChild(process.execPath, [join(root, 'dist', 'api', 'server.js')], api, {
    ...env, ...(recovery.ANTHROPIC_API_KEY ? { ANTHROPIC_API_KEY: recovery.ANTHROPIC_API_KEY } : {}), PORT: String(apiPort)
  });
  await waitForService(apiService, `http://${host}:${apiPort}/api/health`, 'Recovery API');
  const ui = startChild(process.execPath, ['server/index.mjs'], workspace, { ...env, HOST: host, PORT: String(uiPort) });
  const address = `http://${host}:${uiPort}`;
  await waitForService(ui, address + '/api/rebound/health', 'Workspace');
  console.log(`ReboundOps is running — open ${address}/#/guide. Press Ctrl+C to stop.`);
  const service = await Promise.race([apiService.done.then(() => 'Recovery API'), ui.done.then(() => 'Workspace')]);
  if (!stopping.signal.aborted) throw new Error(service + ' stopped unexpectedly.');
}

if (process.argv[1] && existsSync(process.argv[1]) &&
    realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  if (process.connected) process.on('disconnect', () => {
    stopping.abort();
    stopServices();
  });
  for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
    process.on(signal, () => {
      if (stopping.signal.aborted) return;
      signalCode = code;
      stopping.abort();
      stopServices();
    });
  }
  try { await main(); }
  catch (error) {
    if (!stopping.signal.aborted) {
      console.error('Startup stopped: ' + error.message);
      process.exitCode = 1;
    }
  } finally {
    stopping.abort();
    stopServices();
    if (process.connected) process.disconnect();
    if (signalCode) process.exitCode = signalCode;
  }
}

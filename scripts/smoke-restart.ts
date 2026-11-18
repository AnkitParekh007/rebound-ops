/**
 * M1 smoke test: start the real API process, write onboarding/profile/job/status,
 * stop it, start it again on the same data directory, and confirm everything survived.
 * Uses fictional data only and a throwaway data directory.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dataDir = mkdtempSync(join(tmpdir(), 'rbo-smoke-'));

function start(): Promise<{ proc: ChildProcess; base: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['apps/api/src/main.ts'], {
      cwd: root,
      env: { ...process.env, REBOUND_DATA_DIR: dataDir, REBOUND_API_PORT: '0', REBOUND_LOG_LEVEL: 'error' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    const timer = setTimeout(() => reject(new Error(`API did not start:\n${out}`)), 15_000);
    const onData = (chunk: Buffer) => {
      out += chunk.toString();
      const m = /listening on (http:\/\/[^\s]+)/.exec(out);
      if (m?.[1]) {
        clearTimeout(timer);
        resolve({ proc, base: m[1] });
      }
    };
    proc.stdout!.on('data', onData);
    proc.stderr!.on('data', (c: Buffer) => (out += c.toString()));
    proc.on('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0 && code !== null) reject(new Error(`API exited with ${code}:\n${out}`));
    });
  });
}

const stop = (proc: ChildProcess) =>
  new Promise<void>((resolve) => {
    proc.on('exit', () => resolve());
    proc.kill('SIGTERM');
  });

async function call<T = Record<string, unknown>>(base: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? null : JSON.stringify(body),
  });
  const json = (await res.json()) as T;
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${message}`);
}

let proc: ChildProcess | undefined;
try {
  let api = await start();
  proc = api.proc;
  await call(api.base, 'PUT', '/api/onboarding', { status: 'skipped', aiMode: 'off', goals: { targetRoles: ['Logistics Coordinator'] } });
  await call(api.base, 'PUT', '/api/profile', { displayName: 'Sam Fictional', preferredCountries: ['Ireland'], workArrangements: ['hybrid'] });
  const created = await call<{ application: { id: string } }>(api.base, 'POST', '/api/jobs', {
    title: 'Logistics Coordinator',
    employer: 'Harbourline Freight (fictional)',
    description: 'Logistics Coordinator at Harbourline Freight (fictional)',
    sourceUrl: 'https://careers.example.test/harbourline/42',
    provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null },
  });
  await call(api.base, 'POST', `/api/applications/${created.application.id}/transitions`, { to: 'shortlisted' });
  await stop(proc);
  proc = undefined;

  api = await start();
  proc = api.proc;
  const onboarding = await call<{ status: string; goals: { targetRoles: string[] } }>(api.base, 'GET', '/api/onboarding');
  const profile = await call<{ displayName: string }>(api.base, 'GET', '/api/profile');
  const apps = await call<{ status: string; activity: unknown[]; job: { verification: { status: string } } }[]>(api.base, 'GET', '/api/applications');
  const dash = await call<{ total: number; byStatus: Record<string, number> }>(api.base, 'GET', '/api/dashboard');

  assert(onboarding.status === 'skipped', 'onboarding status persisted');
  assert(onboarding.goals.targetRoles[0] === 'Logistics Coordinator', 'goals persisted');
  assert(profile.displayName === 'Sam Fictional', 'profile persisted');
  assert(apps.length === 1 && apps[0]!.status === 'shortlisted', 'application status persisted');
  assert(apps[0]!.activity.length === 2, 'activity trail persisted');
  assert(apps[0]!.job.verification.status === 'unverified', 'job remains unverified');
  assert(dash.total === 1 && dash.byStatus['shortlisted'] === 1, 'dashboard derived from stored data');
  console.log('smoke-restart: PASS — data survived an API restart');
} catch (err) {
  console.error('smoke-restart: FAIL —', (err as Error).message);
  process.exitCode = 1;
} finally {
  if (proc) await stop(proc);
  rmSync(dataDir, { recursive: true, force: true });
}

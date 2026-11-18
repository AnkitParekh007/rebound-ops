/**
 * Release verification (run after npm run package:release). Uses throwaway
 * folders and fictional data only; publishes nothing.
 *
 *   1. checksums in release/SHA256SUMS match;
 *   2. fresh install: unpack, `npm ci --omit=dev --omit=optional --ignore-scripts`, start,
 *      check the web app, health, a PDF resume import, and clean shutdown;
 *   3. upgrade from v0.1.0: run the real v0.1.0 (from its git tag) on a data folder,
 *      create records and a backup, then start this release on the same folder and
 *      check the records survived; restore the v0.1.0 backup with this release's CLI.
 *
 *   npm run verify:release [-- --skip-upgrade]
 */
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const rel = join(root, 'release');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
const name = `reboundops-${pkg.version}`;
const skipUpgrade = process.argv.includes('--skip-upgrade');
const results: string[] = [];
const failures: string[] = [];
const check = (ok: boolean, what: string) => (ok ? results.push(`ok   ${what}`) : failures.push(what));
const work = mkdtempSync(join(tmpdir(), 'rbo-verify-'));
const sh = (cmd: string, args: string[], cwd: string) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NG_CLI_ANALYTICS: 'false', npm_config_fund: 'false', npm_config_audit: 'false' } });

function start(dir: string, dataDir: string): Promise<{ proc: ChildProcess; base: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['apps/api/src/main.ts'], { cwd: dir, env: { ...process.env, REBOUND_DATA_DIR: dataDir, REBOUND_API_PORT: '0', REBOUND_LOG_LEVEL: 'error' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const timer = setTimeout(() => reject(new Error(`did not start: ${out}`)), 20_000);
    const on = (c: Buffer) => {
      out += c.toString();
      const m = /listening on (http:\/\/[^\s]+)/.exec(out);
      if (m?.[1]) {
        clearTimeout(timer);
        resolve({ proc, base: m[1] });
      }
    };
    proc.stdout?.on('data', on);
    proc.stderr?.on('data', on);
    proc.on('exit', (code) => reject(new Error(`exited ${code}: ${out}`)));
  });
}
const stop = (p: ChildProcess) => new Promise<number | null>((r) => (p.exitCode !== null ? r(p.exitCode) : (p.once('exit', (c) => r(c)), p.kill('SIGTERM'))));
const api = async (base: string, method: string, path: string, body?: unknown) => {
  const res = await fetch(base + path, { method, headers: body === undefined ? {} : { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const type = res.headers.get('content-type') ?? '';
  return { status: res.status, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) } as { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/** A tiny one-page selectable-text PDF (fictional content). */
function samplePdf(): Buffer {
  const content = 'BT /F1 12 Tf 72 760 Td (Jordan Fictional) Tj 0 -20 Td (Experience) Tj 0 -16 Td (Platform Engineer at Lumenfield Systems, Mar 2022 - Present) Tj 0 -16 Td (Skills) Tj 0 -16 Td (TypeScript, PostgreSQL, Kubernetes) Tj ET';
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let out = '%PDF-1.4\n';
  const offs: number[] = [];
  objs.forEach((o, i) => {
    offs.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

try {
  /* 1. checksums */
  const sums = readFileSync(join(rel, 'SHA256SUMS'), 'utf8').trim().split('\n');
  for (const line of sums) {
    const [hash, file] = line.split(/\s+/);
    check(createHash('sha256').update(readFileSync(join(rel, file!))).digest('hex') === hash, `checksum ${file}`);
  }

  /* 2. fresh install */
  sh('tar', ['-xzf', join(rel, `${name}.tar.gz`), '-C', work], root);
  const app = join(work, name);
  check(existsSync(join(app, 'apps/web/dist/browser/index.html')) && !existsSync(join(app, 'tests')) && !existsSync(join(app, 'CLAUDE.md')), 'archive layout (prebuilt web app, no tests, no local files)');
  const t0 = Date.now();
  sh('npm', ['ci', '--omit=dev', '--omit=optional', '--ignore-scripts', '--prefer-offline', '--no-fund', '--no-audit'], app);
  results.push(`info fresh production install took ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  check(!existsSync(join(app, 'node_modules/@angular/core')) && !existsSync(join(app, 'node_modules/vitest')), 'production install excludes build and test tooling');
  const data = join(work, 'data-fresh');
  const a = await start(app, data);
  const home = await fetch(`${a.base}/`);
  check(home.status === 200 && (await home.text()).includes('<app-root'), 'fresh install serves the web app');
  const health = await api(a.base, 'GET', '/api/health');
  check(health.status === 200 && health.body.schemaVersion === 4, 'fresh install health (schema 4)');
  const pdf = await api(a.base, 'POST', '/api/resume/import', { filename: 'cv.pdf', contentBase64: samplePdf().toString('base64') });
  check(pdf.status === 200 && pdf.body.extraction?.method === 'pdf_text' && JSON.stringify(pdf.body.proposal).includes('Lumenfield'), 'PDF resume import works in a production install (without optional canvas)');
  check((await stop(a.proc)) === 0, 'clean shutdown');

  /* 3. upgrade from v0.1.0 */
  if (!skipUpgrade) {
    const old = join(work, 'v0.1.0');
    // The real v0.1.0, from its tag (needs the tag locally; CI fetches tags).
    mkdirSync(old);
    writeFileSync(join(work, 'v0.1.0.tar'), execFileSync('git', ['archive', '--format=tar', 'v0.1.0'], { cwd: root, maxBuffer: 256 * 1024 * 1024 }));
    sh('tar', ['-xf', join(work, 'v0.1.0.tar'), '-C', old], root);
    sh('npm', ['ci', '--omit=dev', '--ignore-scripts', '--prefer-offline', '--no-fund', '--no-audit'], old);
    const shared = join(work, 'data-upgrade');
    const v1 = await start(old, shared);
    await api(v1.base, 'PUT', '/api/onboarding', { status: 'completed', aiMode: 'off' });
    await api(v1.base, 'PUT', '/api/profile', { displayName: 'Jordan Fictional', skills: ['TypeScript'], targetRoles: ['Platform Engineer'] });
    const job = await api(v1.base, 'POST', '/api/jobs', { title: 'Platform Engineer', employer: 'Fictional Co', description: 'Upgrade check', sourceUrl: null, workArrangement: null, provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null } });
    const appId = job.body.application.id as string;
    const applied = await api(v1.base, 'POST', `/api/applications/${appId}/transitions`, { to: 'applied', confirmSubmitted: true });
    await api(v1.base, 'POST', `/api/applications/${appId}/contacts`, { name: 'Sam Example', role: 'Recruiter', email: 'sam@example.test', phone: '', notes: '' });
    const backup = await api(v1.base, 'GET', '/api/backup');
    const backupFile = join(work, 'v010-backup.sqlite');
    writeFileSync(backupFile, backup.body as Buffer);
    check((await api(v1.base, 'GET', '/api/health')).body.schemaVersion === 3, 'v0.1.0 ran on schema 3');
    await stop(v1.proc);

    const v2 = await start(app, shared);
    const view = await api(v2.base, 'GET', `/api/applications/${appId}`);
    check(view.status === 200 && view.body.status === 'applied' && view.body.appliedConfirmedAt === applied.body.appliedConfirmedAt, 'upgrade keeps applications and the original submission date');
    check((await api(v2.base, 'GET', `/api/applications/${appId}/contacts`)).body[0]?.name === 'Sam Example', 'upgrade keeps contacts');
    check((await api(v2.base, 'GET', `/api/applications/${appId}/reminders`)).body[0]?.priority === 'normal', 'upgrade keeps reminders (new fields defaulted)');
    check((await api(v2.base, 'GET', '/api/profile')).body.displayName === 'Jordan Fictional', 'upgrade keeps the profile');
    check((await api(v2.base, 'GET', '/api/health')).body.schemaVersion === 4, 'upgrade migrated to schema 4');
    await stop(v2.proc);

    const restored = join(work, 'data-restored');
    const out = sh('node', ['scripts/restore-backup.ts', backupFile, '--data-dir', restored, '--yes'], app);
    check(/Restored into/.test(out), 'this release restores a v0.1.0 backup with its CLI');
    const v3 = await start(app, restored);
    check((await api(v3.base, 'GET', '/api/applications')).body.length === 1, 'restored v0.1.0 backup opens in this release');
    await stop(v3.proc);
  } else {
    results.push('skip upgrade from v0.1.0 (--skip-upgrade)');
  }
} catch (err) {
  failures.push(`verification stopped: ${(err as Error).message.split('\n').slice(0, 4).join(' ')}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

for (const r of results) console.log(r);
if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  process.exit(1);
}
console.log(`verify:release PASS (${name})`);

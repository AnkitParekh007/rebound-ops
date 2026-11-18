/**
 * Packaged-serving smoke test. Requires `npm run build` first (CI runs it before this).
 *
 * Starts the real API process serving the production web build from
 * apps/web/dist/browser (or REBOUND_WEB_DIST), then checks that:
 *   - the built index.html is served at / and for a client-side route (SPA fallback);
 *   - a hashed JS asset is served with a JavaScript content type;
 *   - security headers (CSP, no-sniff, frame denial) are present;
 *   - /api/health answers;
 *   - a second process on the same data directory is refused by the lock.
 * Fictional, throwaway data directory only.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const webDist = resolve(process.env['REBOUND_WEB_DIST'] ?? join(root, 'apps/web/dist/browser'));
if (!existsSync(join(webDist, 'index.html'))) {
  console.error(`smoke:packaged FAIL: no production build at ${webDist}. Run npm run build first.`);
  process.exit(1);
}
const dataDir = mkdtempSync(join(tmpdir(), 'rbo-packaged-'));
const failures: string[] = [];
const check = (ok: boolean, what: string) => {
  if (!ok) failures.push(what);
};

function start(): Promise<{ proc: ChildProcess; base: string | null; output: string; code: number | null }> {
  return new Promise((done) => {
    const proc = spawn(process.execPath, [join(root, 'apps/api/src/main.ts')], {
      cwd: root,
      env: { ...process.env, REBOUND_DATA_DIR: dataDir, REBOUND_API_PORT: '0', REBOUND_LOG_LEVEL: 'error', REBOUND_WEB_DIST: webDist },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const timer = setTimeout(() => done({ proc, base: null, output, code: null }), 15_000);
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      const m = /listening on (http:\/\/[^\s]+)/.exec(output);
      if (m?.[1]) {
        clearTimeout(timer);
        done({ proc, base: m[1], output, code: null });
      }
    };
    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);
    proc.on('exit', (code) => {
      clearTimeout(timer);
      done({ proc, base: null, output, code });
    });
  });
}

const stop = (p: ChildProcess) => new Promise<void>((r) => (p.exitCode !== null ? r() : (p.once('exit', () => r()), p.kill('SIGTERM'))));

let first: ChildProcess | undefined;
try {
  const a = await start();
  first = a.proc;
  if (!a.base) throw new Error(`API did not start:\n${a.output}`);

  const home = await fetch(`${a.base}/`);
  const html = await home.text();
  check(home.status === 200 && html.includes('<app-root'), 'index.html served at /');
  const csp = home.headers.get('content-security-policy') ?? '';
  check(/default-src 'self'/.test(csp) && /script-src 'self'/.test(csp), 'CSP header on the app shell');
  check(home.headers.get('x-content-type-options') === 'nosniff', 'nosniff header');
  check(/deny|'none'/i.test(`${home.headers.get('x-frame-options') ?? ''} ${csp}`), 'framing denied');

  const deep = await fetch(`${a.base}/tracker`);
  check(deep.status === 200 && (await deep.text()).includes('<app-root'), 'SPA fallback for client routes');

  const js = readdirSync(webDist).find((f) => /^main-.*\.js$/.test(f) || /^main\.js$/.test(f));
  check(Boolean(js), 'main bundle exists in the build');
  if (js) {
    const asset = await fetch(`${a.base}/${js}`);
    check(asset.status === 200 && /javascript/.test(asset.headers.get('content-type') ?? ''), 'JS asset served with a JavaScript content type');
  }
  const health = await fetch(`${a.base}/api/health`);
  check(health.status === 200 && (await health.json() as { status?: string }).status === 'ok', '/api/health ok');

  // A second process against the same data directory must refuse to start.
  const b = await start();
  check(b.base === null && b.code === 1 && /is using/.test(b.output), 'second process refused by the data-directory lock');
  if (b.base) await stop(b.proc);
} catch (err) {
  failures.push((err as Error).message);
} finally {
  if (first) await stop(first);
  rmSync(dataDir, { recursive: true, force: true });
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL: ${f}`);
  process.exit(1);
}
console.log('smoke:packaged PASS (production build served, headers present, lock enforced)');

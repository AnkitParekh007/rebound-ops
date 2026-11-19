/**
 * Runs the staged desktop server (see build-desktop-server.ts) the way the desktop shell does and
 * checks it end to end. Fictional data only; uses a temporary data folder.
 *
 *   node scripts/smoke-desktop-server.ts [--stage <dir>] [--node <path to node binary>]
 *
 * Checks: health, the web app is served, a same-origin POST is accepted, a PDF resume imports
 * (pdf.js outside the bundle), and closing stdin shuts the server down with exit 0 and no lock left.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPdf, type Block } from '../packages/documents/src/index.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const stage = resolve(root, opt('--stage') ?? 'apps/desktop/stage');
const node = opt('--node') ?? process.execPath;
const fail = (m: string): never => {
  console.error(`smoke-desktop-server FAIL: ${m}`);
  process.exit(1);
};
const ok = (m: string) => console.log(`  ok  ${m}`);

if (!existsSync(join(stage, 'server/main.mjs'))) fail(`no staged server in ${stage}; run scripts/build-desktop-server.ts first.`);

const port = await new Promise<number>((res, rej) => {
  const s = createServer();
  s.once('error', rej);
  s.listen(0, '127.0.0.1', () => {
    const p = (s.address() as { port: number }).port;
    s.close(() => res(p));
  });
});
const dataDir = mkdtempSync(join(tmpdir(), 'rbo-desktop-smoke-'));
const origin = `http://127.0.0.1:${port}`;
const child = spawn(node, [join(stage, 'server/main.mjs')], {
  cwd: join(stage, 'server'),
  env: { ...process.env, REBOUND_PARENT_WATCH: 'stdin', REBOUND_API_PORT: String(port), REBOUND_DATA_DIR: dataDir, REBOUND_WEB_DIST: join(stage, 'web') },
  stdio: ['pipe', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.on('data', (d) => (stderr += String(d)));
const exited = new Promise<number | null>((r) => child.once('exit', (code) => r(code)));

try {
  console.log(`Desktop server smoke (node ${node === process.execPath ? process.version : node}) on ${origin}`);
  const end = Date.now() + 20_000;
  for (;;) {
    try {
      if ((await fetch(`${origin}/api/health`)).ok) break;
    } catch {
      /* starting */
    }
    if (child.exitCode !== null) fail(`server exited early (${child.exitCode}): ${stderr.trim()}`);
    if (Date.now() > end) fail(`no health response within 20 s: ${stderr.trim()}`);
    await new Promise((r) => setTimeout(r, 150));
  }
  ok('health');

  const home = await fetch(`${origin}/`);
  const html = await home.text();
  if (!home.ok || !/<app-root|<base href/i.test(html)) fail(`web app not served (status ${home.status})`);
  ok('web app served from the stage');

  const text = readFileSync(join(root, 'tests/fixtures/resumes/jordan-fictional.txt'), 'utf8');
  const headings = new Set(['Experience', 'Education', 'Skills', 'Certifications']);
  const blocks: Block[] = text
    .split('\n')
    .filter((l) => l.trim())
    .map((line, i) => ({
      type: i === 0 ? 'title' : headings.has(line.trim()) ? 'heading' : line.startsWith('•') ? 'bullet' : 'para',
      text: line.startsWith('•') ? line.slice(1).trim() : line,
    }));
  const pdf = renderPdf(blocks, { title: 'Resume' }).pdf;
  const res = await fetch(`${origin}/api/resume/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ filename: 'resume.pdf', contentBase64: pdf.toString('base64') }),
  });
  const body = (await res.json()) as { text?: string; error?: { message?: string } };
  if (!res.ok) fail(`PDF import returned ${res.status}: ${body.error?.message ?? ''}`);
  const firstLine = text.split('\n').find((l) => l.trim())!.trim();
  if (!body.text?.includes(firstLine)) fail('PDF import did not return the resume text');
  ok('same-origin POST accepted; PDF resume imported through pdf.js');

  child.stdin.end();
  const code = await Promise.race([exited, new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 10_000))]);
  if (code === 'timeout') fail('server did not exit within 10 s after stdin closed');
  if (code !== 0) fail(`server exited with ${code} after stdin closed: ${stderr.trim()}`);
  if (existsSync(join(dataDir, 'api.lock'))) fail('data-folder lock left behind');
  ok('stdin close → clean exit 0, lock released');
  console.log('Desktop server smoke passed.');
} finally {
  if (child.exitCode === null) child.kill('SIGKILL');
  rmSync(dataDir, { recursive: true, force: true });
}

/**
 * Builds a versioned, reproducible release archive. Publishes nothing.
 *
 *   npm run package:release [-- --allow-dirty] [--skip-build]
 *
 * Output (in release/, git-ignored):
 *   reboundops-<version>.tar.gz     tracked source at HEAD (no tests/CI) + prebuilt web app
 *   THIRD_PARTY_NOTICES.txt         licences of every third-party package that ships
 *   reboundops-<version>.sbom.json  CycloneDX inventory of what ships
 *   SHA256SUMS                      checksums of the three files above
 *
 * Reproducibility: entries are sorted, owners/permissions normalised, and every
 * timestamp is the commit time (or SOURCE_DATE_EPOCH), so the same commit and
 * the same web build give a byte-identical archive.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = new Set(process.argv.slice(2));
const git = (...a: string[]) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const fail = (m: string): never => {
  console.error(`package:release FAIL: ${m}`);
  process.exit(1);
};

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string; engines?: { node?: string } };
const version = pkg.version;
const commit = git('rev-parse', 'HEAD');
if (!args.has('--allow-dirty') && git('status', '--porcelain', '--untracked-files=no')) fail('the working tree has uncommitted changes (use --allow-dirty for a test build).');
const epoch = Number(process.env['SOURCE_DATE_EPOCH'] ?? git('log', '-1', '--format=%ct'));
const name = `reboundops-${version}`;

if (!args.has('--skip-build')) execFileSync('npm', ['run', 'build', '-w', '@reboundops/web'], { cwd: root, stdio: 'inherit', env: { ...process.env, NG_CLI_ANALYTICS: 'false' } });
const webDist = join(root, 'apps/web/dist/browser');
if (!existsSync(join(webDist, 'index.html'))) fail('no web build at apps/web/dist/browser.');

/* ---------- collect files ---------- */

const EXCLUDE = [/^marketing-site\//, /^apps\/desktop\//, /^scripts\/(build|package|smoke)-desktop[^/]*\.ts$/, /^tests\//, /(^|\/)test\//, /^\.github\//, /^reports\//, /^playwright\.config\.ts$/, /^vitest\.config\.ts$/, /^eslint\.config\.js$/, /^apps\/web\/src\/.*\.spec\.ts$/];
const FORBIDDEN = [/(^|\/)CLAUDE\.md$/, /(^|\/)\.claude\//, /\.sqlite(-|$)/, /(^|\/)\.env(\.|$)/, /(^|\/)graphify-out\//, /(^|\/)node_modules\//, /\.rbobak$/];
const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
const files = new Map<string, Buffer>();
for (const f of tracked) {
  if (EXCLUDE.some((re) => re.test(f))) continue;
  if (FORBIDDEN.some((re) => re.test(f))) fail(`forbidden file is tracked: ${f}`);
  const full = join(root, f);
  if (!existsSync(full)) continue;
  if (lstatSync(full).isSymbolicLink()) fail(`symlink in the tree: ${f}`);
  files.set(f, readFileSync(full));
}
const walk = (dir: string): string[] => readdirSync(dir).flatMap((e) => (statSync(join(dir, e)).isDirectory() ? walk(join(dir, e)) : [join(dir, e)]));
for (const full of walk(webDist)) files.set(`apps/web/dist/browser/${relative(webDist, full).split('\\').join('/')}`, readFileSync(full));

files.set(
  'RELEASE-INFO.json',
  Buffer.from(
    JSON.stringify(
      {
        name: 'ReboundOps',
        version,
        commit,
        builtFrom: `git commit ${commit.slice(0, 12)}`,
        sourceDate: new Date(epoch * 1000).toISOString(),
        node: pkg.engines?.node ?? '>=24',
        install: 'npm ci --omit=dev --omit=optional --ignore-scripts',
        start: 'npm start',
      },
      null,
      2,
    ) + '\n',
  ),
);

/* ---------- third-party notices (what ships) ---------- */

interface Dep {
  name: string;
  version: string;
  license: string;
  path: string;
}
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8')) as { packages: Record<string, { version?: string; license?: string; dev?: boolean; optional?: boolean; devOptional?: boolean; link?: boolean }> };
const shipped: Dep[] = [];
for (const [p, meta] of Object.entries(lock.packages)) {
  if (!p.startsWith('node_modules/') || meta.link || meta.dev || meta.devOptional || meta.optional) continue;
  const n = p.slice(p.lastIndexOf('node_modules/') + 'node_modules/'.length);
  shipped.push({ name: n, version: meta.version ?? '?', license: meta.license ?? 'UNKNOWN', path: p });
}
// Libraries compiled into the prebuilt web bundle (build-time dependencies, but their code ships).
const webPkg = JSON.parse(readFileSync(join(root, 'apps/web/package.json'), 'utf8')) as { devDependencies: Record<string, string> };
for (const n of ['@angular/common', '@angular/core', '@angular/forms', '@angular/platform-browser', '@angular/router', 'rxjs', 'tslib']) {
  const meta = lock.packages[`node_modules/${n}`];
  if (!webPkg.devDependencies[n] || !meta) fail(`web bundle library ${n} not found in the lockfile.`);
  shipped.push({ name: `${n} (in the web bundle)`, version: meta!.version ?? '?', license: meta!.license ?? 'UNKNOWN', path: `node_modules/${n}` });
}
shipped.sort((a, b) => a.name.localeCompare(b.name));
const licenceText = (dir: string) => {
  const full = join(root, dir);
  if (!existsSync(full)) return null;
  const f = readdirSync(full).find((x) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(x));
  return f ? readFileSync(join(full, f), 'utf8').trim() : null;
};
const notices = [
  `ReboundOps ${version} — third-party notices`,
  '',
  'ReboundOps itself is MIT-licensed (see LICENSE). It ships or installs the third-party packages below,',
  'each under its own licence. Licence texts are reproduced from the installed packages.',
  '',
  ...shipped.flatMap((d) => {
    const text = licenceText(d.path);
    return [`== ${d.name} ${d.version} — ${d.license} ==`, text ?? `(no licence file in the package; licence declared as ${d.license})`, ''];
  }),
].join('\n');
const unknown = shipped.filter((d) => d.license === 'UNKNOWN');
if (unknown.length) fail(`packages without a declared licence ship: ${unknown.map((d) => d.name).join(', ')}`);

const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  version: 1,
  metadata: { timestamp: new Date(epoch * 1000).toISOString(), component: { type: 'application', name: 'reboundops', version, licenses: [{ license: { id: 'MIT' } }] } },
  components: shipped.map((d) => ({ type: 'library', name: d.name.replace(/ \(in the web bundle\)$/, ''), version: d.version, licenses: [{ expression: d.license }], properties: d.name.endsWith('(in the web bundle)') ? [{ name: 'reboundops:shipped-as', value: 'compiled into web bundle' }] : [] })),
};

/* ---------- deterministic tar.gz ---------- */

function tarHeader(path: string, size: number, mode: number, type: '0' | '5'): Buffer {
  const h = Buffer.alloc(512, 0);
  let name = path;
  let prefix = '';
  if (Buffer.byteLength(name) > 100) {
    const cut = name.lastIndexOf('/', 154);
    prefix = name.slice(0, cut);
    name = name.slice(cut + 1);
    if (Buffer.byteLength(name) > 100 || Buffer.byteLength(prefix) > 155) fail(`path too long for tar: ${path}`);
  }
  const put = (s: string, off: number, len: number) => h.write(s, off, len, 'utf8');
  put(name, 0, 100);
  put(mode.toString(8).padStart(7, '0') + '\0', 100, 8);
  put('0000000\0', 108, 8);
  put('0000000\0', 116, 8);
  put(size.toString(8).padStart(11, '0') + '\0', 124, 12);
  put(epoch.toString(8).padStart(11, '0') + '\0', 136, 12);
  put('        ', 148, 8);
  put(type, 156, 1);
  put('ustar\0', 257, 6);
  put('00', 263, 2);
  put('root', 265, 32);
  put('root', 297, 32);
  put(prefix, 345, 155);
  let sum = 0;
  for (const b of h) sum += b;
  put(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
  return h;
}

const entries = [...files.keys()].sort();
const dirs = [...new Set(entries.flatMap((f) => f.split('/').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('/'))))].sort();
const chunks: Buffer[] = [tarHeader(`${name}/`, 0, 0o755, '5')];
for (const d of dirs) chunks.push(tarHeader(`${name}/${d}/`, 0, 0o755, '5'));
for (const f of entries) {
  const data = files.get(f)!;
  const exec = f.startsWith('scripts/') && f.endsWith('.sh');
  chunks.push(tarHeader(`${name}/${f}`, data.length, exec ? 0o755 : 0o644, '0'), data, Buffer.alloc((512 - (data.length % 512)) % 512, 0));
}
chunks.push(Buffer.alloc(1024, 0));
const tgz = gzipSync(Buffer.concat(chunks), { level: 9 });

/* ---------- scan what is about to ship ---------- */

const SECRET = [/-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/, /\bAKIA[0-9A-Z]{16}\b/, /\bsk-(?:ant-)?[A-Za-z0-9_-]{24,}\b/, /\bgh[pousr]_[A-Za-z0-9]{30,}\b/];
const HOME = new RegExp(['', 'Users', '[A-Za-z0-9._-]+', ''].join('/'));
for (const [f, data] of files) {
  if (data.length > 5_000_000 || /\.(png|jpg|ico|woff2?)$/.test(f)) continue;
  const text = data.toString('utf8');
  if (SECRET.some((re) => re.test(text))) fail(`possible secret in ${f}`);
  if (HOME.test(text) && !f.startsWith('apps/web/dist/')) fail(`machine-specific path in ${f}`);
}

/* ---------- write ---------- */

const out = join(root, 'release');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const outputs: [string, Buffer][] = [
  [`${name}.tar.gz`, tgz],
  ['THIRD_PARTY_NOTICES.txt', Buffer.from(notices)],
  [`${name}.sbom.json`, Buffer.from(JSON.stringify(sbom, null, 2) + '\n')],
];
for (const [f, data] of outputs) writeFileSync(join(out, f), data);
const sums = outputs.map(([f, data]) => `${createHash('sha256').update(data).digest('hex')}  ${f}`).join('\n') + '\n';
writeFileSync(join(out, 'SHA256SUMS'), sums);

console.log(`Packaged ${name} from ${commit.slice(0, 12)}: ${entries.length} files, ${(tgz.length / 1024).toFixed(0)} KB compressed; ${shipped.length} third-party packages ship.`);
process.stdout.write(sums);
console.log('Nothing was published. Verify with: npm run verify:release');

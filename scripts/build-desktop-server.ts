/**
 * Stages what the desktop app runs, next to its bundled Node runtime. Publishes nothing.
 *
 *   node scripts/build-desktop-server.ts [--out <dir>] [--skip-web-build]
 *
 * Output (default apps/desktop/stage/, git-ignored):
 *   server/main.mjs                      the API and every @reboundops package in one ES module
 *   server/node_modules/pdfjs-dist/...   only the two PDF reader files it loads at runtime, plus licence
 *   server/package.json                  marks the folder as ES modules
 *   web/                                 the production Angular build (apps/web/dist/browser)
 *   BUILD-INFO.json                      version and commit
 *
 * pdfjs-dist stays outside the bundle: it loads its worker with import() relative to its own file.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const out = resolve(root, opt('--out') ?? 'apps/desktop/stage');
const fail = (m: string): never => {
  console.error(`build-desktop-server FAIL: ${m}`);
  process.exit(1);
};

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'server'), { recursive: true });

/* ---------- server bundle ---------- */
const result = await build({
  entryPoints: [join(root, 'apps/api/src/main.ts')],
  outfile: join(out, 'server/main.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  external: ['pdfjs-dist', 'pdfjs-dist/*'],
  // CommonJS dependencies inside an ES module bundle still call require() for Node built-ins.
  banner: { js: "import { createRequire as __rboCreateRequire } from 'node:module';\nconst require = __rboCreateRequire(import.meta.url);" },
  legalComments: 'eof',
  sourcemap: false,
  minify: false,
  metafile: true,
  logLevel: 'warning',
});
if (result.errors.length) fail(`esbuild reported ${result.errors.length} error(s).`);
const inputs = Object.keys(result.metafile.inputs);
const thirdParty = [...new Set(inputs.filter((p) => p.includes('node_modules/')).map((p) => p.replace(/^.*node_modules\/((?:@[^/]+\/)?[^/]+).*$/, '$1')))].sort();
writeFileSync(join(out, 'server/package.json'), JSON.stringify({ type: 'module', private: true }, null, 2) + '\n');

/* ---------- pdf.js runtime files ---------- */
const pdfSrc = join(root, 'node_modules/pdfjs-dist');
const pdfDst = join(out, 'server/node_modules/pdfjs-dist');
for (const f of ['package.json', 'LICENSE', 'legacy/build/pdf.mjs', 'legacy/build/pdf.worker.mjs']) {
  if (!existsSync(join(pdfSrc, f))) fail(`pdfjs-dist is missing ${f}`);
  mkdirSync(dirname(join(pdfDst, f)), { recursive: true });
  cpSync(join(pdfSrc, f), join(pdfDst, f));
}

/* ---------- web app ---------- */
if (!argv.includes('--skip-web-build')) {
  execFileSync('npm', ['run', 'build', '-w', '@reboundops/web'], { cwd: root, stdio: 'inherit', env: { ...process.env, NG_CLI_ANALYTICS: 'false' }, shell: process.platform === 'win32' });
}
const webDist = join(root, 'apps/web/dist/browser');
if (!existsSync(join(webDist, 'index.html'))) fail('no web build at apps/web/dist/browser (run without --skip-web-build).');
cpSync(webDist, join(out, 'web'), { recursive: true });

writeFileSync(
  join(out, 'BUILD-INFO.json'),
  JSON.stringify({ name: 'ReboundOps', version: pkg.version, commit, bundledPackages: [...thirdParty, 'pdfjs-dist'].sort() }, null, 2) + '\n',
);
console.log(`Staged desktop server ${pkg.version} (${commit.slice(0, 12)}) in ${out}`);
console.log(`Bundled third-party packages: ${thirdParty.join(', ')} (+ pdfjs-dist, copied)`);

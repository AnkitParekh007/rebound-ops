/**
 * Builds a ReboundOps desktop app for one platform. Publishes nothing.
 *
 *   node scripts/package-desktop.ts [--target macos-arm64|macos-x64|windows-x64]
 *                                   [--skip-stage] [--skip-web-build] [--no-smoke]
 *
 * Steps: stage the bundled server and web app (build-desktop-server.ts) → fetch the official Node.js
 * runtime and verify it against nodejs.org's SHASUMS256.txt → write third-party notices and an SBOM
 * (fails on a licence that is not approved) → `tauri build` → run the built app in smoke mode
 * (REBOUND_DESKTOP_SMOKE=1) → zip.
 *
 * Output (release/desktop/, git-ignored):
 *   ReboundOps-<version>-<target>.zip
 *   reboundops-desktop-<version>-<target>.sbom.json
 *   SHA256SUMS-<target>.txt
 *
 * The apps are not signed with a developer certificate. macOS builds are ad-hoc signed (required on
 * Apple Silicon); README.txt in each zip explains the first-launch prompt.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Official Node.js runtime bundled with the apps (v24 LTS; 24.22.3 is a security release). */
const NODE_VERSION = '24.22.3';

const TARGETS = {
  'macos-arm64': { node: 'darwin-arm64', archive: 'tar.gz', triple: 'aarch64-apple-darwin', os: 'darwin' },
  'macos-x64': { node: 'darwin-x64', archive: 'tar.gz', triple: 'x86_64-apple-darwin', os: 'darwin' },
  'windows-x64': { node: 'win-x64', archive: 'zip', triple: 'x86_64-pc-windows-msvc', os: 'win32' },
} as const;
type TargetName = keyof typeof TARGETS;

/** SPDX ids allowed in what the apps ship. MPL-2.0 is file-level copyleft: allowed with a source note. */
const PERMISSIVE = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'BlueOak-1.0.0', 'CC0-1.0', 'Unlicense', 'MIT-0', 'Zlib', 'Unicode-3.0', 'Unicode-DFS-2016', 'BSL-1.0', 'Python-2.0', 'CC-BY-4.0']);
const WITH_SOURCE_NOTE = new Set(['MPL-2.0']);

const root = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const opt = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const fail = (m: string): never => {
  console.error(`package-desktop FAIL: ${m}`);
  process.exit(1);
};
const step = (m: string) => console.log(`\n== ${m}`);
const isWin = platform() === 'win32';
const run = (cmd: string, args: string[], env: NodeJS.ProcessEnv = {}) =>
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env }, shell: isWin && (cmd === 'npm' || cmd === 'npx') });

const hostTarget = (): TargetName => (platform() === 'win32' ? 'windows-x64' : arch() === 'arm64' ? 'macos-arm64' : 'macos-x64');
const targetName = (opt('--target') ?? hostTarget()) as TargetName;
const target = TARGETS[targetName] ?? fail(`unknown --target ${opt('--target')}; use ${Object.keys(TARGETS).join(', ')}`);
if (target.os !== platform()) fail(`${targetName} must be built on ${target.os} (this is ${platform()}).`);

/* ---------- versions must agree ---------- */
const version = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }).version;
const tauriConfPath = join(root, 'apps/desktop/src-tauri/tauri.conf.json');
const tauriVersion = (JSON.parse(readFileSync(tauriConfPath, 'utf8')) as { version: string }).version;
const cargoVersion = /^version\s*=\s*"([^"]+)"/m.exec(readFileSync(join(root, 'apps/desktop/src-tauri/Cargo.toml'), 'utf8'))?.[1];
if (tauriVersion !== version || cargoVersion !== version) fail(`version mismatch: package.json ${version}, tauri.conf.json ${tauriVersion}, Cargo.toml ${cargoVersion}`);

const stage = join(root, 'apps/desktop/stage');
const outDir = join(root, 'release/desktop');
mkdirSync(outDir, { recursive: true });
const label = `ReboundOps-${version}-${targetName}`;

/* ---------- 1. server + web ---------- */
if (!has('--skip-stage')) {
  step('Stage the bundled server and web app');
  run('node', ['scripts/build-desktop-server.ts', ...(has('--skip-web-build') ? ['--skip-web-build'] : [])]);
}
if (!existsSync(join(stage, 'server/main.mjs')) || !existsSync(join(stage, 'web/index.html'))) fail('stage is incomplete; run without --skip-stage.');
const buildInfo = JSON.parse(readFileSync(join(stage, 'BUILD-INFO.json'), 'utf8')) as { commit: string; bundledPackages: string[] };

/* ---------- 2. Node.js runtime ---------- */
step(`Fetch and verify Node.js v${NODE_VERSION} (${target.node})`);
const cache = join(outDir, '.cache');
mkdirSync(cache, { recursive: true });
const base = `https://nodejs.org/dist/v${NODE_VERSION}`;
const archiveName = `node-v${NODE_VERSION}-${target.node}.${target.archive}`;
const archivePath = join(cache, archiveName);
async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) fail(`download failed (${res.status}): ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
const sums = (await download(`${base}/SHASUMS256.txt`)).toString('utf8');
const expected = sums.split('\n').find((l) => l.trim().endsWith(`  ${archiveName}`))?.split(/\s+/)[0] ?? fail(`${archiveName} is not listed in SHASUMS256.txt`);
if (!existsSync(archivePath) || createHash('sha256').update(readFileSync(archivePath)).digest('hex') !== expected) {
  writeFileSync(archivePath, await download(`${base}/${archiveName}`));
}
const actual = createHash('sha256').update(readFileSync(archivePath)).digest('hex');
if (actual !== expected) fail(`checksum mismatch for ${archiveName}: expected ${expected}, got ${actual}`);
console.log(`  sha256 ${actual} matches SHASUMS256.txt`);

const unpack = join(cache, `unpack-${target.node}`);
rmSync(unpack, { recursive: true, force: true });
mkdirSync(unpack, { recursive: true });
execFileSync('tar', ['-xf', archivePath, '-C', unpack], { stdio: 'inherit' });
const nodeRoot = join(unpack, `node-v${NODE_VERSION}-${target.node}`);
const runtime = join(stage, 'runtime');
rmSync(runtime, { recursive: true, force: true });
mkdirSync(runtime, { recursive: true });
const nodeBin = target.os === 'win32' ? 'node.exe' : 'node';
cpSync(join(nodeRoot, target.os === 'win32' ? 'node.exe' : 'bin/node'), join(runtime, nodeBin));
cpSync(join(nodeRoot, 'LICENSE'), join(runtime, 'LICENSE'));

/* ---------- 3. notices, licence check, SBOM ---------- */
step('Third-party notices and licence check');
type Component = { kind: 'runtime' | 'npm' | 'crate'; name: string; version: string; license: string; source: string };
const components: Component[] = [{ kind: 'runtime', name: 'node', version: NODE_VERSION, license: 'MIT', source: `${base}/${archiveName}` }];
const problems: string[] = [];
const sourceNotes: string[] = [];
const textsByHash = new Map<string, { text: string; who: string[] }>();
const addText = (who: string, text: string) => {
  const h = createHash('sha256').update(text.trim()).digest('hex');
  const e = textsByHash.get(h) ?? { text: text.trim(), who: [] };
  e.who.push(who);
  textsByHash.set(h, e);
};
const licenceFiles = (dir: string) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => /^(licen[cs]e|copying|notice)/i.test(f) && statSync(join(dir, f)).isFile()) : [];

/** True when the SPDX expression can be satisfied with allowed licences. */
function licenceOk(expr: string, who: string): boolean {
  const alternatives = expr.replace(/[()]/g, '').split(/\s+OR\s+|\//).map((a) => a.split(/\s+AND\s+/).map((s) => s.trim()).filter(Boolean));
  if (alternatives.some((all) => all.every((id) => PERMISSIVE.has(id)))) return true;
  if (alternatives.some((all) => all.every((id) => PERMISSIVE.has(id) || WITH_SOURCE_NOTE.has(id)))) {
    sourceNotes.push(who);
    return true;
  }
  return false;
}

// npm packages inside the server bundle (+ pdfjs-dist, copied)
for (const name of buildInfo.bundledPackages) {
  const dir = join(root, 'node_modules', name);
  const pj = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { version: string; license?: string | { type?: string } };
  const license = typeof pj.license === 'string' ? pj.license : (pj.license?.type ?? 'UNKNOWN');
  components.push({ kind: 'npm', name, version: pj.version, license, source: `https://www.npmjs.com/package/${name}/v/${pj.version}` });
  if (!licenceOk(license, `${name}@${pj.version} (npm, ${license}): source at https://www.npmjs.com/package/${name}/v/${pj.version}`)) problems.push(`npm ${name}@${pj.version}: ${license}`);
  for (const f of licenceFiles(dir)) addText(`${name}@${pj.version}`, readFileSync(join(dir, f), 'utf8'));
}

// Rust crates linked into the desktop shell for this target (normal dependencies only)
const cargoEnv = { ...process.env };
const meta = JSON.parse(
  execFileSync('cargo', ['metadata', '--format-version', '1', '--filter-platform', target.triple, '--manifest-path', join(root, 'apps/desktop/src-tauri/Cargo.toml')], {
    encoding: 'utf8',
    env: cargoEnv,
    maxBuffer: 64 * 1024 * 1024,
  }),
) as {
  packages: { id: string; name: string; version: string; license: string | null; manifest_path: string }[];
  resolve: { root: string; nodes: { id: string; deps: { pkg: string; dep_kinds: { kind: string | null }[] }[] }[] };
};
const nodes = new Map(meta.resolve.nodes.map((n) => [n.id, n]));
const pkgs = new Map(meta.packages.map((p) => [p.id, p]));
const shipped = new Set<string>();
const stack = [meta.resolve.root];
while (stack.length) {
  const id = stack.pop()!;
  if (shipped.has(id)) continue;
  shipped.add(id);
  for (const d of nodes.get(id)?.deps ?? []) if (d.dep_kinds.some((k) => k.kind === null || k.kind === 'normal')) stack.push(d.pkg);
}
shipped.delete(meta.resolve.root);
for (const id of [...shipped].sort()) {
  const p = pkgs.get(id)!;
  const license = p.license ?? 'UNKNOWN';
  const src = `https://crates.io/crates/${p.name}/${p.version}`;
  components.push({ kind: 'crate', name: p.name, version: p.version, license, source: src });
  if (!licenceOk(license, `${p.name} ${p.version} (crate, ${license}): unmodified source at ${src}`)) problems.push(`crate ${p.name} ${p.version}: ${license}`);
  const dir = join(p.manifest_path, '..');
  for (const f of licenceFiles(dir)) addText(`${p.name} ${p.version}`, readFileSync(join(dir, f), 'utf8'));
}
if (problems.length) fail(`licences need review:\n  ${problems.join('\n  ')}`);

const notices = [
  `ReboundOps ${version} desktop app (${targetName}) — third-party notices`,
  `Built from commit ${buildInfo.commit}. ReboundOps itself is MIT-licensed.`,
  '',
  `This app includes the Node.js runtime v${NODE_VERSION} (${base}/${archiveName}), the npm packages bundled`,
  'into its local server, and the Rust crates linked into its window. Each is listed below with its licence.',
  '',
  ...(sourceNotes.length
    ? ['The following are under the Mozilla Public License 2.0 (file-level copyleft). They are included unmodified;', 'their source code is available at the address given:', ...sourceNotes.map((s) => `  - ${s}`), '']
    : []),
  '== Components ==',
  ...components.map((c) => `${c.kind.padEnd(7)} ${c.name} ${c.version}  [${c.license}]`),
  '',
  '== Node.js licence (includes the licences of the libraries Node.js bundles) ==',
  readFileSync(join(runtime, 'LICENSE'), 'utf8').trim(),
  '',
  '== Licence texts ==',
  ...[...textsByHash.values()].flatMap((e) => ['', `---- ${e.who.join(', ')} ----`, e.text]),
  '',
].join('\n');
writeFileSync(join(stage, 'THIRD_PARTY_NOTICES.txt'), notices);
const sbomPath = join(outDir, `reboundops-desktop-${version}-${targetName}.sbom.json`);
writeFileSync(
  sbomPath,
  JSON.stringify(
    {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      version: 1,
      metadata: { component: { type: 'application', name: 'ReboundOps desktop', version, properties: [{ name: 'target', value: targetName }, { name: 'commit', value: buildInfo.commit }] } },
      components: components.map((c) => ({ type: c.kind === 'runtime' ? 'platform' : 'library', name: c.name, version: c.version, licenses: [{ expression: c.license }], externalReferences: [{ type: 'distribution', url: c.source }] })),
    },
    null,
    2,
  ) + '\n',
);
console.log(`  ${components.length} components (${shipped.size} crates, ${buildInfo.bundledPackages.length} npm packages, Node.js); ${sourceNotes.length} with MPL-2.0 source notes`);

/* ---------- 4. tauri build ---------- */
step(`tauri build (${target.triple})`);
const tauriArgs = ['tauri', 'build', '--ci', '--target', target.triple, '--config', JSON.stringify({ bundle: { resources: { '../stage/server/': 'server/', '../stage/web/': 'web/', '../stage/runtime/': 'runtime/', '../stage/THIRD_PARTY_NOTICES.txt': 'THIRD_PARTY_NOTICES.txt' } } })];
if (target.os === 'darwin') tauriArgs.push('--bundles', 'app');
else tauriArgs.push('--no-bundle');
execFileSync('npx', tauriArgs, { cwd: join(root, 'apps/desktop'), stdio: 'inherit', shell: isWin });

const releaseDir = join(root, 'apps/desktop/src-tauri/target', target.triple, 'release');
const folder = join(outDir, label);
rmSync(folder, { recursive: true, force: true });
mkdirSync(folder, { recursive: true });
let smokeExe: string;
if (target.os === 'darwin') {
  const app = join(releaseDir, 'bundle/macos/ReboundOps.app');
  if (!existsSync(app)) fail(`no app bundle at ${app}`);
  // Ad-hoc signature over the whole bundle: Apple Silicon will not run an unsigned app.
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
  execFileSync('ditto', [app, join(folder, 'ReboundOps.app')], { stdio: 'inherit' });
  const macos = join(folder, 'ReboundOps.app/Contents/MacOS');
  smokeExe = join(macos, readdirSync(macos)[0] ?? fail('no executable in the app bundle'));
} else {
  const exe = readdirSync(releaseDir).find((f) => /^reboundops\.exe$/i.test(f)) ?? fail(`no reboundops.exe in ${releaseDir}`);
  cpSync(join(releaseDir, exe), join(folder, 'ReboundOps.exe'));
  for (const d of ['server', 'web', 'runtime']) cpSync(join(stage, d), join(folder, d), { recursive: true });
  cpSync(join(stage, 'THIRD_PARTY_NOTICES.txt'), join(folder, 'THIRD_PARTY_NOTICES-app.txt'));
  smokeExe = join(folder, 'ReboundOps.exe');
}
cpSync(join(stage, 'THIRD_PARTY_NOTICES.txt'), join(folder, 'THIRD_PARTY_NOTICES.txt'));
writeFileSync(
  join(folder, 'README.txt'),
  [
    `ReboundOps ${version} for ${target.os === 'darwin' ? `macOS (${targetName === 'macos-arm64' ? 'Apple Silicon' : 'Intel'})` : 'Windows (x64)'}`,
    '',
    'ReboundOps runs your job search on your own computer. It needs no account, and AI is optional.',
    'Your data is kept in the .reboundops folder in your home folder, the same place the command-line',
    'version (npm start) uses, so you can switch between them. Only one can be open at a time.',
    '',
    'This app is not signed with a paid developer certificate, so the first launch needs one extra step:',
    ...(target.os === 'darwin'
      ? [
          '  1. Move ReboundOps.app to Applications and open it. macOS says it cannot verify the developer.',
          '  2. Open System Settings > Privacy & Security, scroll down and click "Open Anyway" next to ReboundOps.',
          '  3. Confirm. Later launches open normally.',
        ]
      : [
          '  1. Unzip the whole folder (do not run ReboundOps.exe from inside the zip).',
          '  2. Open ReboundOps.exe. If Windows SmartScreen appears, click "More info", then "Run anyway".',
          '  3. Windows 10 and 11 already include the Microsoft Edge WebView2 runtime that ReboundOps uses.',
        ]),
    '',
    'Check the download against SHA256SUMS before opening it. Licences: THIRD_PARTY_NOTICES.txt.',
    'Source code and documentation: https://github.com/AnkitParekh007/rebound-ops',
    '',
  ].join('\n'),
);

/* ---------- 5. smoke test the built app ---------- */
if (!has('--no-smoke')) {
  step('Smoke test the built app (REBOUND_DESKTOP_SMOKE=1)');
  execFileSync(smokeExe, [], { stdio: 'inherit', env: { ...process.env, REBOUND_DESKTOP_SMOKE: '1' }, timeout: 120_000 });
}

/* ---------- 6. zip + checksums ---------- */
step('Zip');
const zipName = `${label}.zip`;
const zipPath = join(outDir, zipName);
rmSync(zipPath, { force: true });
// No resource forks or extended attributes: they would appear as __MACOSX/ entries. The signature
// lives in the bundle's files (_CodeSignature, embedded in executables), so it survives.
if (target.os === 'darwin') execFileSync('ditto', ['-c', '-k', '--norsrc', '--noextattr', '--noqtn', '--keepParent', folder, zipPath], { stdio: 'inherit' });
else execFileSync('tar', ['-a', '-c', '-f', zipPath, '-C', outDir, label], { stdio: 'inherit' });
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const sumsFile = join(outDir, `SHA256SUMS-${targetName}.txt`);
writeFileSync(sumsFile, [zipPath, sbomPath].map((p) => `${sha(p)}  ${p.split(/[\\/]/).pop()}`).join('\n') + '\n');
const size = (statSync(zipPath).size / 1024 / 1024).toFixed(1);
renameSync(folder, `${folder}.unpacked`);
rmSync(`${folder}.unpacked`, { recursive: true, force: true });
console.log(`\n${zipName}: ${size} MB\n${readFileSync(sumsFile, 'utf8')}`);

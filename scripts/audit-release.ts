/**
 * Release audit. Runs without network except the optional `npm audit` step.
 *
 *  1. Local-only files (planning notes, machine settings) are not tracked.
 *  2. No first-party file references machine-specific absolute paths or legacy trees.
 *  3. No obvious secrets in tracked files.
 *  4. No symlinks or submodules in the tree.
 *  5. Every installed dependency has an allowed licence; writes an SBOM to reports/.
 *  6. `npm audit` for known vulnerabilities (reported; high/critical fails).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const failures: string[] = [];
const notes: string[] = [];
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

const files = git('ls-files', '-co', '--exclude-standard').split('\n').filter(Boolean);
const tracked = new Set(git('ls-files').split('\n').filter(Boolean));

/* 1. local-only files */
for (const local of ['CLAUDE.md', '.claude/settings.local.json']) {
  if (tracked.has(local) || files.includes(local)) failures.push(`${local} must stay local-only (untracked and excluded).`);
}

/* 2 & 3. content scans */
const home = ['', 'Users', ''].join('/');
const legacyPatterns = [
  new RegExp(['Projects', 'personal', 'rebound', ''].join('/')),
  new RegExp(['Projects', 'rebound', ''].join('/')),
  new RegExp(`${home}[A-Za-z0-9._-]+/`),
];
const secretPatterns: [string, RegExp][] = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['OpenAI/Anthropic-style key', /\bsk-(?:ant-)?[A-Za-z0-9_-]{24,}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['Slack token', /\bxox[abpr]-[A-Za-z0-9-]{10,}\b/],
  ['assigned secret', /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"\s]{12,}['"]/i],
];
const TEXT = /\.(ts|js|mjs|cjs|json|md|html|css|txt|yml|yaml|toml|sh)$|^[^.]+$/;
for (const f of files) {
  const full = join(root, f);
  if (!existsSync(full)) continue;
  const st = lstatSync(full);
  if (st.isSymbolicLink()) {
    failures.push(`Symlink not allowed in the tree: ${f}`);
    continue;
  }
  if (!TEXT.test(f) || f === 'package-lock.json' || st.size > 2_000_000) continue;
  const text = readFileSync(full, 'utf8');
  for (const re of legacyPatterns) if (re.test(text)) failures.push(`Machine-specific or legacy path reference in ${f}`);
  for (const [name, re] of secretPatterns) if (re.test(text)) failures.push(`Possible ${name} in ${f}`);
}

/* 4. submodules */
if (existsSync(join(root, '.gitmodules'))) failures.push('.gitmodules present: submodules are not allowed.');

/* 5. licences + SBOM */
const ALLOWED = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'BlueOak-1.0.0', 'CC0-1.0', 'Unlicense', 'Python-2.0', 'CC-BY-4.0', 'MIT-0']);
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8')) as {
  packages: Record<string, { version?: string; license?: string; dev?: boolean; link?: boolean; optional?: boolean }>;
};
/** Weak (file-level) copyleft accepted only for build tools that are not redistributed. */
const ALLOWED_DEV_ONLY = new Set(['MPL-2.0']);
const components: { name: string; version: string; license: string; scope: string }[] = [];
const byLicense = new Map<string, number>();
for (const [path, meta] of Object.entries(lock.packages)) {
  if (!path.startsWith('node_modules/') || meta.link) continue;
  const name = path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
  let license = meta.license;
  if (!license) {
    const pj = join(root, path, 'package.json');
    if (existsSync(pj)) {
      const l = (JSON.parse(readFileSync(pj, 'utf8')) as { license?: unknown }).license;
      license = typeof l === 'string' ? l : (l as { type?: string } | undefined)?.type;
    }
  }
  license ??= 'UNKNOWN';
  const scope = meta.dev ? 'dev' : 'runtime';
  components.push({ name, version: meta.version ?? '?', license, scope });
  byLicense.set(license, (byLicense.get(license) ?? 0) + 1);
  const ok = license
    .replace(/[()]/g, '')
    .split(/\s+OR\s+/)
    .some((alt) =>
      alt.split(/\s+AND\s+/).every((l) => ALLOWED.has(l.trim()) || (scope === 'dev' && ALLOWED_DEV_ONLY.has(l.trim()))),
    );
  if (ok && scope === 'dev' && ALLOWED_DEV_ONLY.has(license)) notes.push(`Dev-only ${license} build tool (not shipped): ${name}`);
  if (!ok) {
    // Optional platform binaries not installed on this machine have no metadata to check.
    if (license === 'UNKNOWN' && meta.optional) notes.push(`Licence not verifiable (optional, not installed): ${name}`);
    else failures.push(`Licence needs review: ${name}@${meta.version} (${license}) [${scope}]`);
  }
}
mkdirSync(join(root, 'reports'), { recursive: true });
const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { name: string; version: string };
writeFileSync(
  join(root, 'reports', 'sbom.json'),
  JSON.stringify(
    {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      metadata: { component: { type: 'application', name: rootPkg.name, version: rootPkg.version } },
      components: components.map((c) => ({ type: 'library', name: c.name, version: c.version, scope: c.scope === 'dev' ? 'excluded' : 'required', licenses: [{ expression: c.license }] })),
    },
    null,
    2,
  ),
);

/* 6. vulnerabilities: runtime high/critical fail the gate; dev-only advisories are reported. */
function auditJson(args: string[]): Record<string, number> | null {
  let out: string | undefined;
  try {
    out = execFileSync('npm', ['audit', '--json', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    out = (err as { stdout?: string }).stdout;
  }
  if (!out?.trim().startsWith('{')) return null;
  return (JSON.parse(out) as { metadata?: { vulnerabilities?: Record<string, number> } }).metadata?.vulnerabilities ?? {};
}
const fmt = (v: Record<string, number>) => Object.entries(v).map(([k, n]) => `${k}=${n}`).join(' ');
const runtimeVulns = auditJson(['--omit=dev']);
const allVulns = auditJson([]);
let vulnSummary = 'unknown (npm audit could not run — offline?)';
if (runtimeVulns && allVulns) {
  vulnSummary = `runtime: ${fmt(runtimeVulns)} | including dev tooling: ${fmt(allVulns)}`;
  if ((runtimeVulns['high'] ?? 0) + (runtimeVulns['critical'] ?? 0) > 0) failures.push(`Runtime dependencies have high/critical advisories: ${fmt(runtimeVulns)}`);
  if ((allVulns['high'] ?? 0) + (allVulns['critical'] ?? 0) > 0) notes.push('Dev-tooling advisories present; review `npm audit` (not shipped in the app bundle).');
} else {
  notes.push('npm audit could not run — vulnerability status unknown.');
}

/* report */
console.log(`Scanned ${files.length} first-party files; ${components.length} dependency packages.`);
console.log(`Licences: ${[...byLicense].sort((a, b) => b[1] - a[1]).map(([l, n]) => `${l}:${n}`).join(', ')}`);
console.log(`Vulnerabilities: ${vulnSummary}`);
console.log('SBOM written to reports/sbom.json');
for (const n of notes) console.log(`note: ${n}`);
if (failures.length) {
  for (const f of failures) console.error(`FAIL: ${f}`);
  process.exitCode = 1;
} else {
  console.log('audit:release PASS');
}

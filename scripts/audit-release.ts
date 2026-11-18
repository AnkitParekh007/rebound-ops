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
/** In CI (or with REBOUND_AUDIT_STRICT=1) an unchecked build or an unavailable audit service fails the gate. */
const strict = process.env['CI'] === 'true' || process.env['REBOUND_AUDIT_STRICT'] === '1';
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

/* 3b. built web app must satisfy the CSP (no inline scripts or event handlers) */
const builtIndex = join(root, 'apps/web/dist/browser/index.html');
if (existsSync(builtIndex)) {
  const html = readFileSync(builtIndex, 'utf8');
  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) failures.push('Built index.html contains an inline <script>, which the CSP blocks.');
  if (/\son[a-z]+\s*=/i.test(html)) failures.push('Built index.html contains an inline event handler, which the CSP blocks.');
} else if (strict) {
  failures.push('Web build not present: run npm run build before npm run audit:release (required in CI).');
} else {
  notes.push('Web build not present; CSP compatibility of the build was not checked (run npm run build first).');
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
type AuditOutcome =
  | { kind: 'ok'; counts: Record<string, number>; advisories: { name: string; severity: string; roots: string[] }[] }
  | { kind: 'unavailable'; reason: string };

/** Runs `npm audit`; an error payload or unparsable output is "unavailable", never "no vulnerabilities". */
function runAudit(args: string[]): AuditOutcome {
  let out: string | undefined;
  let stderr = '';
  try {
    out = execFileSync('npm', ['audit', '--json', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    // npm audit exits non-zero when advisories exist; stdout still holds the report.
    out = (err as { stdout?: string }).stdout;
    stderr = String((err as { stderr?: string }).stderr ?? '');
  }
  if (!out?.trim().startsWith('{')) return { kind: 'unavailable', reason: stderr.split('\n').find((l) => l.trim()) ?? 'no report returned' };
  let report: { error?: { code?: string; summary?: string }; metadata?: { vulnerabilities?: Record<string, number> }; vulnerabilities?: Record<string, { severity: string; via: unknown[] }> };
  try {
    report = JSON.parse(out);
  } catch {
    return { kind: 'unavailable', reason: 'unparsable report' };
  }
  if (report.error) { const e = report.error as Record<string, unknown>; return { kind: 'unavailable', reason: String(e['code'] ?? e['summary'] ?? e['message'] ?? e['detail'] ?? 'npm audit error').split('\n')[0]! }; }
  if (!report.metadata?.vulnerabilities) return { kind: 'unavailable', reason: 'report has no vulnerability metadata' };
  const vulns = report.vulnerabilities ?? {};
  // Resolve each package to the advisories at the root of its chain (a package is often flagged only through a dependency).
  const rootsOf = (name: string, seen = new Set<string>()): string[] => {
    if (seen.has(name)) return [];
    seen.add(name);
    return (vulns[name]?.via ?? []).flatMap((x) =>
      typeof x === 'string' ? rootsOf(x, seen) : [String((x as { url?: string }).url ?? (x as { source?: unknown }).source)],
    );
  };
  const advisories = Object.entries(vulns).map(([name, v]) => ({ name, severity: v.severity, roots: [...new Set(rootsOf(name))] }));
  return { kind: 'ok', counts: report.metadata.vulnerabilities, advisories };
}

/** Reviewed, accepted dev-only advisories (advisory URL -> reason). Runtime advisories can never be accepted here. */
const allowFile = join(root, 'scripts/audit-accepted.json');
const accepted: Record<string, { package: string; reason: string; reviewed: string }> = existsSync(allowFile) ? JSON.parse(readFileSync(allowFile, 'utf8')) : {};

const fmt = (v: Record<string, number>) => Object.entries(v).map(([k, n]) => `${k}=${n}`).join(' ');
const runtimeAudit = runAudit(['--omit=dev']);
const fullAudit = runAudit([]);
let vulnSummary: string;
let auditStatus: 'checked' | 'UNAVAILABLE';
if (runtimeAudit.kind === 'ok' && fullAudit.kind === 'ok') {
  auditStatus = 'checked';
  vulnSummary = `runtime: ${fmt(runtimeAudit.counts)} | including dev tooling: ${fmt(fullAudit.counts)}`;
  if ((runtimeAudit.counts['high'] ?? 0) + (runtimeAudit.counts['critical'] ?? 0) > 0) failures.push(`Runtime dependencies have high/critical advisories: ${fmt(runtimeAudit.counts)}`);
  const runtimeNames = new Set(runtimeAudit.advisories.map((a) => a.name));
  const acceptedUsed = new Set<string>();
  let devFlagged = 0;
  for (const a of fullAudit.advisories) {
    if (runtimeNames.has(a.name)) continue;
    devFlagged++;
    const unaccepted = a.roots.filter((r) => !accepted[r]);
    a.roots.filter((r) => accepted[r]).forEach((r) => acceptedUsed.add(r));
    if (unaccepted.length === 0 && a.roots.length > 0) continue;
    if (a.severity === 'high' || a.severity === 'critical') failures.push(`Unreviewed dev-tooling advisory via ${a.name} (${a.severity}): ${unaccepted.join(', ')}. Fix it or record a reviewed reason in scripts/audit-accepted.json.`);
    else notes.push(`Dev-tooling advisory via ${a.name} (${a.severity}); not shipped in the app bundle.`);
  }
  for (const r of acceptedUsed) notes.push(`Accepted dev-only advisory ${r} (${accepted[r]!.package}): ${accepted[r]!.reason} [reviewed ${accepted[r]!.reviewed}]; ${devFlagged} dev packages flagged through it.`);
} else {
  auditStatus = 'UNAVAILABLE';
  const why = [runtimeAudit, fullAudit].map((a) => (a.kind === 'unavailable' ? a.reason : 'ok')).join(' / ');
  vulnSummary = `UNAVAILABLE — the audit service could not be reached or returned an error (${why}). This is NOT a clean result.`;
  if (strict) failures.push('Vulnerability audit unavailable; CI requires a completed audit.');
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
  console.log(auditStatus === 'checked' ? 'audit:release PASS' : 'audit:release PASS (local checks only — vulnerability audit UNAVAILABLE, re-run when online)');
}

#!/usr/bin/env node
/**
 * CycloneDX 1.5 SBOM for the production dependency graph, generated from
 * package-lock.json (roadmap B7 / gap S2).
 *
 * Why not `npm sbom`: npm 10 omits most npm-workspace dependencies (Angular,
 * RxJS, Zod) for this repo, which would understate what ships. The lockfile
 * already records name, version, resolved URL, integrity, license and the
 * dev/optional flags for every installed package, so it is the authoritative
 * source. Output is deterministic: no random serial, and the timestamp is the
 * source commit time (or SOURCE_DATE_EPOCH).
 *
 * Usage: node scripts/sbom.mjs [--out file] [--commit <sha>]
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const nameFromPath = path => path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);

export function purl(name, version) {
  return 'pkg:npm/' + name.replace(/^@/, '%40') + '@' + version;
}

/** npm integrity (`sha512-<base64>`) → CycloneDX hash entries. */
function hashesFrom(integrity) {
  const algorithms = { sha512: 'SHA-512', sha384: 'SHA-384', sha256: 'SHA-256', sha1: 'SHA-1' };
  return (integrity ?? '').split(/\s+/).filter(Boolean).map(entry => {
    const [alg, b64] = [entry.slice(0, entry.indexOf('-')), entry.slice(entry.indexOf('-') + 1)];
    return algorithms[alg] ? { alg: algorithms[alg], content: Buffer.from(b64, 'base64').toString('hex') } : null;
  }).filter(Boolean);
}

/** Node module resolution inside the lockfile tree: nearest node_modules/<dep> walking up. */
function resolveDep(packages, fromPath, dep) {
  let base = fromPath;
  for (;;) {
    const candidate = (base ? base + '/' : '') + 'node_modules/' + dep;
    if (packages[candidate]) return candidate;
    if (!base) return null;
    const cut = base.lastIndexOf('/node_modules/');
    base = cut === -1 ? '' : base.slice(0, cut);
  }
}

/**
 * Builds the SBOM. Production = lockfile entries not flagged `dev`
 * (devOptional entries are dev-only too). Workspace links are followed to
 * their package folders so workspace dependencies are included.
 */
export function generateSbom(lock, { timestamp, commit } = {}) {
  if (lock.lockfileVersion !== 3) throw new Error('Expected npm lockfile v3.');
  const packages = lock.packages;
  const root = packages[''];
  const refOf = path => {
    const entry = packages[path];
    return purl(entry.name ?? nameFromPath(path), entry.version);
  };

  // Walk the production graph from the root and workspaces.
  const seen = new Map(); // ref -> { path, entry }
  const edges = new Map(); // ref -> Set(ref)
  const queue = [''];
  const visited = new Set();
  while (queue.length) {
    let path = queue.shift();
    if (visited.has(path)) continue;
    visited.add(path);
    let entry = packages[path];
    if (entry?.link) { path = entry.resolved; entry = packages[path]; if (visited.has(path)) continue; visited.add(path); }
    if (!entry) continue;
    const isRoot = path === '';
    const ref = isRoot ? 'root' : refOf(path);
    if (!isRoot && entry.dev) continue;
    if (!isRoot && !seen.has(ref)) seen.set(ref, { path, entry });
    const deps = { ...entry.dependencies, ...entry.optionalDependencies };
    const children = new Set();
    for (const dep of Object.keys(deps)) {
      const target = resolveDep(packages, path, dep);
      if (!target || packages[target].dev) continue;
      const real = packages[target].link ? packages[target].resolved : target;
      if (!packages[real] || packages[real].dev) continue;
      children.add(refOf(real));
      queue.push(target);
    }
    if (isRoot) for (const ws of lock.packages[''].workspaces ?? []) {
      for (const p of Object.keys(packages)) {
        if (!p.includes('node_modules/') && p && new RegExp('^' + ws.replace('*', '[^/]+') + '$').test(p) && !packages[p].dev) {
          children.add(refOf(p)); queue.push(p);
        }
      }
    }
    edges.set(ref, new Set([...(edges.get(ref) ?? []), ...children]));
  }

  const components = [...seen.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([ref, { path, entry }]) => {
    const name = entry.name ?? nameFromPath(path);
    const workspace = !path.includes('node_modules/');
    const component = {
      type: workspace ? 'application' : 'library',
      'bom-ref': ref, name, version: entry.version, purl: ref,
      scope: entry.optional ? 'optional' : 'required'
    };
    if (entry.license) component.licenses = [/[ ()]/.test(entry.license)
      ? { expression: entry.license } : { license: { id: entry.license } }];
    const hashes = hashesFrom(entry.integrity);
    if (hashes.length) component.hashes = hashes;
    if (entry.resolved && !workspace) component.externalReferences = [{ type: 'distribution', url: entry.resolved }];
    return component;
  });

  const rootRef = purl(root.name, root.version);
  const dependencies = [...edges.entries()].map(([ref, deps]) => ({
    ref: ref === 'root' ? rootRef : ref, dependsOn: [...deps].sort()
  })).sort((a, b) => a.ref.localeCompare(b.ref));

  const body = {
    bomFormat: 'CycloneDX', specVersion: '1.5', version: 1,
    metadata: {
      timestamp: timestamp ?? new Date(0).toISOString(),
      tools: { components: [{ type: 'application', name: 'reboundops-lockfile-sbom', version: '1' }] },
      component: { type: 'application', 'bom-ref': rootRef, name: root.name, version: root.version, purl: rootRef,
        ...(commit ? { properties: [{ name: 'reboundops:sourceCommit', value: commit }] } : {}) },
      properties: [{ name: 'reboundops:scope', value: 'production dependencies (npm lockfile, dev excluded); Angular packages ship compiled into dist/web' }]
    },
    components, dependencies
  };
  // Deterministic serial number derived from the content.
  const digest = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const serial = `urn:uuid:${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  return { bomFormat: body.bomFormat, specVersion: body.specVersion, serialNumber: serial, version: 1,
    metadata: body.metadata, components, dependencies };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { values } = parseArgs({ options: { out: { type: 'string' }, commit: { type: 'string' } } });
  const commit = values.commit ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const timestamp = process.env.SOURCE_DATE_EPOCH
    ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
    : new Date(execFileSync('git', ['log', '-1', '--format=%cI', commit], { encoding: 'utf8' }).trim()).toISOString();
  const sbom = generateSbom(JSON.parse(readFileSync('package-lock.json', 'utf8')), { timestamp, commit });
  const json = JSON.stringify(sbom, null, 2) + '\n';
  if (values.out) writeFileSync(values.out, json); else process.stdout.write(json);
  if (values.out) console.log(`SBOM: ${sbom.components.length} production components → ${values.out}`);
}

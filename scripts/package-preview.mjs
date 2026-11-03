#!/usr/bin/env node
/**
 * Creates a local-only, unannounced developer-preview archive from a tested build.
 * No network, credentials, node_modules or user sessions are included.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  lstatSync, readdirSync, readFileSync, writeFileSync, mkdirSync,
  copyFileSync, rmSync
} from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!/^0\.2\.0$/.test(pkg.version)) {
  throw new Error('Preview version must be reviewed before creating a package.');
}
const commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'],
  { cwd: root, encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{12}$/.test(commit)) throw new Error('Invalid source commit.');
const folder = 'reboundops-v' + pkg.version + '-rc1-' + commit;
const outputRoot = join(root, 'dist', 'preview');
const stage = join(outputRoot, folder);
mkdirSync(outputRoot, { recursive: true });
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

const allowlistedSources = [
  'package.json', 'package-lock.json',
  'apps/api/package.json', 'apps/web/package.json',
  'packages/contracts/package.json',
  'LICENSE', 'SECURITY.md',
  'docs/preview-quickstart.md', 'docs/preview-release-notes.md',
  'docs/privacy.md', 'docs/local-persistence.md',
  'docs/dependency-security-review.md', 'docs/preview-security-review.md',
  'docs/preview-manual-qa.md',
  'examples/fictional-journeys.md',
  'scripts/verify-preview.mjs'
];
const builtDirectories = [
  'dist/api', 'dist/web/browser', 'packages/contracts/dist'
];
const allowedFiles = [];

function validateRegular(path) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('Refusing nonregular or symlinked package input: ' + relative(root, path));
  }
}

function copy(fromRelative, toRelative = fromRelative) {
  const source = join(root, fromRelative);
  validateRegular(source);
  const output = join(stage, toRelative);
  mkdirSync(dirname(output), { recursive: true });
  copyFileSync(source, output);
  allowedFiles.push(toRelative.replaceAll(sep, '/'));
}

function copyTree(directory) {
  const source = join(root, directory);
  const stat = lstatSync(source);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error('Missing or unsafe build directory: ' + directory);
  }
  for (const item of readdirSync(source, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isSymbolicLink()) throw new Error('Build symlink is not allowed: ' + path);
    if (item.isDirectory()) copyTree(path);
    else if (item.isFile() && !item.name.endsWith('.map')) copy(path);
    else if (!item.isFile()) throw new Error('Unsupported build entry: ' + path);
  }
}

for (const file of allowlistedSources) copy(file);
for (const dir of builtDirectories) copyTree(dir);
const requiredBuild = [
  'dist/api/server.js',
  'dist/api/app.js',
  'dist/web/browser/index.html',
  'packages/contracts/dist/index.js'
];
for (const required of requiredBuild) {
  if (!allowedFiles.includes(required)) throw new Error('Required build asset missing: ' + required);
}
const files = {};
for (const path of allowedFiles.sort()) {
  if (files[path]) throw new Error('Duplicate package file: ' + path);
  files[path] = createHash('sha256').update(readFileSync(join(stage, path))).digest('hex');
}
const manifest = {
  formatVersion: 1, name: folder, version: pkg.version,
  releaseStage: 'UNPUBLISHED_DEVELOPER_CANDIDATE',
  sourceCommit: commit, buildRequiresNode: '24.x',
  privacy: 'localhost only; no personal data; AI disabled unless separately configured',
  files
};
writeFileSync(join(stage, 'preview-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const archive = join(outputRoot, folder + '.tar.gz');
execFileSync('tar', ['-czf', archive, '-C', outputRoot, basename(stage)]);
const checksum = createHash('sha256').update(readFileSync(archive)).digest('hex');
writeFileSync(archive + '.sha256', checksum + '  ' + basename(archive) + '\n');
console.log('Preview candidate prepared locally: ' + relative(root, archive));
console.log('Archive SHA-256: ' + checksum);
console.log('No GitHub Release, deployment, npm publication or participant data was created.');

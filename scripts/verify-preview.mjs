#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const archiveRoot = process.cwd();
const manifest = JSON.parse(readFileSync(join(archiveRoot, 'preview-manifest.json'), 'utf8'));
if (manifest.formatVersion !== 1 || !manifest.files ||
    manifest.releaseStage !== 'UNPUBLISHED_DEVELOPER_CANDIDATE' ||
    !/^[0-9a-f]{12}$/.test(manifest.sourceCommit)) {
  throw new Error('Unsupported or malformed preview manifest.');
}
let count = 0;
for (const [path, checksum] of Object.entries(manifest.files)) {
  if (typeof checksum !== 'string' || !/^[a-f0-9]{64}$/.test(checksum) ||
      path.startsWith('/') || path.split('/').some(p => p === '..' || p === '.')) {
    throw new Error('Unsafe preview file path or hash.');
  }
  const target = resolve(archiveRoot, path);
  if (!target.startsWith(archiveRoot + sep)) throw new Error('Path escapes preview directory.');
  const stat = lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Package file is not regular: ' + path);
  const actual = createHash('sha256').update(readFileSync(target)).digest('hex');
  if (checksum !== actual) throw new Error('Preview integrity check failed: ' + path);
  count++;
}
for (const expected of ['LICENSE', 'package-lock.json', 'dist/api/server.js',
  'dist/web/browser/index.html', 'packages/contracts/dist/index.js']) {
  if (!manifest.files[expected]) throw new Error('Missing expected file: ' + expected);
}
console.log('Verified ' + count + ' packaged file hashes for ' + manifest.name +
  '. This does not prove source authenticity or eliminate dependency risks.');

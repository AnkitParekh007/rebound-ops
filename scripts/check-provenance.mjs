import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
// Git checkouts on Windows may use CRLF; compare notice text consistently.
const read = file => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const ledger = JSON.parse(read('provenance.json'));

assert.equal(ledger.schemaVersion, 2);
assert.equal(ledger.repository, 'https://github.com/AnkitParekh007/rebound-ops');
assert(ledger.maintainer && ledger.maintainer.length > 0);

for (const component of ledger.components) {
  assert(existsSync(path.join(root, component.path)), `Missing component path: ${component.path}`);
  assert.equal(component.license, 'MIT');
  assert(Array.isArray(component.authors) && component.authors.length > 0);
  assert(Array.isArray(component.notices) && component.notices.length > 0);
  for (const file of component.notices) {
    assert(existsSync(path.join(root, file)), `Missing notice file: ${file}`);
  }
}

const notices = read('THIRD_PARTY_NOTICES.md');
assert.match(notices, /npm and build dependencies/i);
assert.match(notices, /dependency-security-review/);
assert.equal(
  read('workspace/public/legal/third-party-notices.txt'),
  notices,
  'The browser and standalone package must ship the current complete notices'
);
assert.match(read('workspace/THIRD_PARTY_NOTICES.md'), /MIT License|MIT-licensed|MIT/);
assert.match(read('workspace/LICENSE'), /Ankit Parekh/);
assert.match(read('engine/LICENSE'), /Ankit Parekh/);

for (const file of ['engine/AGENTS.md', 'engine/README.md', 'workspace/README.md']) {
  const text = read(file);
  assert(
    !/740\s+(?:listings|offers)|first reference implementation|project where it was born/i.test(text),
    `Misattributed origin claim: ${file}`
  );
  assert(
    !/github\.com\/Fighter90\/career-ops-ui|github\.com\/career-ops-hq\/career-ops/i.test(text),
    `Retired upstream URL present in ${file}`
  );
}

assert(
  !/Read it, sign it|sign it if you want|The ReboundOps Manifesto/.test(read('engine/update-system.mjs')),
  'Updater must not solicit signatures for a rebranded manifesto'
);
assert(!existsSync(path.join(root, 'workspace/site')), 'The retired Astro landing site must not become the active marketing source again');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packed = JSON.parse(execFileSync(
  npm,
  ['pack', '--dry-run', '--json', '--ignore-scripts', '--cache', path.join(tmpdir(), 'reboundops-pack-cache')],
  { cwd: path.join(root, 'workspace'), encoding: 'utf8', shell: process.platform === 'win32' }
));
const files = packed[0].files.map(file => file.path);
for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'public/legal/third-party-notices.txt']) {
  assert(files.includes(file), `Missing packaged attribution: ${file}`);
}

console.log('Provenance checks passed: ledger, notices and workspace package attribution are consistent.');

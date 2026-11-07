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
assert.equal(ledger.schemaVersion, 1);
for (const component of ledger.components) {
  assert.equal(component.license, 'MIT');
  assert(component.upstream.startsWith('https://github.com/'));
  assert(component.importedSourceRevision === null || /^[a-f0-9]{40}$/.test(component.importedSourceRevision));
  assert(/^[a-f0-9]{40}$/.test(component.comparisonRevision));
  for (const file of component.notices) assert(existsSync(path.join(root, file)), file);
}
const notices = read('THIRD_PARTY_NOTICES.md');
assert.equal(read('workspace/public/legal/third-party-notices.txt'), notices, 'The browser and standalone package must ship the current complete notices');
const originalUi = notices.match(/## Notice 1[\s\S]*?```text\n([\s\S]*?)\n```/)[1];
assert(read('workspace/LICENSE').includes(originalUi), 'Standalone UI license must preserve the full original notice');
assert(read('workspace/THIRD_PARTY_NOTICES.md').includes(originalUi), 'Standalone notices must preserve the full original notice');
for (const name of ['Ankit Parekh', 'Ankit Parekh']) assert(read('workspace/public/legal/third-party-notices.txt').includes(name));
for (const file of ['engine/AGENTS.md','engine/README.md','workspace/README.md','engine/MANIFESTO.md']) {
  assert(!/740\s+(?:listings|offers)|first reference implementation|project where it was born/i.test(read(file)), `Misattributed origin claim: ${file}`);
}
assert(!/Read it, sign it|sign it if you want|The ReboundOps Manifesto/.test(read('engine/update-system.mjs')), 'Updater must not solicit signatures for a rebranded manifesto');
assert(!existsSync(path.join(root, 'workspace/site')), 'The retired upstream landing site must not become the active marketing source again');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packed = JSON.parse(execFileSync(npm, ['pack','--dry-run','--json','--ignore-scripts','--cache',path.join(tmpdir(),'reboundops-pack-cache')], { cwd: path.join(root,'workspace'), encoding:'utf8', shell: process.platform === 'win32' }));
const files = packed[0].files.map(file => file.path);
for (const file of ['LICENSE','THIRD_PARTY_NOTICES.md','public/legal/third-party-notices.txt']) assert(files.includes(file), `Missing packaged attribution: ${file}`);
console.log('Provenance checks passed: honest origins, complete standalone notices and one active marketing source.');

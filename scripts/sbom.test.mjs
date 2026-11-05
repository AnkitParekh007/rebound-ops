import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateSbom, purl } from './sbom.mjs';

const integrity = 'sha512-' + Buffer.alloc(64, 1).toString('base64');
const lock = {
  lockfileVersion: 3,
  packages: {
    '': { name: 'app', version: '1.0.0', license: 'MIT', workspaces: ['pkgs/*'],
      dependencies: { runtime: '^1' }, devDependencies: { tooling: '^1' } },
    'pkgs/web': { name: '@app/web', version: '1.0.0', license: 'MIT', dependencies: { '@scope/ui': '^2' } },
    'node_modules/@app/web': { resolved: 'pkgs/web', link: true },
    'node_modules/runtime': { version: '1.2.3', license: '(MIT OR Apache-2.0)', integrity,
      resolved: 'https://registry.npmjs.org/runtime/-/runtime-1.2.3.tgz', dependencies: { shared: '^1' } },
    'node_modules/runtime/node_modules/shared': { version: '1.0.0', license: 'ISC', integrity },
    'node_modules/shared': { version: '2.0.0', license: 'ISC', integrity, dev: true },
    'node_modules/@scope/ui': { version: '2.0.0', license: 'BSD-3-Clause', integrity, optional: true },
    'node_modules/tooling': { version: '9.9.9', license: 'MIT', integrity, dev: true }
  }
};

test('includes production and workspace dependencies, excludes dev-only packages', () => {
  const sbom = generateSbom(lock, { timestamp: '2026-11-05T00:00:00.000Z', commit: 'abc' });
  const ids = sbom.components.map(c => c.name + '@' + c.version).sort();
  assert.deepEqual(ids, ['@app/web@1.0.0', '@scope/ui@2.0.0', 'runtime@1.2.3', 'shared@1.0.0']);
  assert.equal(sbom.components.find(c => c.name === '@scope/ui').scope, 'optional');
  assert.equal(sbom.components.find(c => c.name === '@app/web').type, 'application');
});

test('resolves nested node_modules like Node does (nearest copy wins)', () => {
  const sbom = generateSbom(lock);
  const runtime = sbom.dependencies.find(d => d.ref === purl('runtime', '1.2.3'));
  assert.deepEqual(runtime.dependsOn, [purl('shared', '1.0.0')]);
  const root = sbom.dependencies.find(d => d.ref === purl('app', '1.0.0'));
  assert.deepEqual(root.dependsOn, [purl('@app/web', '1.0.0'), purl('runtime', '1.2.3')]);
});

test('maps licenses, integrity hashes, purls and distribution URLs', () => {
  const sbom = generateSbom(lock);
  const runtime = sbom.components.find(c => c.name === 'runtime');
  assert.deepEqual(runtime.licenses, [{ expression: '(MIT OR Apache-2.0)' }]);
  assert.deepEqual(sbom.components.find(c => c.name === 'shared').licenses, [{ license: { id: 'ISC' } }]);
  assert.deepEqual(runtime.hashes, [{ alg: 'SHA-512', content: '01'.repeat(64) }]);
  assert.equal(purl('@scope/ui', '2.0.0'), 'pkg:npm/%40scope/ui@2.0.0');
  assert.equal(runtime.externalReferences[0].url, 'https://registry.npmjs.org/runtime/-/runtime-1.2.3.tgz');
});

test('is deterministic, CycloneDX 1.5 shaped and records the source commit', () => {
  const a = generateSbom(lock, { timestamp: '2026-11-05T00:00:00.000Z', commit: 'abc' });
  const b = generateSbom(structuredClone(lock), { timestamp: '2026-11-05T00:00:00.000Z', commit: 'abc' });
  assert.deepEqual(a, b);
  assert.equal(a.bomFormat, 'CycloneDX');
  assert.equal(a.specVersion, '1.5');
  assert.match(a.serialNumber, /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.deepEqual(a.metadata.component.properties, [{ name: 'reboundops:sourceCommit', value: 'abc' }]);
  assert.throws(() => generateSbom({ ...lock, lockfileVersion: 2 }), /lockfile v3/);
});

test('the real lockfile yields a production-only SBOM with licenses for every component', () => {
  const sbom = generateSbom(JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8')));
  const names = new Set(sbom.components.map(c => c.name));
  for (const shipped of ['fastify', '@fastify/static', 'zod', '@anthropic-ai/sdk', '@angular/core', 'rxjs', '@reboundops/contracts']) {
    assert.ok(names.has(shipped), 'missing shipped package ' + shipped);
  }
  for (const devOnly of ['vitest', 'jsdom', 'typescript', '@playwright/test', '@angular/cli', 'tsx']) {
    assert.ok(!names.has(devOnly), 'dev-only package leaked into SBOM: ' + devOnly);
  }
  assert.deepEqual(sbom.components.filter(c => !c.licenses).map(c => c.name), []);
});

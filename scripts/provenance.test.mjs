import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
test('distributed workspace includes notices and provenance ledger stays consistent', () => {
  const output = execFileSync(process.execPath, [fileURLToPath(new URL('./check-provenance.mjs', import.meta.url))], { encoding:'utf8' });
  assert.match(output, /Provenance checks passed/);
});

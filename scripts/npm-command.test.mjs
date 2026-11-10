import test from 'node:test';
import assert from 'node:assert/strict';
import { npmCommand } from './npm-command.mjs';

test('Windows fork without npm_execpath resolves the bundled CLI without a shell', () => {
  const node = 'C:\\Program Files\\nodejs\\node.exe';
  const cli = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js';
  const result = npmCommand({}, node, 'win32', candidate => candidate === cli);
  assert.equal(result.program, node); assert.deepEqual(result.prefix, [cli]);
  assert.equal(result.env.npm_execpath, cli);
  assert.equal(result.shell, undefined);
});
test('npm start CLI is propagated to preparation and caller environment is not changed', () => {
  const env = { npm_execpath: '/custom/npm-cli.js' };
  const result = npmCommand(env, '/node', 'linux', candidate => candidate === env.npm_execpath);
  assert.deepEqual(result.prefix, [env.npm_execpath]); assert.notEqual(result.env, env);
});
test('Windows refuses a missing CLI instead of falling back to cmd.exe', () => {
  assert.throws(() => npmCommand({}, 'C:\\node.exe', 'win32', () => false), /npm-cli.js/);
  assert.equal(npmCommand({}, '/node', 'linux', () => false).program, 'npm');
});

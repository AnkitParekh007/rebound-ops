import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const launcher = new URL('./start-demo.sh', import.meta.url).pathname;

test('launcher default strips keys, explicit opt-in passes the key only to recovery API, and --no-ai overrides it', { skip: process.platform === 'win32' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'rebound-launcher-'));
  try {
    const log = join(dir, 'children.log');
    writeFileSync(join(dir, 'npm'), '#!/bin/sh\nexit 0\n', { mode: 0o700 });
    writeFileSync(join(dir, 'curl'), '#!/bin/sh\nexit 0\n', { mode: 0o700 });
    writeFileSync(join(dir, 'node'), '#!/bin/sh\nprintf "%s|%s|%s\\n" "$PWD" "$REBOUNDOPS_AI_ENABLED" "${ANTHROPIC_API_KEY:+present}" >> "$LAUNCHER_TEST_LOG"\n', { mode: 0o700 });
    const env = { ...process.env, PATH: dir + ':' + process.env.PATH, LAUNCHER_TEST_LOG: log,
      ANTHROPIC_API_KEY: 'fictional-key-for-process-isolation-test', REBOUNDOPS_AI_ENABLED: 'false' };
    for (const [args, flag, key, envFlag = 'false'] of [[[], 'true', 'present', 'true'], [[], 'false', ''], [['--ai'], 'true', 'present'], [['--ai','--no-ai'], 'false','']]) {
      writeFileSync(log, '');
      const result = spawnSync('bash', [launcher, ...args], { env: { ...env, REBOUNDOPS_AI_ENABLED: envFlag }, encoding: 'utf8', timeout: 5000 });
      assert.equal(result.status, 0, result.stderr);
      assert(!result.stdout.includes(env.ANTHROPIC_API_KEY));
      const lines=readFileSync(log,'utf8').trim().split('\n');
      assert(lines.some(line=>line.endsWith(`/apps/api|${flag}|${key}`)), lines.join('\n'));
      assert(lines.some(line=>line.endsWith(`/workspace|${flag}|`)), lines.join('\n'));
    }
    assert.equal(spawnSync('bash',[launcher,'--ai'],{env:{...env,ANTHROPIC_API_KEY:''}}).status,2);
    assert.equal(spawnSync('bash',[launcher,'--unknown'],{env}).status,2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

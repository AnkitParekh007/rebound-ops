import test from 'node:test';
import assert from 'node:assert/strict';
import { launcherEnvironments } from './start.mjs';

test('launcher sends the recovery key only to the recovery API after explicit opt-in', () => {
  const base = { ANTHROPIC_API_KEY: 'fictional', OPENAI_API_KEY: 'fictional-workspace-key' };
  for (const [args, envFlag, enabled] of [
    [[], undefined, false],
    [[], 'true', true],
    [['--ai'], 'false', true],
    [['--ai', '--no-ai'], 'true', false]
  ]) {
    const { clean, recovery } = launcherEnvironments({ ...base, REBOUNDOPS_AI_ENABLED: envFlag }, args);
    assert.equal(clean.REBOUNDOPS_AI_ENABLED, String(enabled));
    assert.equal(clean.ANTHROPIC_API_KEY, undefined);
    assert.equal(clean.OPENAI_API_KEY, undefined);
    assert.equal(recovery.ANTHROPIC_API_KEY, enabled ? base.ANTHROPIC_API_KEY : undefined);
    assert.equal(recovery.OPENAI_API_KEY, undefined);
  }
  assert.throws(() => launcherEnvironments({}, ['--ai']), /ANTHROPIC_API_KEY/);
  assert.throws(() => launcherEnvironments(base, ['--unknown']), /Unknown option/);
});

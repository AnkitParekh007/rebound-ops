// The engine's prefill answer policy mirrors three enums from
// @reboundops/contracts because the engine has no build step (roadmap gap C2).
// This fails as soon as one side changes without the other.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ANSWER_SOURCES, SENSITIVE_CATEGORIES, ANSWER_HOLD_REASONS } from '../packages/contracts/dist/index.js';
import * as engine from '../engine/web/src/lib/apply/answer-policy.mjs';

test('engine answer policy enums match the operations contracts', () => {
  assert.deepEqual([...engine.ANSWER_SOURCES], [...ANSWER_SOURCES]);
  assert.deepEqual([...engine.SENSITIVE_CATEGORIES], [...SENSITIVE_CATEGORIES]);
  assert.deepEqual([...engine.ANSWER_HOLD_REASONS], [...ANSWER_HOLD_REASONS]);
});

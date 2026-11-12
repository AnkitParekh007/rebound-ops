import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEATURE_FLAGS,
  FEATURE_FLAG_ENV,
  resolveFeatureFlags,
  AnswerProposalSchema,
  FillResultSchema,
  FieldDescriptorSchema
} from '../dist/index.js';

test('every operations flag is off when nothing is configured', () => {
  const { enabled, unknown } = resolveFeatureFlags({});
  assert.ok(Object.keys(FEATURE_FLAGS).length >= 14);
  for (const [name, on] of Object.entries(enabled)) assert.equal(on, false, `${name} must default off`);
  assert.deepEqual(unknown, []);
});

test('flags turn on only by exact name; unknown names are reported, not enabled', () => {
  const { enabled, unknown } = resolveFeatureFlags({ [FEATURE_FLAG_ENV]: ' autofill, AutoApply ,nope,,nope' });
  assert.equal(enabled.autofill, true);
  assert.equal(enabled.autoApply, false, 'matching is case-sensitive');
  assert.deepEqual(unknown, ['AutoApply', 'nope']);
});

test('every one of the seven features has at least one flag', () => {
  const features = new Set(Object.values(FEATURE_FLAGS).map((m) => m.feature));
  assert.deepEqual([...features].sort(), [1, 2, 3, 4, 5, 6, 7]);
});

const base = { fieldId: 'f1', value: '', source: 'unresolved', needsConfirmation: true, sensitiveCategory: null, holdReason: 'no_answer' };

test('an unresolved answer cannot carry a value', () => {
  assert.equal(AnswerProposalSchema.safeParse(base).success, true);
  assert.equal(AnswerProposalSchema.safeParse({ ...base, value: 'Yes' }).success, false);
});

test('a sensitive answer cannot come from a model draft', () => {
  const draft = { ...base, value: 'Yes', source: 'model_draft', sensitiveCategory: 'sponsorship', holdReason: null, needsConfirmation: false };
  assert.equal(AnswerProposalSchema.safeParse(draft).success, false);
  assert.equal(AnswerProposalSchema.safeParse({ ...draft, source: 'profile_fact' }).success, true);
});

test('a held answer must ask the person to confirm', () => {
  assert.equal(AnswerProposalSchema.safeParse({ ...base, needsConfirmation: false }).success, false);
});

test('field descriptors and fill results reject unknown types and outcomes', () => {
  assert.equal(FieldDescriptorSchema.safeParse({ id: 'a', type: 'text', label: 'Name', required: true }).success, true);
  assert.equal(FieldDescriptorSchema.safeParse({ id: 'a', type: 'html', label: 'x', required: false }).success, false);
  assert.equal(FillResultSchema.safeParse({ fieldId: 'a', outcome: 'accepted' }).success, true);
  assert.equal(FillResultSchema.safeParse({ fieldId: 'a', outcome: 'submitted' }).success, false);
});

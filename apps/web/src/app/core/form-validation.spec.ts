import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { AddJobTargetSchema, CorrectionSchema, EvidenceSchema, IntakeSchema } from '@reboundops/contracts';
import { contractValidator, fieldError, linesValidator, nonEmptyLines } from './form-validation';

const errorOf = (schema: Parameters<typeof contractValidator>[0], value: unknown) =>
  contractValidator(schema)(new FormControl(value))?.['contract'] ?? null;

describe('contractValidator (shared Zod contracts → Angular)', () => {
  it('accepts values the API accepts', () => {
    expect(errorOf(IntakeSchema.shape.role, 'Engineer')).toBeNull();
    expect(errorOf(IntakeSchema.shape.weeklyHours, 20)).toBeNull();
    expect(errorOf(AddJobTargetSchema.shape.sourceUrl, '')).toBeNull();
  });

  it('turns contract failures into readable messages', () => {
    expect(errorOf(IntakeSchema.shape.role, '   ')).toBe('This field is required.'); // trimmed like the API
    expect(errorOf(IntakeSchema.shape.role, 'x'.repeat(121))).toBe('Use at most 120 characters.');
    expect(errorOf(IntakeSchema.shape.weeklyHours, 0)).toBe('Enter 1 or more.');
    expect(errorOf(IntakeSchema.shape.weeklyHours, 21)).toBe('Enter 20 or less.');
    expect(errorOf(IntakeSchema.shape.weeklyHours, 2.5)).toBe('Enter a whole number.');
    expect(errorOf(IntakeSchema.shape.weeklyHours, null)).toBe('Enter a whole number.');
    expect(errorOf(CorrectionSchema.shape.reason, 'ab')).toBe('Use at least 3 characters.');
    expect(errorOf(IntakeSchema.shape.urgency, 'never')).toBe('Choose one of the listed options.');
  });

  it('keeps custom contract messages such as the HTTPS rule', () => {
    expect(errorOf(AddJobTargetSchema.shape.sourceUrl, 'http://example.org')).toBe('Source URL must use HTTPS');
  });
});

describe('linesValidator', () => {
  const validator = linesValidator({
    min: 1, max: 3, item: EvidenceSchema.shape.claim, tooFew: 'too few', tooMany: 'too many', itemLabel: 'Line'
  });
  const run = (text: string) => validator(new FormControl(text))?.['lines'] ?? null;

  it('counts only non-empty trimmed lines', () => {
    expect(nonEmptyLines(' a \n\n b\r\n')).toEqual(['a', 'b']);
    expect(run('a\n\nb')).toBeNull();
  });

  it('enforces line count and per-line contract rules', () => {
    expect(run('   ')).toBe('too few');
    expect(run('a\nb\nc\nd')).toBe('too many');
    expect(run('ok\n' + 'x'.repeat(501))).toBe('Line 2: Use at most 500 characters.');
  });
});

describe('fieldError', () => {
  it('stays silent until the user interacts or submits', () => {
    const control = new FormControl('', { validators: contractValidator(IntakeSchema.shape.role) });
    expect(control.invalid).toBe(true);
    expect(fieldError(control)).toBeNull();
    control.markAsTouched();
    expect(fieldError(control)).toBe('This field is required.');
  });
});

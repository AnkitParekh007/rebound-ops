import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Bridges the shared Zod contracts (@reboundops/contracts) to Angular typed
 * forms, so the browser validates with exactly the rules the API enforces.
 * Structural typing keeps `zod` out of this package's direct dependencies.
 */
interface Issue {
  code: string;
  message: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  origin?: string;
  expected?: string;
}
export interface SafeParser {
  safeParse(value: unknown): { success: true } | { success: false; error: { issues: Issue[] } };
}

/** Turns one Zod issue into short, human text (Zod's defaults are developer-facing). */
export function describeIssue(issue: Issue): string {
  const min = Number(issue.minimum);
  const max = Number(issue.maximum);
  switch (issue.code) {
    case 'too_small':
      if (issue.origin === 'string') return min <= 1 ? 'This field is required.' : `Use at least ${min} characters.`;
      if (issue.origin === 'number') return `Enter ${min} or more.`;
      if (issue.origin === 'array') return `Add at least ${min}.`;
      return 'This value is too small.';
    case 'too_big':
      if (issue.origin === 'string') return `Use at most ${max} characters.`;
      if (issue.origin === 'number') return `Enter ${max} or less.`;
      if (issue.origin === 'array') return `Use at most ${max}.`;
      return 'This value is too large.';
    case 'invalid_type':
      return issue.expected === 'int' || issue.expected === 'number' ? 'Enter a whole number.' : 'This value is not valid.';
    case 'invalid_format':
      return 'This value is not in the expected format.';
    case 'invalid_value':
      return 'Choose one of the listed options.';
    case 'custom':
      return issue.message || 'This value is not valid.';
    default:
      return issue.message || 'This value is not valid.';
  }
}

/** Angular validator backed by a contract schema. Error key: `contract`. */
export function contractValidator(schema: SafeParser): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const result = schema.safeParse(control.value);
    return result.success ? null : { contract: describeIssue(result.error.issues[0] ?? { code: 'custom', message: '' }) };
  };
}

/** Splits multi-line input the same way the components submit it. */
export function nonEmptyLines(text: string | null | undefined): string[] {
  return (text ?? '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

/**
 * Validates "one item per line" text: line count within [min, max] and each
 * line accepted by the item schema. Messages match what users see on submit.
 */
export function linesValidator(options: {
  min: number; max: number; item: SafeParser; tooFew: string; tooMany: string; itemLabel: string;
}): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const lines = nonEmptyLines(control.value as string);
    if (lines.length < options.min) return { lines: options.tooFew };
    if (lines.length > options.max) return { lines: options.tooMany };
    const bad = lines.findIndex(line => !options.item.safeParse(line).success);
    if (bad >= 0) {
      const result = options.item.safeParse(lines[bad]);
      const reason = result.success ? '' : ' ' + describeIssue(result.error.issues[0]!);
      return { lines: `${options.itemLabel} ${bad + 1}:${reason}` };
    }
    return null;
  };
}

/** The message to show under a control, once the user has interacted with it or tried to submit. */
export function fieldError(control: AbstractControl): string | null {
  if (!control.invalid || !(control.touched || control.dirty)) return null;
  const errors = control.errors ?? {};
  return (errors['contract'] ?? errors['lines'] ?? errors['custom'] ?? 'This value is not valid.') as string;
}

/** User-facing summary used when a form is submitted with invalid fields. */
export const FORM_INVALID_MESSAGE = 'Please review the form values and source claims.';

import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { describeFailure, staleSessionFrom } from './error-messages';

const http = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

describe('describeFailure', () => {
  it('maps known API error codes to user-facing text', () => {
    expect(describeFailure(http(400, { error: 'INVALID_REQUEST' }))).toBe('Please review the form values and source claims.');
    expect(describeFailure(http(400, { error: 'BACKUP_FROM_NEWER_VERSION' }))).toMatch(/newer ReboundOps version/);
    expect(describeFailure(http(400, { error: 'INVALID_BACKUP' }))).toMatch(/not a valid ReboundOps backup/);
  });

  it('prefers the server message for invalid transitions, with a safe fallback', () => {
    expect(describeFailure(http(400, { error: 'INVALID_TRANSITION', message: 'Quote not found.' }))).toBe('Quote not found.');
    expect(describeFailure(http(400, { error: 'INVALID_TRANSITION' }))).toMatch(/could not be saved/);
  });

  it('falls back to the code, then a generic message, and handles non-HTTP errors', () => {
    expect(describeFailure(http(503, { error: 'LOCAL_STORAGE_UNAVAILABLE' }))).toBe('LOCAL_STORAGE_UNAVAILABLE');
    expect(describeFailure(http(0, null))).toBe('The local API request failed.');
    expect(describeFailure(new Error('Use at most 15 evidence lines.'))).toBe('Use at most 15 evidence lines.');
    expect(describeFailure('weird')).toBe('An unexpected error occurred.');
  });
});

describe('staleSessionFrom', () => {
  it('returns the latest session only for 409 responses that carry one', () => {
    expect(staleSessionFrom(http(409, { error: 'STALE_REVISION', session: { id: 'x' } }))).toEqual({ id: 'x' });
    expect(staleSessionFrom(http(409, { error: 'STALE_PREVIEW' }))).toBeNull();
    expect(staleSessionFrom(http(400, { session: { id: 'x' } }))).toBeNull();
    expect(staleSessionFrom(new Error('nope'))).toBeNull();
  });
});

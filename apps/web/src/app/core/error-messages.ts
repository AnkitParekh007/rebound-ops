import { HttpErrorResponse } from '@angular/common/http';

/** Maps a failed mutation to user-facing text. Pure, so it can be unit-tested. */
export function describeFailure(failure: unknown): string {
  if (failure instanceof HttpErrorResponse) {
    const code = failure.error?.error;
    switch (code) {
      case 'INVALID_REQUEST':
        return 'Please review the form values and source claims.';
      case 'BACKUP_FROM_NEWER_VERSION':
        return 'This backup was created by a newer ReboundOps version. Upgrade ReboundOps to open it; the file was not changed.';
      case 'INVALID_BACKUP':
        return 'This file is not a valid ReboundOps backup, or it failed integrity checks. The file was not changed.';
      case 'INVALID_TRANSITION':
        return failure.error?.message || 'This change could not be saved. Review the evidence and try again.';
      default:
        return code || 'The local API request failed.';
    }
  }
  return failure instanceof Error ? failure.message : 'An unexpected error occurred.';
}

/** Returns the server's latest session when a mutation lost an optimistic-revision race. */
export function staleSessionFrom<T>(failure: unknown): T | null {
  return failure instanceof HttpErrorResponse && failure.status === 409 && failure.error?.session
    ? failure.error.session as T
    : null;
}

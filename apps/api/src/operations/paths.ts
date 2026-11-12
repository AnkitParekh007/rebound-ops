import { join } from 'node:path';

/**
 * Where the operations store lives, relative to REBOUNDOPS_DATA_DIR. Kept
 * apart from store.ts so a caller can check for the file without loading
 * `node:sqlite`.
 */
export const OPERATIONS_STORE_RELATIVE_PATH = join('operations', 'operations.sqlite');

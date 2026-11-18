/**
 * Restores a ReboundOps backup (.sqlite, from Settings → Download a backup).
 *
 *   npm run restore -- <backup-file> [--data-dir <dir>] [--yes]
 *
 * Stop ReboundOps first. The backup is validated in a scratch copy, then the
 * current database is renamed to `reboundops.sqlite.pre-restore-<time>` (never
 * deleted) and the backup takes its place. Without --yes it only checks the
 * backup and reports what it contains.
 */
import { resolve } from 'node:path';
import { BackupError, restoreBackup, verifyBackup } from '@reboundops/storage';
import { loadConfig } from '../apps/api/src/config.ts';

const args = process.argv.slice(2);
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--data-dir');
const dirFlag = args.indexOf('--data-dir');
const dataDir = dirFlag >= 0 && args[dirFlag + 1] ? resolve(args[dirFlag + 1]!) : loadConfig().dataDir;
const confirmed = args.includes('--yes');

if (!file) {
  console.error('Usage: npm run restore -- <backup-file> [--data-dir <dir>] [--yes]');
  process.exit(2);
}

try {
  if (!confirmed) {
    const check = verifyBackup(resolve(file), dataDir);
    console.log(`Backup is valid (schema ${check.schemaVersion}).`);
    console.log(`Contains: ${Object.entries(check.counts).map(([k, n]) => `${k} ${n}`).join(', ')}`);
    console.log(`Nothing was changed. To replace the data in ${dataDir}, run again with --yes (ReboundOps must be stopped).`);
  } else {
    const r = restoreBackup(resolve(file), dataDir);
    console.log(`Restored into ${r.restoredTo}.`);
    console.log(`Contains: ${Object.entries(r.counts).map(([k, n]) => `${k} ${n}`).join(', ')}`);
    console.log(r.previousSavedAs ? `Your previous data was kept at ${r.previousSavedAs}` : 'There was no previous data to keep.');
  }
} catch (err) {
  if (err instanceof BackupError) {
    console.error(`Restore stopped: ${err.message}`);
    process.exit(1);
  }
  throw err;
}

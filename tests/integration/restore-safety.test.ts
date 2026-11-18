/**
 * Restore crash-safety, exclusive locking across processes, and password-protected backups.
 * Real on-disk SQLite files; synthetic marker data only.
 */
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import {
  acquireLock,
  BackupError,
  DATABASE_FILE,
  decryptBackupFile,
  encryptBackupFile,
  isEncryptedBackup,
  openStore,
  readEncryptedHeader,
  recoverInterruptedRestore,
  RESTORE_JOURNAL,
  restoreBackup,
  verifyBackup,
} from '@reboundops/storage';

const dirs: string[] = [];
const tempDir = (p: string) => {
  const d = mkdtempSync(join(tmpdir(), p));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const FAST_KDF = { N: 1 << 14, r: 8, p: 1 };

/** Creates a database with a marker row and returns its directory. */
function makeDb(marker: string): string {
  const dir = tempDir('rbo-rs-');
  const s = openStore({ dataDir: dir });
  s.db.prepare("INSERT INTO kv (key, value, updated_at) VALUES ('test_marker', ?, '2026-01-01')").run(JSON.stringify(marker));
  s.close();
  return dir;
}

function snapshot(marker: string): string {
  const dir = makeDb(marker);
  const s = openStore({ dataDir: dir });
  const out = join(tempDir('rbo-rs-bak-'), 'backup.sqlite');
  s.backupTo(out);
  s.close();
  return out;
}

function markerOf(dir: string): string | null {
  const db = new DatabaseSync(join(dir, DATABASE_FILE), { readOnly: true });
  try {
    const row = db.prepare("SELECT value FROM kv WHERE key = 'test_marker'").get() as { value: string } | undefined;
    return row ? (JSON.parse(row.value) as string) : null;
  } finally {
    db.close();
  }
}

describe('restore is failure-safe', () => {
  it.each(['afterStage', 'afterMoveAside', 'beforeFinalRename'] as const)('a failure at %s leaves the original database in place', (step) => {
    const live = makeDb('original');
    const backup = snapshot('from-backup');
    expect(() =>
      restoreBackup(backup, live, { faults: { [step]: () => { throw new Error('simulated I/O failure'); } } }),
    ).toThrow(BackupError);
    expect(markerOf(live)).toBe('original');
    expect(existsSync(join(live, RESTORE_JOURNAL))).toBe(false);
    expect(existsSync(join(live, `${DATABASE_FILE}.restoring`))).toBe(false);
    expect(existsSync(join(live, 'api.lock'))).toBe(false);
    expect(readdirSync(live).filter((f) => f.startsWith('.restore-'))).toEqual([]);
    // And a later restore still works.
    restoreBackup(backup, live);
    expect(markerOf(live)).toBe('from-backup');
  });

  it('recovers a restore that crashed mid-swap (journal present, live file moved aside)', () => {
    const live = makeDb('original');
    const target = join(live, DATABASE_FILE);
    const staged = `${target}.restoring`;
    const aside = `${target}.pre-restore-test`;
    copyFileSync(snapshot('from-backup'), staged);
    writeFileSync(join(live, RESTORE_JOURNAL), JSON.stringify({ target, staged, previousSavedAs: aside, phase: 'swapping' }));
    renameSync(target, aside); // the crash happened right after this
    expect(existsSync(target)).toBe(false);

    expect(recoverInterruptedRestore(live).action).toBe('rolled_back');
    expect(markerOf(live)).toBe('original');
    expect(existsSync(staged)).toBe(false);
    expect(existsSync(join(live, RESTORE_JOURNAL))).toBe(false);
  });

  it('completes a restore that crashed after the final rename but before the journal was removed', () => {
    const live = makeDb('original');
    const target = join(live, DATABASE_FILE);
    const aside = `${target}.pre-restore-test`;
    renameSync(target, aside);
    copyFileSync(snapshot('from-backup'), target);
    writeFileSync(join(live, RESTORE_JOURNAL), JSON.stringify({ target, staged: `${target}.restoring`, previousSavedAs: aside, phase: 'swapping' }));
    expect(recoverInterruptedRestore(live).action).toBe('completed');
    expect(markerOf(live)).toBe('from-backup');
    expect(existsSync(aside)).toBe(true); // the previous database is never deleted
  });

  it('refuses up front when the disk lacks space, changing nothing', () => {
    const live = makeDb('original');
    expect(() => restoreBackup(snapshot('from-backup'), live, { freeBytes: () => 1024 })).toThrow(/Not enough free disk space.*Nothing was changed/);
    expect(markerOf(live)).toBe('original');
    expect(readdirSync(live).some((f) => f.includes('pre-restore'))).toBe(false);
  });

  it('a server cannot start while a restore holds the lock', () => {
    const live = makeDb('original');
    // Another live process (the test runner's parent) is restoring.
    writeFileSync(join(live, 'api.lock'), JSON.stringify({ pid: process.ppid, purpose: 'restore', host: hostname(), at: '' }));
    expect(() => acquireLock(live)).toThrow(/restore .* is in progress/);
    expect(() => restoreBackup(snapshot('y'), live)).toThrow(/Stop it before restoring/);
    rmSync(join(live, 'api.lock'));
    acquireLock(live)();
  });

  it('accepts a v0.1.0-style plain PID lock file and still detects a stale one', () => {
    const live = makeDb('x');
    writeFileSync(join(live, 'api.lock'), String(process.ppid));
    expect(() => acquireLock(live)).toThrow(/is using/);
    writeFileSync(join(live, 'api.lock'), 'not-a-lock');
    acquireLock(live)();
  });
});

describe('exclusive lock across processes', () => {
  it('exactly one of several simultaneous starters gets the lock', async () => {
    const dir = tempDir('rbo-race-');
    const lockModule = new URL('../../packages/storage/src/backup.ts', import.meta.url).href;
    const script = `
      import { acquireLock } from ${JSON.stringify(lockModule)};
      const dir = process.argv[1];
      try { acquireLock(dir); process.stdout.write('WON'); setTimeout(() => process.exit(0), 1500); }
      catch (e) { process.stdout.write('LOST'); process.exit(0); }
    `;
    const runs = Array.from({ length: 6 }, () =>
      new Promise<string>((resolve, reject) => {
        const child = spawn(process.execPath, ['--input-type=module', '-e', script, dir], { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        let err = '';
        child.stdout.on('data', (d) => (out += d));
        child.stderr.on('data', (d) => (err += d));
        child.on('exit', () => (out ? resolve(out) : reject(new Error(err))));
      }),
    );
    const results = await Promise.all(runs);
    expect(results.filter((r) => r === 'WON')).toHaveLength(1);
    expect(results.filter((r) => r === 'LOST')).toHaveLength(5);
  }, 20_000);
});

describe('password-protected backups', () => {
  it('round-trips through restore, and v0.1.0 plain backups still restore', () => {
    const plain = snapshot('secret-data');
    const enc = join(tempDir('rbo-enc-'), 'b.rbobak');
    const header = encryptBackupFile(plain, enc, 'correct horse battery', { schemaVersion: 3, appVersion: '0.2.0' }, FAST_KDF);
    expect(isEncryptedBackup(enc)).toBe(true);
    expect(isEncryptedBackup(plain)).toBe(false);
    expect(readFileSync(enc).includes(Buffer.from('secret-data'))).toBe(false);
    expect(readEncryptedHeader(enc).header.kdf.salt).toBe(header.kdf.salt);

    const live = makeDb('original');
    expect(() => verifyBackup(enc, live)).toThrow(/password-protected/);
    expect(verifyBackup(enc, live, { password: 'correct horse battery' }).encrypted).toBe(true);
    restoreBackup(enc, live, { password: 'correct horse battery' });
    expect(markerOf(live)).toBe('secret-data');

    const live2 = makeDb('original');
    restoreBackup(plain, live2);
    expect(markerOf(live2)).toBe('secret-data');
  });

  it('rejects a wrong password and any tampering without leaving plaintext behind', () => {
    const plain = snapshot('secret-data');
    const dir = tempDir('rbo-enc-');
    const enc = join(dir, 'b.rbobak');
    encryptBackupFile(plain, enc, 'correct horse battery', { schemaVersion: 3, appVersion: '0.2.0' }, FAST_KDF);
    const out = join(dir, 'out.sqlite');
    expect(() => decryptBackupFile(enc, out, 'wrong password!!')).toThrow(/password is wrong or the backup file was damaged/);
    expect(existsSync(out)).toBe(false);

    const bytes = readFileSync(enc);
    const flipped = Buffer.from(bytes);
    flipped[flipped.length - 40] = flipped[flipped.length - 40]! ^ 0x01; // ciphertext
    writeFileSync(join(dir, 'c1'), flipped);
    expect(() => decryptBackupFile(join(dir, 'c1'), out, 'correct horse battery')).toThrow(/damaged or changed/);
    expect(existsSync(out)).toBe(false);

    // Changing authenticated header metadata (same length) also fails.
    const headerTampered = Buffer.from(bytes.toString('latin1').replace('"appVersion":"0.2.0"', '"appVersion":"9.9.9"'), 'latin1');
    writeFileSync(join(dir, 'c2'), headerTampered);
    expect(() => decryptBackupFile(join(dir, 'c2'), out, 'correct horse battery')).toThrow(/damaged or changed/);

    writeFileSync(join(dir, 'c3'), bytes.subarray(0, 20));
    expect(() => decryptBackupFile(join(dir, 'c3'), out, 'correct horse battery')).toThrow();

    const live = makeDb('original');
    expect(() => restoreBackup(enc, live, { password: 'wrong password!!' })).toThrow(BackupError);
    expect(markerOf(live)).toBe('original');
  });

  it('refuses short passwords', () => {
    const plain = snapshot('x');
    expect(() => encryptBackupFile(plain, join(tempDir('rbo-enc-'), 'b'), 'short', { schemaVersion: 3, appVersion: '0.2.0' })).toThrow(/at least 10/);
  });
});

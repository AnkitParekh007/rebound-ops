import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateRestoredSession } from '@reboundops/contracts';
import { buildApp } from '../../../dist/api/app.js';

const fixture = () => JSON.parse(readFileSync(
  new URL('../../../packages/contracts/tests/fixtures/session-v1.json', import.meta.url), 'utf8'));

function withDirectory(fn) {
  return async () => {
    const dir = mkdtempSync(join(tmpdir(), 'reboundops-migrate-'));
    try { await fn(dir); }
    finally { rmSync(dir, { recursive: true, force: true }); }
  };
}

test('health reports the current and oldest supported schema versions', async () => {
  const app = buildApp();
  try {
    const r = await app.inject({ method: 'GET', url: '/api/health' });
    assert.equal(r.json().schemaVersion, 1);
    assert.equal(r.json().minSupportedSchemaVersion, 1);
  } finally { await app.close(); }
});

test('restoring a frozen v1 backup keeps all user-authored content', async () => {
  const app = buildApp();
  try {
    const original = fixture();
    const r = await app.inject({ method: 'POST', url: '/api/sessions/restore', payload: { session: original } });
    assert.equal(r.statusCode, 201);
    const restored = r.json();
    assert.notEqual(restored.id, original.id);
    assert.equal(restored.persistence, 'memory');
    assert.deepEqual(restored.intake, original.intake);
    assert.deepEqual(restored.corrections, original.corrections);
    assert.deepEqual(restored.sourceDocuments, original.sourceDocuments);
    assert.deepEqual(restored.jobTargets, original.jobTargets);
    assert.deepEqual(restored.plan, original.plan);
    assert.equal(restored.reviewNotes, original.reviewNotes);
  } finally { await app.close(); }
});

test('backups from a newer build or without a version are refused with clear codes', async () => {
  const app = buildApp();
  try {
    let r = await app.inject({ method: 'POST', url: '/api/sessions/restore',
      payload: { session: { ...fixture(), schemaVersion: 2 } } });
    assert.equal(r.statusCode, 400);
    assert.equal(r.json().error, 'BACKUP_FROM_NEWER_VERSION');
    const { schemaVersion, ...unversioned } = fixture();
    r = await app.inject({ method: 'POST', url: '/api/sessions/restore', payload: { session: unversioned } });
    assert.equal(r.statusCode, 400);
    assert.equal(r.json().error, 'INVALID_BACKUP');
    r = await app.inject({ method: 'POST', url: '/api/sessions/restore', payload: { session: [] } });
    assert.equal(r.statusCode, 400);
    assert.equal(r.json().error, 'INVALID_REQUEST');
  } finally { await app.close(); }
});

test('a saved file from a newer build is skipped and left byte-for-byte untouched', withDirectory(async dir => {
  const s = { ...fixture(), schemaVersion: 2, persistence: 'disk' };
  const file = join(dir, s.id + '.json');
  const raw = JSON.stringify({ formatVersion: 1, session: s });
  writeFileSync(file, raw, { mode: 0o600 });
  const app = buildApp({ dataDir: dir });
  try {
    const status = (await app.inject({ method: 'GET', url: '/api/persistence/status' })).json();
    assert.equal(status.savedCount, 0);
    assert.equal(status.warnings.length, 1);
    assert.equal(readFileSync(file, 'utf8'), raw);
  } finally { await app.close(); }
}));

/*
 * Simulated future upgrade. A real v1→v2 bump also changes SessionSchema; here
 * the test seam pretends the current schema is v2, with a step that renames a
 * legacy field. Validation maps back to the real (v1) validator so the full
 * integrity checks still run.
 */
const simulatedUpgrade = {
  minVersion: 1,
  targetVersion: 2,
  migrations: [{
    from: 1, to: 2, description: 'rename legacy notes to reviewNotes',
    migrate: s => {
      const { notes, ...rest } = s;
      return { ...rest, reviewNotes: rest.reviewNotes ?? notes ?? '', schemaVersion: 2 };
    }
  }],
  validate: s => validateRestoredSession({ ...s, schemaVersion: 1 })
};

test('older saved files are upgraded on load and their original bytes are kept before the first rewrite',
  withDirectory(async dir => {
    const { reviewNotes, ...legacy } = { ...fixture(), persistence: 'disk' };
    const old = { ...legacy, notes: reviewNotes };
    const name = old.id + '.json';
    const originalBytes = JSON.stringify({ formatVersion: 1, session: old }, null, 2);
    writeFileSync(join(dir, name), originalBytes, { mode: 0o600 });
    const backupName = old.id + '.schema-v1.backup';

    const app = buildApp({ dataDir: dir, sessionMigration: simulatedUpgrade });
    let s;
    try {
      const status = (await app.inject({ method: 'GET', url: '/api/persistence/status' })).json();
      assert.equal(status.warnings.length, 0);
      assert.equal(status.savedCount, 1);
      assert.equal(status.migratedSessions, 1);
      s = (await app.inject({ method: 'GET', url: '/api/sessions/' + old.id })).json();
      assert.equal(s.reviewNotes, reviewNotes, 'legacy text carried into the new field');
      // Reading alone never writes: no backup yet and the original is unchanged.
      assert.equal(readdirSync(dir).includes(backupName), false);
      assert.equal(readFileSync(join(dir, name), 'utf8'), originalBytes);

      let r = await app.inject({ method: 'PUT', url: '/api/sessions/' + s.id + '/review',
        payload: { expectedRevision: s.revision, notes: 'Updated after upgrade' } });
      assert.equal(r.statusCode, 200);
      s = r.json();
      assert.equal(readFileSync(join(dir, backupName), 'utf8'), originalBytes);
      if (process.platform !== 'win32') assert.equal(statSync(join(dir, backupName)).mode & 0o777, 0o600);

      r = await app.inject({ method: 'PUT', url: '/api/sessions/' + s.id + '/review',
        payload: { expectedRevision: s.revision, notes: 'Second edit' } });
      s = r.json();
      assert.equal(readFileSync(join(dir, backupName), 'utf8'), originalBytes, 'backup is never overwritten');
    } finally { await app.close(); }

    // The backup is not mistaken for a session after restart.
    const restarted = buildApp({ dataDir: dir, sessionMigration: simulatedUpgrade });
    try {
      const status = (await restarted.inject({ method: 'GET', url: '/api/persistence/status' })).json();
      assert.equal(status.savedCount, 1);
      assert.equal(status.warnings.length, 0);
      const r = await restarted.inject({ method: 'DELETE', url: '/api/sessions/' + s.id,
        payload: { expectedRevision: s.revision } });
      assert.equal(r.statusCode, 204);
      assert.deepEqual(readdirSync(dir), [], 'explicit deletion also removes the pre-upgrade backup');
    } finally { await restarted.close(); }
  }));

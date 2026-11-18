import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { DATABASE_FILE, LATEST_SCHEMA_VERSION, MIGRATIONS, SchemaTooNewError, CorruptRecordError, migrate, openStore } from '../src/index.ts';

const dirs: string[] = [];
const tempDir = () => {
  const d = mkdtempSync(join(tmpdir(), 'rbo-store-'));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const sampleJob = {
  id: 'j1',
  title: 'Research Engineer',
  employer: 'Example Co',
  location: null,
  salary: null,
  workArrangement: null,
  sourceUrl: null,
  description: 'Research Engineer at Example Co',
  provenance: {
    title: { origin: 'user' as const, evidence: null },
    employer: { origin: 'user' as const, evidence: null },
    location: null,
    salary: null,
  },
  verification: { status: 'unverified' as const, checkedAt: null, note: 'manual' },
  dedupeKey: 'id:example co|research engineer|',
  capturedAt: '2026-02-01T10:00:00.000Z',
};

describe('migrations', () => {
  it('applies all migrations once and is idempotent', () => {
    const db = new DatabaseSync(':memory:');
    expect(migrate(db)).toEqual([1, 2, 3, 4]);
    expect(migrate(db)).toEqual([]);
    db.close();
  });

  it('upgrades an existing v1 database without losing data', () => {
    const dir = tempDir();
    const db = new DatabaseSync(join(dir, DATABASE_FILE));
    migrate(db, MIGRATIONS.slice(0, 1));
    db.prepare('INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)').run('profile', JSON.stringify({ displayName: 'Kept Person' }), '2026-01-01T00:00:00.000Z');
    db.close();
    const s = openStore({ dataDir: dir });
    expect(s.getProfile()?.displayName).toBe('Kept Person');
    expect(s.getProfile()?.education).toEqual([]);
    expect(s.listResumeFiles()).toEqual([]);
    s.close();
  });

  it('stores resume originals byte-for-byte and drafts per application', () => {
    const s = openStore({ memory: true });
    const bytes = Buffer.from([0, 1, 2, 250, 255]);
    s.insertResumeFile({ id: 'r1', filename: 'cv.docx', mediaType: 'x', sha256: 'abc', size: 5, importedAt: '2026-01-01T00:00:00.000Z' }, bytes);
    expect(s.getResumeFile('r1')?.data.equals(bytes)).toBe(true);
    expect(s.findResumeFileBySha('abc')?.id).toBe('r1');
    s.close();
  });

  it('rolls back a failing migration', () => {
    const db = new DatabaseSync(':memory:');
    expect(() =>
      migrate(db, [
        { version: 1, name: 'ok', sql: 'CREATE TABLE a (x INTEGER)' },
        { version: 2, name: 'broken', sql: 'CREATE TABLE b (y INTEGER); THIS IS NOT SQL' },
      ]),
    ).toThrow(/Migration 2/);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='b'").all();
    expect(tables).toHaveLength(0);
    db.close();
  });

  it('refuses to open data written by a newer schema', () => {
    const dir = tempDir();
    openStore({ dataDir: dir }).close();
    const db = new DatabaseSync(join(dir, DATABASE_FILE));
    db.prepare("INSERT INTO schema_migrations VALUES (99, 'future', '2030-01-01T00:00:00Z')").run();
    db.close();
    expect(() => openStore({ dataDir: dir })).toThrow(SchemaTooNewError);
  });
});

describe('Store', () => {
  it('persists records across close and reopen, with private file permissions', () => {
    const dir = tempDir();
    const s1 = openStore({ dataDir: dir });
    s1.insertJob(sampleJob);
    s1.upsertApplication({
      id: 'a1',
      jobId: 'j1',
      status: 'discovered',
      createdAt: sampleJob.capturedAt,
      updatedAt: sampleJob.capturedAt,
      statusChangedAt: sampleJob.capturedAt,
      appliedConfirmedAt: null,
    });
    s1.close();

    const s2 = openStore({ dataDir: dir });
    expect(s2.getJob('j1')?.title).toBe('Research Engineer');
    expect(s2.listApplications()).toHaveLength(1);
    expect(s2.schemaVersion).toBe(LATEST_SCHEMA_VERSION);
    s2.close();

    if (process.platform !== 'win32') {
      expect(statSync(join(dir, DATABASE_FILE)).mode & 0o777).toBe(0o600);
      expect(statSync(dir).mode & 0o077).toBe(0);
    }
  });

  it('rolls back a failed transaction', () => {
    const s = openStore({ memory: true });
    expect(() =>
      s.transaction(() => {
        s.insertJob(sampleJob);
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(s.listJobs()).toHaveLength(0);
    s.close();
  });

  it('enforces referential integrity', () => {
    const s = openStore({ memory: true });
    expect(() =>
      s.upsertApplication({
        id: 'a1',
        jobId: 'missing',
        status: 'discovered',
        createdAt: sampleJob.capturedAt,
        updatedAt: sampleJob.capturedAt,
        statusChangedAt: sampleJob.capturedAt,
        appliedConfirmedAt: null,
      }),
    ).toThrow();
    s.close();
  });

  it('surfaces corrupted documents instead of returning bad data', () => {
    const s = openStore({ memory: true });
    s.db.prepare("INSERT INTO jobs (id, dedupe_key, captured_at, data) VALUES ('bad', 'k', 'x', '{\"title\":1}')").run();
    expect(() => s.getJob('bad')).toThrow(CorruptRecordError);
    s.close();
  });
});

describe('v0.1.0 compatibility', () => {
  it('upgrades a schema-3 (v0.1.0) database with contacts and reminders to the current schema without loss', () => {
    const dir = tempDir();
    const db = new DatabaseSync(join(dir, DATABASE_FILE));
    migrate(db, MIGRATIONS.slice(0, 3));
    const at = '2026-01-01T00:00:00.000Z';
    db.prepare('INSERT INTO jobs (id, dedupe_key, captured_at, data) VALUES (?, ?, ?, ?)').run('j1', 'k', at, '{}');
    db.prepare('INSERT INTO applications (id, job_id, status, updated_at, data) VALUES (?, ?, ?, ?, ?)').run('a1', 'j1', 'applied', at, '{}');
    // Records exactly as v0.1.0 wrote them (no priority, notes or deleted_at).
    db.prepare('INSERT INTO contacts (id, application_id, data) VALUES (?, ?, ?)').run('c1', 'a1', JSON.stringify({ id: 'c1', applicationId: 'a1', name: 'Old Contact', role: '', email: '', phone: '', notes: '', createdAt: at, updatedAt: at }));
    db.prepare('INSERT INTO reminders (id, application_id, due_on, done, data) VALUES (?, ?, ?, ?, ?)').run('r1', 'a1', '2026-02-01', 0, JSON.stringify({ id: 'r1', applicationId: 'a1', dueOn: '2026-02-01', label: 'Old reminder', done: false, doneAt: null, createdAt: at }));
    db.close();

    const store = openStore({ dataDir: dir });
    expect(store.schemaVersion).toBe(LATEST_SCHEMA_VERSION);
    expect(store.listContacts('a1').map((c) => c.name)).toEqual(['Old Contact']);
    expect(store.listReminders('a1')).toEqual([expect.objectContaining({ label: 'Old reminder', priority: 'normal', notes: '' })]);
    expect(store.deleteReminder('r1')).toBe(true);
    expect(store.listReminders('a1')).toEqual([]);
    expect(store.restoreReminder('r1')?.label).toBe('Old reminder');
    expect(store.purgeDeleted('2099-01-01T00:00:00.000Z')).toBe(0);
    store.deleteContact('c1', '2026-01-02T00:00:00.000Z');
    expect(store.purgeDeleted('2026-01-03T00:00:00.000Z')).toBe(1);
    expect(store.getDeletedContact('c1')).toBeNull();
    store.close();
  });
});

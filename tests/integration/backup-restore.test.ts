/**
 * Whole-database backup and restore, plus import failure recovery.
 * Real on-disk databases, real HTTP routes, fictional data only.
 */
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { acquireLock, BackupError, DATABASE_FILE, openStore, restoreBackup, verifyBackup, type Store } from '@reboundops/storage';
import { buildServer, Workspace } from '../../apps/api/src/index.ts';

const resumeText = readFileSync(new URL('../fixtures/resumes/jordan-fictional.txt', import.meta.url), 'utf8');
const posting = readFileSync(new URL('../fixtures/jobs/labelled.txt', import.meta.url), 'utf8');

const dirs: string[] = [];
const tempDir = (p: string) => {
  const d = mkdtempSync(join(tmpdir(), p));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function open(dir: string) {
  const store = openStore({ dataDir: dir });
  const app = buildServer({ workspace: new Workspace(store, { env: {} }), allowedOrigins: ['http://localhost:4174'], logLevel: 'silent' });
  const call = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown) =>
    app.inject({ method, url, headers: { host: '127.0.0.1', ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, ...(body === undefined ? {} : { payload: JSON.stringify(body) }) });
  const ok = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown) => {
    const res = await call(method, url, body);
    expect(res.statusCode, `${method} ${url}: ${res.payload.slice(0, 200)}`).toBeLessThan(300);
    return res;
  };
  return { store, app, call, ok, close: async () => { await app.close(); store.close(); } };
}

/** Builds a workspace with every kind of record: verified profile, job, drafts, answers, contact, reminder, resume original. */
async function populate(h: ReturnType<typeof open>) {
  const p = (await h.ok('POST', '/api/resume/import', { text: resumeText })).json().proposal;
  await h.ok('PUT', '/api/profile', {
    displayName: p.displayName, headline: p.headline, contact: p.contact, skills: p.skills,
    targetRoles: ['Platform Engineer'], preferredCountries: ['Portugal'], workArrangements: ['hybrid'],
    workAuthorizedCountries: ['Portugal'], requiresSponsorship: 'no', openToRelocation: 'no',
    experience: p.experience.map((e: Record<string, unknown>) => ({ ...e, verified: true })),
    education: p.education.map((e: Record<string, unknown>) => ({ ...e, verified: true })),
  });
  const ex = (await h.ok('POST', '/api/jobs/extract', { description: posting })).json();
  const id = (await h.ok('POST', '/api/jobs', {
    title: ex.title.value, employer: ex.employer.value, description: ex.description, sourceUrl: null, workArrangement: null,
    provenance: { title: { origin: 'extracted', evidence: ex.title.evidence }, employer: { origin: 'extracted', evidence: ex.employer.evidence }, location: null, salary: null },
  })).json().application.id as string;
  await h.ok('POST', `/api/applications/${id}/documents/generate`, {});
  await h.ok('PUT', `/api/applications/${id}/documents/cover_letter`, { text: 'Edited letter kept by the backup.' });
  await h.ok('POST', `/api/applications/${id}/package/questions`, { questions: ['Do you need sponsorship?'] });
  await h.ok('POST', `/api/applications/${id}/contacts`, { name: 'Sam Example', role: 'Recruiter', email: 'sam@example.test', phone: '', notes: '' });
  await h.ok('POST', `/api/applications/${id}/reminders`, { label: 'Check in', dueOn: '2026-12-01' });
  return id;
}

describe('backup and restore', () => {
  it('round-trips everything, keeps the replaced database, and refuses while running', async () => {
    const dir = tempDir('rbo-backup-');
    let h = open(dir);
    const id = await populate(h);
    const res = await h.ok('GET', '/api/backup');
    expect(res.headers['content-type']).toBe('application/vnd.sqlite3');
    expect(String(res.headers['content-disposition'])).toMatch(/^attachment; filename="reboundops-backup-\d{4}-\d{2}-\d{2}\.sqlite"$/);
    expect(readdirSync(dir).filter((f) => f.startsWith('.backup-'))).toEqual([]); // temp snapshot cleaned up
    const backupFile = join(tempDir('rbo-backup-out-'), 'backup.sqlite');
    writeFileSync(backupFile, res.rawPayload);

    // Lose data after the backup.
    await h.ok('DELETE', `/api/applications/${id}`);
    expect((await h.ok('GET', '/api/applications')).json()).toHaveLength(0);

    // A running server holds the lock; restore must refuse.
    const release = acquireLock(dir);
    expect(() => restoreBackup(backupFile, dir)).toThrow(/Stop it before restoring/);
    release();
    await h.close();

    const r = restoreBackup(backupFile, dir);
    expect(r.counts).toMatchObject({ jobs: 1, applications: 1, contacts: 1, reminders: 1, resumeFiles: 1 });
    expect(r.counts['documents']).toBeGreaterThanOrEqual(3); // resume, cover letter, package
    expect(r.previousSavedAs && existsSync(r.previousSavedAs)).toBe(true);
    // The kept database is the post-deletion state, intact and readable.
    const kept = new DatabaseSync(r.previousSavedAs!, { readOnly: true });
    expect((kept.prepare('SELECT COUNT(*) AS n FROM applications').get() as { n: number }).n).toBe(0);
    kept.close();

    h = open(dir);
    expect((await h.ok('GET', `/api/applications/${id}`)).json().job.title).toBe('Senior Platform Engineer');
    expect((await h.ok('GET', `/api/applications/${id}/documents`)).json().coverLetter.text).toBe('Edited letter kept by the backup.');
    expect((await h.ok('GET', `/api/applications/${id}/package`)).json().package.answers).toHaveLength(1);
    expect((await h.ok('GET', `/api/applications/${id}/contacts`)).json()[0].name).toBe('Sam Example');
    expect((await h.ok('GET', `/api/applications/${id}/reminders`)).json()[0].label).toBe('Check in');
    const files = (await h.ok('GET', '/api/resume/files')).json();
    expect(files).toHaveLength(1);
    expect((await h.ok('GET', `/api/resume/files/${files[0].id}/original`)).rawPayload.toString('utf8')).toBe(resumeText);
    const profile = (await h.ok('GET', '/api/profile')).json();
    expect(profile.experience.every((e: { verified: boolean }) => e.verified)).toBe(true);
    await h.close();
  });

  it('rejects files that are not sound backups, without touching current data', async () => {
    const dir = tempDir('rbo-restore-bad-');
    const h = open(dir);
    await h.ok('PUT', '/api/onboarding', { status: 'skipped' });
    const good = join(tempDir('rbo-good-'), 'good.sqlite');
    writeFileSync(good, (await h.ok('GET', '/api/backup')).rawPayload);
    await h.close();
    const before = readFileSync(join(dir, DATABASE_FILE));
    const bad = tempDir('rbo-bad-');

    const notSqlite = join(bad, 'export.json');
    writeFileSync(notSqlite, JSON.stringify({ format: 'reboundops-export' }));
    expect(() => restoreBackup(notSqlite, dir)).toThrow(/not an SQLite database/);

    const truncated = join(bad, 'truncated.sqlite');
    const full = readFileSync(good);
    writeFileSync(truncated, full.subarray(0, Math.floor(full.length / 2)));
    expect(() => restoreBackup(truncated, dir)).toThrow(BackupError);

    const foreign = join(bad, 'foreign.sqlite');
    const f = new DatabaseSync(foreign);
    f.exec('CREATE TABLE t (x INTEGER)');
    f.close();
    expect(() => restoreBackup(foreign, dir)).toThrow(/not a ReboundOps backup/);

    const newer = join(bad, 'newer.sqlite');
    copyFileSync(good, newer);
    const n = new DatabaseSync(newer);
    n.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(999, 'future', '2030-01-01T00:00:00.000Z');
    n.close();
    expect(() => restoreBackup(newer, dir)).toThrow(/newer ReboundOps/);

    const corruptRecord = join(bad, 'corrupt.sqlite');
    copyFileSync(good, corruptRecord);
    const c = new DatabaseSync(corruptRecord);
    c.prepare("UPDATE kv SET value = '{not json' WHERE key = 'onboarding'").run();
    c.close();
    expect(() => restoreBackup(corruptRecord, dir)).toThrow(/records this version cannot read/);

    expect(() => restoreBackup(join(bad, 'missing.sqlite'), dir)).toThrow(/does not exist/);
    expect(readFileSync(join(dir, DATABASE_FILE)).equals(before)).toBe(true);
    expect(readdirSync(dir).some((x) => x.includes('pre-restore'))).toBe(false);
    expect(verifyBackup(good, dir).schemaVersion).toBeGreaterThan(0);
  });

  it('a second server cannot start against a data directory that is in use', () => {
    const dir = tempDir('rbo-lock-');
    const store: Store = openStore({ dataDir: dir });
    writeFileSync(join(dir, 'api.lock'), String(process.ppid)); // a live process other than this one
    expect(() => acquireLock(dir)).toThrow(/is using/);
    writeFileSync(join(dir, 'api.lock'), '999999999'); // stale: no such process
    const release = acquireLock(dir);
    release();
    expect(existsSync(join(dir, 'api.lock'))).toBe(false);
    store.close();
  });
});

describe('import failure recovery', () => {
  it('rolls back a commit that fails part-way and leaves no partial records', async () => {
    const dir = tempDir('rbo-import-fail-');
    const h = open(dir);
    const file = {
      format: 'reboundops-import', formatVersion: 1,
      jobs: [
        { title: 'Data Engineer', employer: 'Fictional Co', status: 'shortlisted' },
        { title: 'Site Reliability Engineer', employer: 'Example Ltd', status: 'applied', appliedAt: '2026-01-02T00:00:00.000Z' },
      ],
    };
    const preview = (await h.ok('POST', '/api/import/preview', { content: JSON.stringify(file) })).json();
    expect(preview.jobs.toAdd).toHaveLength(2);
    const original = h.store.insertJob.bind(h.store);
    let calls = 0;
    h.store.insertJob = (job) => {
      if (++calls === 2) throw new Error('disk full (simulated)');
      return original(job);
    };
    const res = await h.call('POST', '/api/import/commit', { token: preview.token, confirm: true });
    expect(res.statusCode, res.payload).toBe(500);
    h.store.insertJob = original;
    expect(h.store.listJobs()).toHaveLength(0);
    expect(h.store.listApplications()).toHaveLength(0);
    expect(h.store.listActivity()).toHaveLength(0);

    // The person can preview again and the retry succeeds.
    const again = (await h.ok('POST', '/api/import/preview', { content: JSON.stringify(file) })).json();
    expect((await h.ok('POST', '/api/import/commit', { token: again.token, confirm: true })).json().jobsAdded).toBe(2);
    await h.close();
  });
});

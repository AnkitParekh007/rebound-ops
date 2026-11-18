/**
 * Password-protected backups and the in-app restore, over HTTP, against a
 * real on-disk database held by a server that owns the data lock.
 * Fictional data only.
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { acquireLock, DATABASE_FILE, openStore } from '@reboundops/storage';
import { buildServer, Workspace } from '../../apps/api/src/index.ts';

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function server() {
  const dir = mkdtempSync(join(tmpdir(), 'rbo-inapp-'));
  dirs.push(dir);
  const release = acquireLock(dir);
  const ws = new Workspace(openStore({ dataDir: dir }), { env: {} });
  const app = buildServer({ workspace: ws, allowedOrigins: ['http://localhost:4174'], logLevel: 'silent' });
  const send = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown, raw?: Buffer) =>
    app.inject({
      method,
      url,
      headers: { host: '127.0.0.1', ...(raw ? { 'content-type': 'application/octet-stream' } : body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(raw ? { payload: raw } : body === undefined ? {} : { payload: JSON.stringify(body) }),
    });
  return { dir, ws, app, send, close: async () => { await app.close(); ws.currentStore.close(); release(); } };
}

const job = (title: string) => ({
  title, employer: 'Fictional Co', description: `${title} role`, sourceUrl: null, workArrangement: null,
  provenance: { title: { origin: 'user', evidence: null }, employer: { origin: 'user', evidence: null }, location: null, salary: null },
});

describe('password-protected backup download', () => {
  it('requires a strong password, returns an encrypted file, and never echoes the password', async () => {
    const h = server();
    await h.send('POST', '/api/jobs', job('Data Engineer'));
    expect((await h.send('POST', '/api/backup/encrypted', { password: 'short' })).statusCode).toBe(400);
    const res = await h.send('POST', '/api/backup/encrypted', { password: 'a long fictional passphrase' });
    expect(res.statusCode).toBe(200);
    expect(String(res.headers['content-disposition'])).toMatch(/filename="reboundops-backup-\d{4}-\d{2}-\d{2}\.rbobak"/);
    expect(res.rawPayload.subarray(0, 6).toString('latin1')).toBe('RBOBAK');
    expect(res.rawPayload.includes(Buffer.from('Data Engineer'))).toBe(false);
    expect(res.rawPayload.includes(Buffer.from('a long fictional passphrase'))).toBe(false);
    expect(readdirSync(h.dir).filter((f) => f.startsWith('.backup-'))).toEqual([]);
    await h.close();
  });
});

describe('in-app restore', () => {
  it('stages, asks for the password, previews counts, requires typed confirmation, keeps a recovery copy, and swaps live', async () => {
    const h = server();
    await h.send('POST', '/api/jobs', job('Kept Role'));
    const backup = (await h.send('POST', '/api/backup/encrypted', { password: 'a long fictional passphrase' })).rawPayload;
    await h.send('POST', '/api/jobs', job('Added After Backup'));
    expect((await h.send('GET', '/api/applications')).json()).toHaveLength(2);

    const staged = await h.send('POST', '/api/restore/stage', undefined, backup);
    expect(staged.statusCode).toBe(201);
    const s = staged.json();
    expect(s).toMatchObject({ encrypted: true, meta: { schemaVersion: 4, appVersion: '0.2.0' }, currentCounts: { jobs: 2 } });

    expect((await h.send('POST', `/api/restore/${s.stageId}/verify`, {})).statusCode).toBe(428);
    const wrong = await h.send('POST', `/api/restore/${s.stageId}/verify`, { password: 'not the right one!' });
    expect(wrong.statusCode).toBe(422);
    expect(wrong.json().error.code).toBe('wrong_password_or_damaged');
    const v = (await h.send('POST', `/api/restore/${s.stageId}/verify`, { password: 'a long fictional passphrase' })).json();
    expect(v).toMatchObject({ encrypted: true, compatible: true, counts: { jobs: 1, applications: 1 }, currentCounts: { jobs: 2 } });

    // Nothing changes without the typed confirmation.
    expect((await h.send('POST', `/api/restore/${s.stageId}/apply`, { password: 'a long fictional passphrase', confirm: 'yes' })).statusCode).toBe(400);
    expect((await h.send('GET', '/api/applications')).json()).toHaveLength(2);

    const applied = await h.send('POST', `/api/restore/${s.stageId}/apply`, { password: 'a long fictional passphrase', confirm: 'RESTORE' });
    expect(applied.statusCode).toBe(200);
    const r = applied.json();
    expect(r).toMatchObject({ restored: true, counts: { jobs: 1 } });
    expect(existsSync(r.recoveryBackup)).toBe(true);
    expect(r.instructions).toContain('npm run restore --');

    // The running server now serves the restored data.
    const apps = (await h.send('GET', '/api/applications')).json();
    expect(apps.map((a: { job: { title: string } }) => a.job.title)).toEqual(['Kept Role']);
    // The recovery copy holds the pre-restore state.
    expect(readFileSync(r.recoveryBackup).subarray(0, 15).toString('latin1')).toBe('SQLite format 3');
    // The staged upload is gone.
    expect((await h.send('POST', `/api/restore/${s.stageId}/verify`, {})).statusCode).toBe(404);
    await h.close();
  });

  it('rejects files that are not backups and leaves data untouched', async () => {
    const h = server();
    await h.send('POST', '/api/jobs', job('Only Role'));
    const s = (await h.send('POST', '/api/restore/stage', undefined, Buffer.from('not a backup at all'))).json();
    const v = await h.send('POST', `/api/restore/${s.stageId}/verify`, {});
    expect(v.statusCode).toBe(422);
    expect(v.json().error.code).toBe('invalid_backup');
    expect((await h.send('POST', `/api/restore/${s.stageId}/apply`, { confirm: 'RESTORE' })).statusCode).toBe(422);
    expect((await h.send('GET', '/api/applications')).json()).toHaveLength(1);
    expect((await h.send('DELETE', `/api/restore/${s.stageId}`)).statusCode).toBe(204);
    expect(existsSync(join(h.dir, DATABASE_FILE))).toBe(true);
    await h.close();
  });

  it('only the restore upload route accepts raw bytes', async () => {
    const h = server();
    const res = await h.send('POST', '/api/jobs', undefined, Buffer.from('{}'));
    expect(res.statusCode).toBe(415);
    await h.close();
  });
});

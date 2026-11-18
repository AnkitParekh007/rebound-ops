import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import { openStore } from '@reboundops/storage';
import { buildServer, Workspace } from '../src/index.ts';
import { safeResolve } from '../src/static.ts';

const ORIGIN = 'http://localhost:4174';
const cleanups: (() => void | Promise<void>)[] = [];
afterEach(async () => {
  for (const c of cleanups.splice(0)) await c();
});

function server(opts: { webDist?: string; logs?: string[] } = {}) {
  const store = openStore({ memory: true });
  const stream = new Writable({ write(chunk, _e, cb) { opts.logs?.push(String(chunk)); cb(); } });
  const app = buildServer({ workspace: new Workspace(store), allowedOrigins: [ORIGIN], logLevel: 'info', logStream: stream, ...(opts.webDist ? { webDist: opts.webDist } : {}) });
  cleanups.push(async () => { await app.close(); store.close(); });
  return { app, store };
}
const json = { host: '127.0.0.1', 'content-type': 'application/json' };

describe('request hardening', () => {
  it('rejects oversized bodies', async () => {
    const { app } = server();
    const res = await app.inject({ method: 'PUT', url: '/api/profile', headers: json, payload: JSON.stringify({ headline: 'x'.repeat(600 * 1024) }) });
    expect(res.statusCode).toBe(413);
  });

  it('refuses API requests that another website started, even simple downloads', async () => {
    const { app } = server();
    for (const url of ['/api/export', '/api/profile', '/api/resume/files']) {
      const res = await app.inject({ method: 'GET', url, headers: { host: '127.0.0.1', 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate' } });
      expect(res.statusCode, url).toBe(403);
      expect(res.json().error.code).toBe('cross_site');
    }
    for (const site of ['same-origin', 'same-site', 'none']) {
      const res = await app.inject({ method: 'GET', url: '/api/profile', headers: { host: '127.0.0.1', 'sec-fetch-site': site } });
      expect(res.statusCode, site).toBe(200);
    }
  });

  it('answers CORS preflight only for the allowed origin', async () => {
    const { app } = server();
    const ok = await app.inject({ method: 'OPTIONS', url: '/api/profile', headers: { host: 'localhost', origin: ORIGIN, 'access-control-request-method': 'PUT' } });
    expect(ok.statusCode).toBe(204);
    expect(ok.headers['access-control-allow-methods']).toContain('PUT');
    const bad = await app.inject({ method: 'OPTIONS', url: '/api/profile', headers: { host: 'localhost', origin: 'http://localhost:9999' } });
    expect(bad.statusCode).toBe(403);
  });

  it('does not leak internals or personal data in error responses or logs', async () => {
    const logs: string[] = [];
    const { app, store } = server({ logs });
    await app.inject({ method: 'PUT', url: '/api/profile', headers: json, payload: JSON.stringify({ displayName: 'Secret Person', contact: { email: 'secret@example.test' } }) });
    store.db.prepare("INSERT INTO jobs (id, dedupe_key, captured_at, data) VALUES ('bad', 'k', 'x', 'not json')").run();
    const res = await app.inject({ method: 'GET', url: '/api/jobs/bad', headers: { host: 'localhost' } });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: { code: 'internal_error', message: 'Something went wrong. Your data was not changed.' } });
    expect(res.payload).not.toMatch(/at |stack|sqlite|\.ts:/i);
    const all = logs.join('\n');
    expect(all).toContain('unhandled error');
    expect(all).not.toContain('Secret Person');
    expect(all).not.toContain('secret@example.test');
  });

  it('sanitises stored filenames in download headers', async () => {
    const { app } = server();
    const imported = await app.inject({ method: 'POST', url: '/api/resume/import', headers: json, payload: JSON.stringify({ filename: 'cv"\r\nX-Evil: 1 ../../x.txt', contentBase64: Buffer.from('Jane Example').toString('base64') }) });
    const id = imported.json().file.id;
    const res = await app.inject({ method: 'GET', url: `/api/resume/files/${id}/original`, headers: { host: 'localhost' } });
    expect(res.headers['x-evil']).toBeUndefined();
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="[A-Za-z0-9._ -]+"$/);
  });

  it('treats ids as opaque keys (no path traversal)', async () => {
    const { app } = server();
    for (const url of ['/api/resume/files/..%2F..%2Fetc%2Fpasswd/original', '/api/applications/%2e%2e%2f%2e%2e']) {
      expect((await app.inject({ method: 'GET', url, headers: { host: 'localhost' } })).statusCode).toBe(404);
    }
  });
});

describe('same-origin web serving', () => {
  function withDist() {
    const dir = mkdtempSync(join(tmpdir(), 'rbo-web-'));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>t</title><app-root></app-root>');
    writeFileSync(join(dir, 'main-ABCDEFGH.js'), 'console.log(1)');
    mkdirSync(join(dir, 'sub'));
    return dir;
  }

  it('serves the app shell with CSP, caches hashed assets, and falls back for client routes', async () => {
    const { app } = server({ webDist: withDist() });
    const index = await app.inject({ method: 'GET', url: '/', headers: { host: 'localhost' } });
    expect(index.statusCode).toBe(200);
    expect(index.headers['content-security-policy']).toContain("script-src 'self'");
    expect(index.headers['x-frame-options']).toBe('DENY');
    const asset = await app.inject({ method: 'GET', url: '/main-ABCDEFGH.js', headers: { host: 'localhost' } });
    expect(asset.headers['cache-control']).toContain('immutable');
    expect((await app.inject({ method: 'GET', url: '/tracker/abc', headers: { host: 'localhost' } })).payload).toContain('<app-root>');
    expect((await app.inject({ method: 'GET', url: '/missing.js', headers: { host: 'localhost' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/unknown', headers: { host: 'localhost' } })).json().error.code).toBe('not_found');
    expect((await app.inject({ method: 'GET', url: '/api/health', headers: { host: 'localhost' } })).json().status).toBe('ok');
  });

  it('refuses paths that escape the web directory', async () => {
    const dir = withDist();
    expect(safeResolve(dir, '/../../etc/passwd')).toBeNull();
    expect(safeResolve(dir, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull();
    expect(safeResolve(dir, '/a\0b')).toBeNull();
    expect(safeResolve(dir, '/main-ABCDEFGH.js')).toBe(join(dir, 'main-ABCDEFGH.js'));
    const { app } = server({ webDist: dir });
    const res = await app.inject({ method: 'GET', url: '/..%2f..%2fetc%2fpasswd', headers: { host: 'localhost' } });
    expect([400, 404]).toContain(res.statusCode);
    expect(res.payload).not.toContain('root:');
  });
});

describe('same-origin writes in packaged mode', () => {
  it('accepts the server’s own origin only when it serves the web app', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rbo-web-'));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    writeFileSync(join(dir, 'index.html'), '<app-root></app-root>');
    const body = { method: 'PUT' as const, url: '/api/profile', payload: '{}', headers: { host: '127.0.0.1:51234', origin: 'http://127.0.0.1:51234', 'content-type': 'application/json' } };
    expect((await server({ webDist: dir }).app.inject(body)).statusCode).toBe(200);
    expect((await server().app.inject(body)).statusCode).toBe(403);
    expect((await server({ webDist: dir }).app.inject({ ...body, headers: { ...body.headers, origin: 'http://127.0.0.1:9999' } })).statusCode).toBe(403);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../../../dist/api/app.js';

const intake = {
  role: 'Fictional reliability tester', weeklyHours: 4,
  location: 'Private fictional city', urgency: 'flexible',
  priorities: 'No real participant records', shiftTarget: '', bridgeTarget: '',
  evidence: []
};

function withDirectory(fn) {
  return async () => {
    const dir = mkdtempSync(join(tmpdir(), 'reboundops-reliability-'));
    try { await fn(dir); }
    finally { rmSync(dir, { recursive: true, force: true }); }
  };
}

test('API rejects non-local Host headers, foreign origins and browser cross-site requests', async () => {
  const app = buildApp();
  try {
    let response = await app.inject({ method: 'GET', url: '/api/health',
      headers: { host: 'unsafe.example:4174' } });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error, 'HOST_REJECTED');

    response = await app.inject({ method: 'POST', url: '/api/sessions',
      headers: { host: 'localhost:4174', origin: 'https://unsafe.example' },
      payload: { intake } });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error, 'ORIGIN_REJECTED');

    response = await app.inject({ method: 'POST', url: '/api/sessions',
      headers: { host: '127.0.0.1:4174', 'sec-fetch-site': 'cross-site' },
      payload: { intake } });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error, 'CROSS_SITE_REJECTED');

    response = await app.inject({ method: 'GET', url: '/api/health',
      headers: { host: 'localhost:4174', origin: 'http://localhost:4200' } });
    assert.equal(response.statusCode, 200);
    response = await app.inject({ method: 'GET', url: '/api/health',
      headers: { host: '127.0.0.1:4174', origin: 'http://127.0.0.1:4174' } });
    assert.equal(response.statusCode, 200);
    response = await app.inject({ method: 'GET', url: '/api/health', headers: { host: '127.0.0.1:43821', origin: 'http://127.0.0.1:43821' } });
    assert.equal(response.statusCode, 200, 'same-origin compiled app works on a custom local port');
    response = await app.inject({ method: 'GET', url: '/api/health', headers: { host: '127.0.0.1:43821', origin: 'http://127.0.0.1:43822' } });
    assert.equal(response.statusCode, 403, 'an unrelated local origin remains rejected');
  } finally { await app.close(); }
});

test('external changes to a saved file refuse writes and deletes without losing in-memory state', withDirectory(async dir => {
  const app = buildApp({ dataDir: dir });
  try {
    let response = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
    let session = response.json();
    const base = '/api/sessions/' + session.id;

    response = await app.inject({ method: 'PUT', url: base + '/persistence',
      payload: { expectedRevision: session.revision, mode: 'disk' } });
    assert.equal(response.statusCode, 200);
    session = response.json();
    const diskFile = join(dir, session.id + '.json');
    const externalChange = JSON.parse(readFileSync(diskFile, 'utf8'));
    externalChange.session.reviewNotes = 'Changed outside of the API';
    writeFileSync(diskFile, JSON.stringify(externalChange));

    response = await app.inject({ method: 'PUT', url: base + '/review',
      payload: { expectedRevision: session.revision, notes: 'Should not overwrite disk file' } });
    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), { error: 'LOCAL_STORAGE_UNAVAILABLE' });
    assert.equal(JSON.parse(readFileSync(diskFile, 'utf8')).session.reviewNotes,
      'Changed outside of the API');

    response = await app.inject({ method: 'GET', url: base });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().revision, session.revision);
    assert.equal(response.json().reviewNotes, '');

    response = await app.inject({ method: 'DELETE', url: base,
      payload: { expectedRevision: session.revision } });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().error, 'LOCAL_STORAGE_UNAVAILABLE');
    assert.equal(readdirSync(dir).filter(file => file.endsWith('.json')).length, 1);
  } finally { await app.close(); }
}));

test('a removed opted-in file is not silently recreated', withDirectory(async dir => {
  const app = buildApp({ dataDir: dir });
  try {
    let r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
    let s = r.json();
    const base = '/api/sessions/' + s.id;
    r = await app.inject({ method: 'PUT', url: base + '/persistence',
      payload: { expectedRevision: s.revision, mode: 'disk' } });
    s = r.json();
    rmSync(join(dir, s.id + '.json'));
    r = await app.inject({ method: 'PUT', url: base + '/review',
      payload: { expectedRevision: s.revision, notes: 'Try to save' } });
    assert.equal(r.statusCode, 503);
    assert.equal(readdirSync(dir).filter(file => file.endsWith('.json')).length, 0);
  } finally { await app.close(); }
}));

test('an existing symlink at the target path cannot be overwritten during opt-in', withDirectory(async dir => {
  const app = buildApp({ dataDir: dir });
  const victim = join(dir, 'protected-victim.txt');
  writeFileSync(victim, 'Do not modify this unrelated file');
  try {
    let r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
    const s = r.json();
    try {
      symlinkSync(victim, join(dir, s.id + '.json'));
    } catch (error) {
      if (process.platform === 'win32' && (error.code === 'EPERM' || error.code === 'EACCES')) return;
      throw error;
    }
    r = await app.inject({ method: 'PUT', url: '/api/sessions/' + s.id + '/persistence',
      payload: { expectedRevision: s.revision, mode: 'disk' } });
    assert.equal(r.statusCode, 503);
    assert.equal(readFileSync(victim, 'utf8'), 'Do not modify this unrelated file');
    const status = await app.inject({ method: 'GET', url: '/api/sessions/' + s.id });
    assert.equal(status.json().persistence, 'memory');
  } finally { await app.close(); }
}));

test('saved session files have private mode on Unix-like systems', withDirectory(async dir => {
  if (process.platform === 'win32') return;
  const { statSync } = await import('node:fs');
  const app = buildApp({ dataDir: dir });
  try {
    let r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
    let s = r.json();
    r = await app.inject({ method: 'PUT', url: '/api/sessions/' + s.id + '/persistence',
      payload: { expectedRevision: s.revision, mode: 'disk' } });
    assert.equal(r.statusCode, 200);
    assert.equal(statSync(dir).mode & 0o077, 0);
    assert.equal(statSync(join(dir, s.id + '.json')).mode & 0o077, 0);
  } finally { await app.close(); }
}));

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../../../dist/api/app.js';

const intake = {
  role: 'Fictional Frontend Developer', location: 'Local', weeklyHours: 2,
  urgency: 'quarter', priorities: '', shiftTarget: '', bridgeTarget: '',
  evidence: []
};

function withDirectory(fn) {
  return async () => {
    const dir = mkdtempSync(join(tmpdir(), 'reboundops-test-'));
    try { await fn(dir); }
    finally { rmSync(dir, { recursive: true, force: true }); }
  };
}

test('persistence is unavailable by default and opting in without config is rejected', async () => {
  const app = buildApp();
  try {
    let r = await app.inject({ method: 'GET', url: '/api/persistence/status' });
    assert.equal(r.json().available, false);
    r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
    const session = r.json();
    r = await app.inject({
      method: 'PUT', url: '/api/sessions/' + session.id + '/persistence',
      payload: { expectedRevision: 0, mode: 'disk' }
    });
    assert.equal(r.statusCode, 503);
    const unchanged = await app.inject({ method: 'GET', url: '/api/sessions/' + session.id });
    assert.equal(unchanged.json().revision, 0);
    assert.equal(unchanged.json().persistence, 'memory');
  } finally { await app.close(); }
});

test('only explicitly opted-in sessions survive a new server process', withDirectory(async dir => {
  const app = buildApp({ dataDir: dir });
  let saved;
  let transient;
  try {
    let r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
    transient = r.json();
    r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
    saved = r.json();
    assert.equal(readdirSync(dir).length, 0);
    r = await app.inject({
      method: 'PUT', url: '/api/sessions/' + saved.id + '/persistence',
      payload: { expectedRevision: saved.revision, mode: 'disk' }
    });
    assert.equal(r.statusCode, 200);
    saved = r.json();
    assert.equal(saved.persistence, 'disk');
    assert.ok(readdirSync(dir).includes(saved.id + '.json'));
    const file = JSON.parse(readFileSync(join(dir, saved.id + '.json'), 'utf8'));
    assert.equal(file.formatVersion, 1);
    assert.equal(file.session.id, saved.id);
    r = await app.inject({
      method: 'PUT', url: '/api/sessions/' + saved.id + '/review',
      payload: { expectedRevision: saved.revision, notes: 'Follow-up across restart' }
    });
    assert.equal(r.statusCode, 200);
    saved = r.json();
  } finally { await app.close(); }
  const restarted = buildApp({ dataDir: dir });
  try {
    let r = await restarted.inject({ method: 'GET', url: '/api/sessions/' + saved.id });
    assert.equal(r.statusCode, 200);
    assert.equal(r.json().reviewNotes, 'Follow-up across restart');
    r = await restarted.inject({ method: 'GET', url: '/api/sessions/' + transient.id });
    assert.equal(r.statusCode, 404);
    r = await restarted.inject({ method: 'GET', url: '/api/sessions/saved' });
    assert.equal(r.statusCode, 200);
    assert.equal(r.json().length, 1);
    assert.equal(r.json()[0].id, saved.id);
  } finally { await restarted.close(); }
}));

test('opt-out removes saved file; delete removes disk copy; backups restore to memory', withDirectory(async dir => {
  const app = buildApp({ dataDir: dir });
  try {
    let r = await app.inject({ method: 'POST', url: '/api/sessions', payload: { intake } });
    let s = r.json();
    const base = '/api/sessions/' + s.id;
    r = await app.inject({ method: 'PUT', url: base + '/persistence', payload: { expectedRevision: s.revision, mode: 'disk' } });
    s = r.json();
    r = await app.inject({ method: 'PUT', url: base + '/persistence', payload: { expectedRevision: s.revision, mode: 'memory' } });
    s = r.json();
    assert.equal(s.persistence, 'memory');
    assert.equal(readdirSync(dir).filter(x => x.endsWith('.json')).length, 0);
    r = await app.inject({ method: 'PUT', url: base + '/persistence', payload: { expectedRevision: s.revision, mode: 'disk' } });
    s = r.json();
    r = await app.inject({ method: 'POST', url: '/api/sessions/restore', payload: { session: s } });
    assert.equal(r.statusCode, 201);
    assert.equal(r.json().persistence, 'memory');
    r = await app.inject({ method: 'DELETE', url: base, payload: { expectedRevision: s.revision } });
    assert.equal(r.statusCode, 204);
    assert.equal(readdirSync(dir).filter(x => x.endsWith('.json')).length, 0);
  } finally { await app.close(); }
}));

test('damaged snapshots and interrupted temp files are never overwritten or silently discarded', withDirectory(async dir => {
  const invalid = '9ea59434-a4ec-48eb-9e35-f76f5bf65367.json';
  const raw = '{"formatVersion":1,"session":{"broken":true}}';
  writeFileSync(join(dir, invalid), raw);
  writeFileSync(join(dir, '.interrupted.tmp'), 'partial');
  const app = buildApp({ dataDir: dir });
  try {
    const status = await app.inject({ method: 'GET', url: '/api/persistence/status' });
    assert.equal(status.json().warnings.length, 1);
    assert.equal(readFileSync(join(dir, invalid), 'utf8'), raw);
    assert.ok(readdirSync(dir).includes('.interrupted.tmp'));
    assert.equal(status.json().savedCount, 0);
  } finally { await app.close(); }
}));

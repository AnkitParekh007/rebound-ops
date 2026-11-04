import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CURRENT_SESSION_SCHEMA_VERSION, MIN_SUPPORTED_SESSION_SCHEMA_VERSION, SESSION_MIGRATIONS,
  SessionMigrationError, assertMigrationChain, migrateSession
} from '../dist/index.js';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = name => JSON.parse(readFileSync(join(fixtureDir, name), 'utf8'));
const v1 = () => load('session-v1.json');
const passThrough = value => value;

function code(fn) {
  try { fn(); } catch (error) {
    assert.ok(error instanceof SessionMigrationError, 'expected SessionMigrationError, got ' + error);
    return error.code;
  }
  assert.fail('expected a migration error');
}

test('registered chain is contiguous from the oldest supported version to the current schema', () => {
  assert.doesNotThrow(() => assertMigrationChain(
    SESSION_MIGRATIONS, MIN_SUPPORTED_SESSION_SCHEMA_VERSION, CURRENT_SESSION_SCHEMA_VERSION));
});

test('every frozen fixture from a supported version loads under the current schema', () => {
  const fixtures = readdirSync(fixtureDir).filter(f => /^session-v\d+\.json$/.test(f));
  const versions = fixtures.map(f => Number(f.match(/v(\d+)/)[1]));
  // A fixture must exist for every supported version, so no upgrade path goes untested.
  for (let v = MIN_SUPPORTED_SESSION_SCHEMA_VERSION; v <= CURRENT_SESSION_SCHEMA_VERSION; v++) {
    assert.ok(versions.includes(v), 'missing frozen fixture session-v' + v + '.json');
  }
  for (const file of fixtures) {
    const result = migrateSession(load(file));
    assert.equal(result.session.schemaVersion, CURRENT_SESSION_SCHEMA_VERSION, file);
  }
});

test('current-version fixture is preserved exactly, and the input is never mutated', () => {
  const raw = v1();
  const before = structuredClone(raw);
  const result = migrateSession(raw);
  assert.deepEqual(raw, before);
  assert.deepEqual(result.session, before);
  assert.equal(result.fromVersion, 1);
  assert.deepEqual(result.applied, []);
  // Spot-check that user-authored provenance survives.
  assert.equal(result.session.corrections.length, 1);
  assert.equal(result.session.intake.evidence[0].source.span.documentId, result.session.sourceDocuments[0].id);
  assert.match(result.session.reviewNotes, /first action completed/);
});

test('refuses snapshots from a newer build instead of downgrading them', () => {
  assert.equal(code(() => migrateSession({ ...v1(), schemaVersion: CURRENT_SESSION_SCHEMA_VERSION + 1 })), 'NEWER_VERSION');
});

test('rejects non-objects, missing or malformed versions and unsupported old versions', () => {
  assert.equal(code(() => migrateSession(null)), 'NOT_AN_OBJECT');
  assert.equal(code(() => migrateSession([v1()])), 'NOT_AN_OBJECT');
  const { schemaVersion, ...unversioned } = v1();
  assert.equal(code(() => migrateSession(unversioned)), 'MISSING_VERSION');
  assert.equal(code(() => migrateSession({ ...v1(), schemaVersion: '1' })), 'MISSING_VERSION');
  assert.equal(code(() => migrateSession({ ...v1(), schemaVersion: 1.5 })), 'MISSING_VERSION');
  assert.equal(code(() => migrateSession({ ...v1(), schemaVersion: 1 },
    { minVersion: 2, targetVersion: 2, migrations: [], validate: passThrough })), 'UNSUPPORTED_VERSION');
});

test('integrity failures surface as INVALID_SNAPSHOT without echoing content', () => {
  const tampered = v1();
  tampered.plan.plannedMinutes = 99999;
  let caught;
  try { migrateSession(tampered); } catch (error) { caught = error; }
  assert.equal(caught.code, 'INVALID_SNAPSHOT');
  assert.doesNotMatch(caught.message, /Fictional/);
});

// --- Chain mechanics, using a synthetic future chain (v1 → v2 → v3). ---
const futureChain = [
  { from: 1, to: 2, description: 'rename reviewNotes to notes',
    migrate: s => { const { reviewNotes, ...rest } = s; return { ...rest, notes: reviewNotes, schemaVersion: 2 }; } },
  { from: 2, to: 3, description: 'add tags',
    migrate: s => ({ ...s, tags: [], schemaVersion: 3 }) }
];
const future = { migrations: futureChain, targetVersion: 3, validate: passThrough };

test('applies every step in order from the snapshot version and keeps user text', () => {
  const result = migrateSession(v1(), future);
  assert.equal(result.session.schemaVersion, 3);
  assert.equal(result.session.notes, v1().reviewNotes);
  assert.equal('reviewNotes' in result.session, false);
  assert.deepEqual(result.session.tags, []);
  assert.deepEqual(result.applied, ['v1→v2: rename reviewNotes to notes', 'v2→v3: add tags']);
});

test('starts mid-chain for snapshots that are already partly upgraded', () => {
  const { reviewNotes, ...rest } = v1();
  const result = migrateSession({ ...rest, notes: reviewNotes, schemaVersion: 2 }, future);
  assert.deepEqual(result.applied, ['v2→v3: add tags']);
  assert.equal(result.fromVersion, 2);
});

test('a throwing or mislabelled step fails closed', () => {
  const throwing = [{ ...futureChain[0], migrate: () => { throw new Error('boom'); } }, futureChain[1]];
  assert.equal(code(() => migrateSession(v1(), { ...future, migrations: throwing })), 'MIGRATION_FAILED');
  const mislabelled = [{ ...futureChain[0], migrate: s => ({ ...s }) }, futureChain[1]];
  assert.equal(code(() => migrateSession(v1(), { ...future, migrations: mislabelled })), 'MIGRATION_FAILED');
});

test('a step that mutates its argument cannot corrupt the caller snapshot', () => {
  const raw = v1();
  const mutating = [{ ...futureChain[0], migrate: s => { s.intake.role = 'changed'; s.schemaVersion = 2; return s; } }, futureChain[1]];
  migrateSession(raw, { ...future, migrations: mutating });
  assert.equal(raw.intake.role, v1().intake.role);
});

test('broken or incomplete registries are rejected before any data is touched', () => {
  assert.throws(() => assertMigrationChain([futureChain[1]], 1, 3), /chain broken/);
  assert.throws(() => assertMigrationChain([futureChain[0]], 1, 3), /ends at v2/);
  assert.throws(() => migrateSession(v1(), { ...future, migrations: [futureChain[1]] }), /chain broken/);
});

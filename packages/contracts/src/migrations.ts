import { CURRENT_SESSION_SCHEMA_VERSION, type Session } from './schema.js';
import { validateRestoredSession } from './workflow.js';

/** A plain JSON object as read from disk or a backup file, before validation. */
export type RawSnapshot = Record<string, unknown>;

/**
 * One forward step between adjacent schema versions.
 *
 * Rules (see docs/schema-migrations.md):
 * - Operate on plain JSON only. Never import or rely on the *current* Zod
 *   schemas inside a migration: they change, a migration must not.
 * - Be pure and deterministic: no clock, randomness or I/O.
 * - Never drop user-authored content (claims, sources, corrections, notes).
 *   If a field is retired, carry its text into a surviving field.
 * - Set `schemaVersion` to `to` on the returned object.
 */
export interface SessionMigration {
  from: number;
  to: number;
  description: string;
  migrate(snapshot: RawSnapshot): RawSnapshot;
}

/**
 * Registered forward migrations, ordered by `from`. Version 1 is the first
 * persisted schema, so the chain is currently empty. Append `{ from: 1, to: 2 }`
 * when `CURRENT_SESSION_SCHEMA_VERSION` becomes 2.
 */
export const SESSION_MIGRATIONS: readonly SessionMigration[] = Object.freeze([]);

/** The oldest snapshot version this build can upgrade. */
export const MIN_SUPPORTED_SESSION_SCHEMA_VERSION = 1;

export type SessionMigrationErrorCode =
  | 'NOT_AN_OBJECT'
  | 'MISSING_VERSION'
  | 'NEWER_VERSION'
  | 'UNSUPPORTED_VERSION'
  | 'MIGRATION_FAILED'
  | 'INVALID_SNAPSHOT';

/** Carries a stable code only; never echoes snapshot content. */
export class SessionMigrationError extends Error {
  constructor(readonly code: SessionMigrationErrorCode, message: string) {
    super(message);
    this.name = 'SessionMigrationError';
  }
}

export interface MigrationOptions {
  /** Override for tests; defaults to SESSION_MIGRATIONS. */
  migrations?: readonly SessionMigration[];
  /** Override for tests; defaults to CURRENT_SESSION_SCHEMA_VERSION. */
  targetVersion?: number;
  /** Override for tests; defaults to MIN_SUPPORTED_SESSION_SCHEMA_VERSION. */
  minVersion?: number;
  /**
   * Final validation of the upgraded snapshot. Defaults to the full
   * provenance/budget validation used for restores.
   */
  validate?: (snapshot: unknown) => Session;
}

export interface MigrationResult {
  session: Session;
  fromVersion: number;
  toVersion: number;
  /** Descriptions of the steps that ran, oldest first. Empty if already current. */
  applied: string[];
}

function isRecord(value: unknown): value is RawSnapshot {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Throws unless the registry forms one contiguous chain from minVersion to target. */
export function assertMigrationChain(
  migrations: readonly SessionMigration[],
  minVersion: number,
  targetVersion: number
): void {
  let expected = minVersion;
  for (const step of migrations) {
    if (step.from !== expected || step.to !== expected + 1) {
      throw new Error(`Migration chain broken at v${step.from}→v${step.to}; expected v${expected}→v${expected + 1}.`);
    }
    expected = step.to;
  }
  if (expected !== targetVersion) {
    throw new Error(`Migration chain ends at v${expected} but the current schema is v${targetVersion}.`);
  }
}

/** Reads the declared schema version without trusting anything else in the snapshot. */
export function readSchemaVersion(raw: unknown): number {
  if (!isRecord(raw)) throw new SessionMigrationError('NOT_AN_OBJECT', 'Snapshot must be a JSON object.');
  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SessionMigrationError('MISSING_VERSION', 'Snapshot has no valid schemaVersion.');
  }
  return version;
}

/**
 * Upgrades a raw snapshot (disk file or JSON backup) to the current schema and
 * validates it. The input is never mutated. Snapshots written by a NEWER build
 * are refused rather than downgraded, so their data is never discarded.
 */
export function migrateSession(raw: unknown, options: MigrationOptions = {}): MigrationResult {
  const migrations = options.migrations ?? SESSION_MIGRATIONS;
  const targetVersion = options.targetVersion ?? CURRENT_SESSION_SCHEMA_VERSION;
  const minVersion = options.minVersion ?? MIN_SUPPORTED_SESSION_SCHEMA_VERSION;
  const validate = options.validate ?? ((value: unknown) => validateRestoredSession(value as Session));
  assertMigrationChain(migrations, minVersion, targetVersion);

  const fromVersion = readSchemaVersion(raw);
  if (fromVersion > targetVersion) {
    throw new SessionMigrationError('NEWER_VERSION',
      `Snapshot uses schema v${fromVersion}; this build supports up to v${targetVersion}. Upgrade ReboundOps to open it.`);
  }
  if (fromVersion < minVersion) {
    throw new SessionMigrationError('UNSUPPORTED_VERSION',
      `Snapshot schema v${fromVersion} is older than the oldest supported v${minVersion}.`);
  }

  let current: RawSnapshot = structuredClone(raw as RawSnapshot);
  const applied: string[] = [];
  for (const step of migrations) {
    if (step.from < fromVersion) continue;
    let next: RawSnapshot;
    try {
      next = step.migrate(structuredClone(current));
    } catch {
      throw new SessionMigrationError('MIGRATION_FAILED', `Migration v${step.from}→v${step.to} failed.`);
    }
    if (!isRecord(next) || next.schemaVersion !== step.to) {
      throw new SessionMigrationError('MIGRATION_FAILED',
        `Migration v${step.from}→v${step.to} did not produce schemaVersion ${step.to}.`);
    }
    current = next;
    applied.push(`v${step.from}→v${step.to}: ${step.description}`);
  }

  let session: Session;
  try {
    session = validate(current);
  } catch {
    throw new SessionMigrationError('INVALID_SNAPSHOT', 'Snapshot failed validation after migration.');
  }
  return { session, fromVersion, toVersion: targetVersion, applied };
}

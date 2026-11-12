/**
 * HTTP access to the operations store (R0). See docs/adr-0004-operations-store.md.
 *
 * The store is opened only when all of these hold:
 * - `REBOUNDOPS_DATA_DIR` is set (nothing is persisted otherwise), and
 * - at least one operations feature flag is on (`REBOUNDOPS_FEATURES`), and
 * - an operations route is actually called.
 *
 * So a default install never loads `node:sqlite` (an experimental module that
 * prints a warning), never creates the operations file and never takes its
 * lock. The store is closed with the Fastify app.
 *
 * These generic ledger routes are the foundation the feature routes build on;
 * each feature will add its own validated routes on top of them.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { OPERATIONS_STORE_RELATIVE_PATH } from './paths.js';
import { LocalModel } from './local-model.js';
import { BackupHashMismatchError, BackupNotFoundError, createBackup, listBackups, retentionNotice, verifiedBackupFile } from './backups.js';
import { planLegacyImport, type LedgerView } from './legacy-tracker.js';
import {
  FEATURE_FLAGS, OperationEventInputSchema, LegacyTrackerImportRequestSchema, MAX_LEGACY_TRACKER_BYTES, RecordRedactionRequestSchema,
  type FeatureFlag, type ResolvedFeatureFlags
} from '@reboundops/contracts';
import type { OperationsStore } from './store.js';

/** At most this many events in one batch request. */
export const MAX_EVENTS_PER_BATCH = 100;

type StoreModule = typeof import('./store.js');

const EMPTY_LEDGER: LedgerView = { revisionOf: () => 0, listEvents: () => [] };
type Unavailable = { status: 404 | 503; error: string; message: string };

export interface OperationsRouteOptions {
  readonly dataDir?: string;
  readonly features: ResolvedFeatureFlags;
  /** Optional local model (FND-05). Defaults to REBOUNDOPS_LOCAL_MODEL_URL / REBOUNDOPS_LOCAL_MODEL. */
  readonly localModel?: LocalModel;
}

export function registerOperationsRoutes(app: FastifyInstance, options: OperationsRouteOptions): void {
  const enabledFlags = (Object.keys(FEATURE_FLAGS) as FeatureFlag[]).filter((f) => options.features.enabled[f]);
  let mod: StoreModule | null = null;
  let store: OperationsStore | null = null;
  let opening: Promise<OperationsStore | Unavailable> | null = null;

  /** Why operations routes cannot run at all, or null when they can. */
  function unavailable(): Unavailable | null {
    if (enabledFlags.length === 0) {
      return { status: 404, error: 'OPERATIONS_DISABLED', message: 'No operations feature is enabled.' };
    }
    if (!options.dataDir) {
      return { status: 503, error: 'OPERATIONS_STORE_NOT_CONFIGURED', message: 'Set REBOUNDOPS_DATA_DIR to keep operations records on this computer.' };
    }
    return null;
  }

  /** True when the store has never been created in this data directory. */
  function storeFileMissing(): boolean {
    return !store && Boolean(options.dataDir) && !existsSync(join(options.dataDir!, OPERATIONS_STORE_RELATIVE_PATH));
  }

  async function open(): Promise<OperationsStore | Unavailable> {
    const refused = unavailable();
    const dataDir = options.dataDir;
    if (refused || !dataDir) return refused ?? { status: 503, error: 'OPERATIONS_STORE_NOT_CONFIGURED', message: 'Set REBOUNDOPS_DATA_DIR.' };
    if (store) return store;
    mod ??= await import('./store.js');
    try {
      store = mod.OperationsStore.open(dataDir);
      return store;
    } catch (error) {
      if (error instanceof mod.OperationsStoreLockedError) {
        return { status: 503, error: 'OPERATIONS_STORE_LOCKED', message: error.message };
      }
      if (error instanceof mod.OperationsStoreVersionError) {
        return { status: 503, error: 'OPERATIONS_STORE_NEWER_VERSION', message: error.message };
      }
      throw error;
    }
  }

  /** One open at a time; a failed open is retried on the next request. */
  async function getStore(): Promise<OperationsStore | Unavailable> {
    if (store) return store;
    opening ??= open().finally(() => { opening = null; });
    return opening;
  }

  function sendStoreError(reply: FastifyReply, error: unknown) {
    if (!mod) throw error;
    if (error instanceof mod.RevisionConflictError) {
      return reply.code(409).send({ error: 'STALE_REVISION', expectedRevision: error.expected, currentRevision: error.current });
    }
    if (error instanceof mod.IdempotencyConflictError) {
      return reply.code(409).send({ error: 'EVENT_ID_REUSED', eventId: error.eventId });
    }
    if (error instanceof mod.EventPayloadTooLargeError) {
      return reply.code(413).send({ error: 'EVENT_PAYLOAD_TOO_LARGE', message: error.message });
    }
    if (error instanceof mod.ReservedEventTypeError) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', issues: [{ path: 'type', message: error.message }] });
    }
    if (error instanceof mod.RecordNotFoundError) {
      return reply.code(404).send({ error: 'RECORD_NOT_FOUND', message: error.message });
    }
    throw error;
  }

  app.addHook('onClose', async () => {
    store?.close();
    store = null;
  });

  app.get('/api/operations/status', async () => ({
    enabledFeatures: enabledFlags,
    unknownFeatureNames: options.features.unknown,
    storeConfigured: Boolean(options.dataDir),
    storeOpen: Boolean(store),
    schemaVersion: store?.schemaVersion ?? null
  }));

  // Append events atomically: all of them, or none. Each event carries its own
  // id (a retry is idempotent) and the revision it expects (409 when stale).
  app.post('/api/operations/events', async (request, reply) => {
    const body = request.body as { events?: unknown } | null;
    const raws = body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 1 ? body.events : undefined;
    if (!Array.isArray(raws) || raws.length < 1 || raws.length > MAX_EVENTS_PER_BATCH) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', issues: [{ path: 'events', message: `Send { events: [...] } with 1 to ${MAX_EVENTS_PER_BATCH} events.` }] });
    }
    const events = [];
    for (const [index, raw] of raws.entries()) {
      const parsed = OperationEventInputSchema.safeParse(raw);
      if (!parsed.success) return invalid(reply, parsed.error, `events.${index}`);
      events.push(parsed.data);
    }
    const opened = await getStore();
    if (!('appendEvents' in opened)) return reply.code(opened.status).send({ error: opened.error, message: opened.message });
    try {
      const results = opened.appendEvents(events);
      const appended = results.some((r) => r.status === 'appended');
      return reply.code(appended ? 201 : 200).send({ results });
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  // Local model (FND-05). Reading the status never contacts the model; only
  // an explicit check does, and only a loopback endpoint is ever contacted.
  const localModel = options.localModel ?? LocalModel.fromEnv();
  const modelSummary = () => {
    const c = localModel.config;
    return {
      configured: c.state === 'configured',
      status: c.state === 'configured' ? 'not_checked' : c.state,
      model: c.state === 'not_configured' ? null : c.model,
      endpoint: c.state === 'configured' ? c.origin : null,
      detail: c.state === 'invalid_config' ? c.detail
        : c.state === 'not_configured' ? 'No local model is configured. Every feature works without one.'
        : 'Configured. Run a check to see whether it answers.'
    };
  };
  app.get('/api/operations/local-model', async (_request, reply) => {
    if (enabledFlags.length === 0) return reply.code(404).send({ error: 'OPERATIONS_DISABLED', message: 'No operations feature is enabled.' });
    return modelSummary();
  });
  app.post('/api/operations/local-model/check', async (_request, reply) => {
    if (enabledFlags.length === 0) return reply.code(404).send({ error: 'OPERATIONS_DISABLED', message: 'No operations feature is enabled.' });
    return localModel.health();
  });

  // Legacy tracker import (FND-03). The caller sends the file's text; the API
  // never opens or changes the original. A dry run reports without writing.
  // JSON escaping can grow text up to six times (a control character becomes
  // \u00XX), so the body limit covers the full permitted text in the worst
  // case; the 2 MiB check on the decoded text then applies.
  app.post('/api/operations/imports/legacy-tracker', { bodyLimit: 6 * MAX_LEGACY_TRACKER_BYTES + 64 * 1024 }, async (request, reply) => {
    const parsed = LegacyTrackerImportRequestSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const refused = unavailable();
    if (refused) return reply.code(refused.status).send({ error: refused.error, message: refused.message });
    // A dry run writes nothing, including the store file: before the first
    // real import there is no ledger to compare with, so plan against an
    // empty one instead of creating the store.
    if (parsed.data.dryRun && storeFileMissing()) {
      return reply.send({ report: planLegacyImport(parsed.data, EMPTY_LEDGER).report });
    }
    const opened = await getStore();
    if (!('appendEvents' in opened)) return reply.code(opened.status).send({ error: opened.error, message: opened.message });
    // Planning and appending run with no await between them, so no other
    // request can change the ledger in between.
    const plan = planLegacyImport(parsed.data, opened);
    if (!parsed.data.dryRun && plan.events.length > 0) {
      try {
        opened.appendEvents(plan.events);
      } catch (error) {
        return sendStoreError(reply, error);
      }
    }
    return reply.send({ report: plan.report });
  });

  // Backups (FND-06). Listing never opens the store.
  app.get('/api/operations/backups', async (_request, reply) => {
    const refused = unavailable();
    if (refused) return reply.code(refused.status).send({ error: refused.error, message: refused.message });
    return { backups: listBackups(options.dataDir!) };
  });

  app.post('/api/operations/backups', async (_request, reply) => {
    const opened = await getStore();
    if (!('appendEvents' in opened)) return reply.code(opened.status).send({ error: opened.error, message: opened.message });
    return reply.code(201).send({ backup: createBackup(opened, options.dataDir!, 'manual') });
  });

  // Replaces every operations record with the backup's. The body must be
  // exactly { confirm: true }. The current state is backed up first, so a
  // restore can itself be undone by restoring that backup.
  app.post('/api/operations/backups/:name/restore', async (request, reply) => {
    const body = request.body as Record<string, unknown> | null;
    if (!body || typeof body !== 'object' || Array.isArray(body) || body.confirm !== true || Object.keys(body).length !== 1) {
      return reply.code(400).send({ error: 'RESTORE_CONFIRMATION_REQUIRED', message: 'Send { "confirm": true } to replace every operations record with this backup.' });
    }
    const opened = await getStore();
    if (!('appendEvents' in opened)) return reply.code(opened.status).send({ error: opened.error, message: opened.message });
    const { name } = request.params as { name: string };
    try {
      const { file, manifest } = verifiedBackupFile(options.dataDir!, name);
      opened.checkBackup(file);
      const preRestoreBackup = createBackup(opened, options.dataDir!, 'pre_restore');
      const restored = opened.restoreFrom(file);
      return { restoredFrom: manifest.name, restored, preRestoreBackup };
    } catch (error) {
      if (error instanceof BackupNotFoundError) return reply.code(404).send({ error: 'BACKUP_NOT_FOUND', message: error.message });
      if (error instanceof BackupHashMismatchError) return reply.code(409).send({ error: 'BACKUP_HASH_MISMATCH', message: error.message });
      if (mod && error instanceof mod.BackupInvalidError) return reply.code(422).send({ error: 'BACKUP_INVALID', reason: error.reason, message: error.message });
      throw error;
    }
  });

  // Redaction (FND-06). Replaces every earlier payload of one record with {}
  // and appends a record.redacted event. Backups taken earlier still hold the
  // content; the response lists them, and the API never deletes them.
  app.post('/api/operations/entities/:entityType/:entityId/redact', async (request, reply) => {
    const { entityType, entityId } = request.params as { entityType: string; entityId: string };
    const shape = OperationEventInputSchema.shape;
    const type = shape.entityType.safeParse(entityType);
    if (!type.success) return invalid(reply, type.error, 'entityType');
    const id = shape.entityId.safeParse(entityId);
    if (!id.success) return invalid(reply, id.error, 'entityId');
    const parsed = RecordRedactionRequestSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const opened = await getStore();
    if (!('redactRecord' in opened)) return reply.code(opened.status).send({ error: opened.error, message: opened.message });
    try {
      const result = opened.redactRecord(entityType, entityId, parsed.data);
      return { ...result, retention: retentionNotice(options.dataDir!) };
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  app.get('/api/operations/entities/:entityType/:entityId/events', async (request, reply) => {
    const { entityType, entityId } = request.params as { entityType: string; entityId: string };
    const shape = OperationEventInputSchema.shape;
    const type = shape.entityType.safeParse(entityType);
    if (!type.success) return invalid(reply, type.error, 'entityType');
    const id = shape.entityId.safeParse(entityId);
    if (!id.success) return invalid(reply, id.error, 'entityId');
    const opened = await getStore();
    if (!('listEvents' in opened)) return reply.code(opened.status).send({ error: opened.error, message: opened.message });
    return { revision: opened.revisionOf(entityType, entityId), events: opened.listEvents(entityType, entityId) };
  });
}

type Issues = { issues: readonly { path: readonly PropertyKey[]; message: string }[] };

function invalid(reply: FastifyReply, error: Issues, prefix?: string) {
  return reply.code(400).send({
    error: 'INVALID_REQUEST',
    issues: error.issues.map((issue) => ({
      path: [prefix, ...issue.path.map(String)].filter(Boolean).join('.'),
      message: issue.message
    }))
  });
}

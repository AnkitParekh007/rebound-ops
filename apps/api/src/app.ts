import Fastify, { type FastifyReply } from 'fastify';
import { randomUUID, createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadAiProvider, type AiProvider } from './provider.js';
import { SessionStore, SessionStorageError } from './storage.js';
import {
  ActionDecisionSchema, AddJobTargetSchema, AiPreviewRequestSchema, AiAnalyzeRequestSchema, CreateSessionSchema, DeleteTargetSchema,
  EvidenceDecisionSchema, CorrectEvidenceSchema, AddSourceDocumentSchema, PersistenceChoiceSchema,
  ReviewRequirementSchema, RestoreSessionRequestSchema,
  ReplaceIntakeSchema, ReviewSchema, SelectRouteSchema, SessionSchema,
  completeAction, createSession, decideEvidence, exportMarkdown, recordReview,
  replaceIntake, selectRoute, addJobTarget, removeJobTarget, reviewRequirement,
  addSourceDocument, removeSourceDocument, correctEvidence,
  validateRestoredSession, createAiPayload, validateAiAnalysis, type Session,
  CURRENT_SESSION_SCHEMA_VERSION, MIN_SUPPORTED_SESSION_SCHEMA_VERSION, migrateSession,
  SessionMigrationError, type MigrationOptions
} from '@reboundops/contracts';

const allowedOrigins = new Set([
  'http://localhost:4200', 'http://127.0.0.1:4200',
  'http://localhost:4174', 'http://127.0.0.1:4174'
]);

type IdParams = { id: string };
type EvidenceParams = IdParams & { evidenceId: string };
type ActionParams = IdParams & { actionId: string };
type TargetParams = IdParams & { targetId: string };
type RequirementParams = TargetParams & { requirementId: string };
type DocumentParams = IdParams & { documentId: string };

type AiCounterState = {
  attempts: number;
  successful: number;
  failed: number;
  reportedInputTokens: number;
  reportedOutputTokens: number;
};

function resolveAiCounterPath(dataDir?: string, override?: string | null): string | null {
  if (override === null) return null;
  if (override) return override;
  if (process.env.REBOUNDOPS_AI_COUNTER_FILE) return process.env.REBOUNDOPS_AI_COUNTER_FILE;
  if (dataDir) return join(dataDir, 'ai-attempt-counters.json');
  return null;
}

function readAiCounters(file: string | null): AiCounterState {
  const empty = { attempts: 0, successful: 0, failed: 0, reportedInputTokens: 0, reportedOutputTokens: 0 };
  if (!file || !existsSync(file)) return empty;
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<AiCounterState>;
    return {
      attempts: Number.isSafeInteger(parsed.attempts) && (parsed.attempts ?? 0) >= 0 ? parsed.attempts! : 0,
      successful: Number.isSafeInteger(parsed.successful) && (parsed.successful ?? 0) >= 0 ? parsed.successful! : 0,
      failed: Number.isSafeInteger(parsed.failed) && (parsed.failed ?? 0) >= 0 ? parsed.failed! : 0,
      reportedInputTokens: Number.isSafeInteger(parsed.reportedInputTokens) && (parsed.reportedInputTokens ?? 0) >= 0 ? parsed.reportedInputTokens! : 0,
      reportedOutputTokens: Number.isSafeInteger(parsed.reportedOutputTokens) && (parsed.reportedOutputTokens ?? 0) >= 0 ? parsed.reportedOutputTokens! : 0
    };
  } catch {
    return empty;
  }
}

function writeAiCounters(file: string | null, state: AiCounterState): void {
  if (!file) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

export function buildApp(options: {
  aiProvider?: AiProvider; dataDir?: string;
  /** Test seam: override the migration chain. Production uses the registered chain. */
  sessionMigration?: MigrationOptions;
  /** Test seam: absolute path for durable AI attempt counters, or null to force memory-only. */
  aiCounterFile?: string | null;
  /** Test seam: override max AI attempts (defaults to env or 10). */
  maxAiAttempts?: number;
} = {}) {
  const app = Fastify({ logger: false, bodyLimit: 128 * 1024 });
  const sessions = new SessionStore(options.dataDir, { migration: options.sessionMigration });
  const aiProvider = options.aiProvider ?? loadAiProvider();
  const aiCounterFile = resolveAiCounterPath(options.dataDir, options.aiCounterFile);
  const stored = readAiCounters(aiCounterFile);
  let aiRequests = stored.attempts;
  let aiSuccesses = stored.successful;
  let aiFailures = stored.failed;
  let reportedInputTokens = stored.reportedInputTokens;
  let reportedOutputTokens = stored.reportedOutputTokens;
  const envMax = Number.parseInt(process.env.REBOUNDOPS_AI_MAX_ATTEMPTS ?? '', 10);
  const maxAiAttempts = options.maxAiAttempts
    ?? (Number.isSafeInteger(envMax) && envMax > 0 ? envMax : 10);
  const maxAiPayloadBytes = 20_000;
  const now = () => new Date().toISOString();
  const persistAiCounters = () => writeAiCounters(aiCounterFile, {
    attempts: aiRequests,
    successful: aiSuccesses,
    failed: aiFailures,
    reportedInputTokens,
    reportedOutputTokens
  });

  app.addHook('onRequest', async (request, reply) => {
    // Explicitly refuse DNS rebinding and browser cross-site requests; never
    // trust an arbitrary Host header just because the listener is on loopback.
    const host = request.headers.host ?? '';
    if (!/^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/i.test(host)) {
      return reply.code(403).send({ error: 'HOST_REJECTED' });
    }
    if (request.headers['sec-fetch-site'] === 'cross-site') {
      return reply.code(403).send({ error: 'CROSS_SITE_REJECTED' });
    }
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      return reply.code(403).send({ error: 'ORIGIN_REJECTED' });
    }
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
  });

  function invalid(reply: FastifyReply, error: { issues: readonly { path: PropertyKey[]; message: string }[] }) {
    return reply.code(400).send({
      error: 'INVALID_REQUEST',
      issues: error.issues.map(issue => ({ path: issue.path.map(String).join('.'), message: issue.message }))
    });
  }

  function mutate(id: string, expectedRevision: number, reply: FastifyReply, update: (session: Session) => Session) {
    const current = sessions.get(id);
    if (!current) return reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
    if (current.revision !== expectedRevision) {
      return reply.code(409).send({ error: 'STALE_REVISION', session: current });
    }
    try {
      const next = validateRestoredSession({
        ...update(current), revision: current.revision + 1, updatedAt: now()
      });
      sessions.put(next);
      return reply.send(next);
    } catch (error) {
      if (error instanceof SessionStorageError) {
        return reply.code(503).send({ error: 'LOCAL_STORAGE_UNAVAILABLE' });
      }
      return reply.code(400).send({ error: 'INVALID_TRANSITION', message: error instanceof Error ? error.message : 'Invalid change' });
    }
  }

  let connectionStatus: 'not-tested' | 'connected' | 'failed' = 'not-tested';
  let connectionCheckedAt: string | null = null;
  let connectionTestBusy = false;
  let lastConnectionTest = 0;

  app.post('/api/ai/test-connection', async (request, reply) => {
    const body = request.body as Record<string, unknown> | null;
    if (!body || typeof body !== 'object' || Array.isArray(body) || body.consent !== true || Object.keys(body).length !== 1) {
      return reply.code(400).send({ error: 'CONNECTION_TEST_CONSENT_REQUIRED' });
    }
    if (!aiProvider) return reply.code(503).send({ error: 'AI_NOT_CONFIGURED' });
    if (!aiProvider.checkConnection) return reply.code(503).send({ error: 'CONNECTION_TEST_UNAVAILABLE' });
    if (connectionTestBusy || Date.now() - lastConnectionTest < 30_000) {
      return reply.header('Retry-After', '30').code(429).send({ error: 'CONNECTION_TEST_RATE_LIMITED' });
    }
    connectionTestBusy = true;
    lastConnectionTest = Date.now();
    try {
      await aiProvider.checkConnection();
      connectionStatus = 'connected';
      connectionCheckedAt = now();
      return { connected: true, checkedAt: connectionCheckedAt };
    } catch {
      connectionStatus = 'failed';
      connectionCheckedAt = now();
      return reply.code(502).send({ error: 'AI_CONNECTION_FAILED' });
    } finally {
      connectionTestBusy = false;
    }
  });

  app.get('/api/ai/status', async () => ({
    enabled: Boolean(aiProvider),
    provider: aiProvider?.name ?? null,
    model: aiProvider?.model ?? null,
    promptVersion: aiProvider?.promptVersion ?? null,
    connectionStatus: aiProvider ? connectionStatus : 'not-configured',
    connectionCheckedAt,
    disclosure: 'Connection tests request model metadata without career records. Career reviews require preview and consent to the exact payload.',
    attempts: aiRequests,
    maxAttempts: maxAiAttempts,
    successful: aiSuccesses,
    failed: aiFailures,
    reportedInputTokens,
    reportedOutputTokens,
    countersDurable: Boolean(aiCounterFile),
    spendCeiling: 'Set a provider-side workspace spend limit before live calls. Local attempt counters are not a currency ceiling.'
  }));

  app.get('/api/health', async () => ({
    status: 'ok', mode: 'local-only', persistence: sessions.available ? 'opt-in-disk' : 'memory',
    aiEnabled: Boolean(aiProvider), schemaVersion: CURRENT_SESSION_SCHEMA_VERSION,
    minSupportedSchemaVersion: MIN_SUPPORTED_SESSION_SCHEMA_VERSION
  }));

  app.get('/api/persistence/status', async () => ({
    available: sessions.available,
    savedCount: sessions.listSaved().length,
    warnings: sessions.warnings,
    migratedSessions: sessions.migratedCount,
    disclosure: 'Disk storage is opt-in per session, after setting REBOUNDOPS_DATA_DIR on this computer.'
  }));

  app.get('/api/sessions/saved', async () => sessions.listSaved());

  app.post('/api/sessions', async (request, reply) => {
    const parsed = CreateSessionSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const session = createSession(parsed.data.intake, randomUUID(), now());
    if (sessions.size >= 100) return reply.code(503).send({ error: 'SESSION_CAPACITY_REACHED' });
    sessions.put(session);
    return reply.code(201).send(session);
  });

  app.post('/api/sessions/restore', async (request, reply) => {
    const parsed = RestoreSessionRequestSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    if (sessions.size >= 100) return reply.code(503).send({ error: 'SESSION_CAPACITY_REACHED' });
    let snapshot: Session;
    try {
      // Older backups are upgraded in memory; the user's file is never modified.
      snapshot = migrateSession(parsed.data.session, options.sessionMigration).session;
    } catch (error) {
      if (error instanceof SessionMigrationError && error.code === 'NEWER_VERSION') {
        return reply.code(400).send({ error: 'BACKUP_FROM_NEWER_VERSION', message: error.message });
      }
      return reply.code(400).send({ error: 'INVALID_BACKUP' });
    }
    try {
      // Restoration is a new local session, with a new ID and fresh revision, not a remote sync.
      const timestamp = now();
      const session = validateRestoredSession({
        ...snapshot,
        id: randomUUID(),
        revision: 0,
        persistence: 'memory', // Import never silently opts into saving on disk.
        createdAt: timestamp,
        updatedAt: timestamp
      });
      sessions.put(session);
      return reply.code(201).send(session);
    } catch {
      return reply.code(400).send({ error: 'INVALID_BACKUP' });
    }
  });

  app.get<{ Params: IdParams }>('/api/sessions/:id', async (request, reply) => {
    const session = sessions.get(request.params.id);
    return session ? reply.send(session) : reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
  });

  app.delete<{ Params: IdParams }>('/api/sessions/:id', async (request, reply) => {
    const parsed = DeleteTargetSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const current = sessions.get(request.params.id);
    if (!current) return reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
    if (current.revision !== parsed.data.expectedRevision) {
      return reply.code(409).send({ error: 'STALE_REVISION', session: current });
    }
    try {
      sessions.delete(request.params.id);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof SessionStorageError) {
        return reply.code(503).send({ error: 'LOCAL_STORAGE_UNAVAILABLE' });
      }
      return reply.code(500).send({ error: 'DELETE_FAILED' });
    }
  });

  app.put<{ Params: IdParams }>('/api/sessions/:id/persistence', async (request, reply) => {
    const parsed = PersistenceChoiceSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    if (parsed.data.mode === 'disk' && !sessions.available) {
      return reply.code(503).send({ error: 'PERSISTENCE_NOT_CONFIGURED' });
    }
    return mutate(request.params.id, parsed.data.expectedRevision, reply,
      session => ({ ...session, persistence: parsed.data.mode }));
  });

  app.put<{ Params: IdParams }>('/api/sessions/:id/intake', async (request, reply) => {
    const parsed = ReplaceIntakeSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    return mutate(request.params.id, parsed.data.expectedRevision, reply, session => replaceIntake(session, parsed.data.intake));
  });

  app.put<{ Params: EvidenceParams }>('/api/sessions/:id/evidence/:evidenceId', async (request, reply) => {
    const parsed = EvidenceDecisionSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    return mutate(request.params.id, parsed.data.expectedRevision, reply, session =>
      decideEvidence(session, request.params.evidenceId, parsed.data.status));
  });

  app.post<{ Params: IdParams }>('/api/sessions/:id/documents', async (request, reply) => {
    const parsed = AddSourceDocumentSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const { expectedRevision, ...input } = parsed.data;
    return mutate(request.params.id, expectedRevision, reply, session =>
      addSourceDocument(session, input, randomUUID()));
  });

  app.delete<{ Params: DocumentParams }>('/api/sessions/:id/documents/:documentId', async (request, reply) => {
    const parsed = DeleteTargetSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    return mutate(request.params.id, parsed.data.expectedRevision, reply, session =>
      removeSourceDocument(session, request.params.documentId));
  });

  app.put<{ Params: EvidenceParams }>('/api/sessions/:id/evidence/:evidenceId/correction', async (request, reply) => {
    const parsed = CorrectEvidenceSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    return mutate(request.params.id, parsed.data.expectedRevision, reply, session =>
      correctEvidence(session, request.params.evidenceId, parsed.data, now()));
  });

  app.post<{ Params: IdParams }>('/api/sessions/:id/targets', async (request, reply) => {
    const parsed = AddJobTargetSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const { expectedRevision, ...input } = parsed.data;
    return mutate(request.params.id, expectedRevision, reply, session =>
      addJobTarget(session, input, randomUUID(), input.requirements.map(() => randomUUID())));
  });

  app.delete<{ Params: TargetParams }>('/api/sessions/:id/targets/:targetId', async (request, reply) => {
    const parsed = DeleteTargetSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    return mutate(request.params.id, parsed.data.expectedRevision, reply, session =>
      removeJobTarget(session, request.params.targetId));
  });

  app.put<{ Params: RequirementParams }>('/api/sessions/:id/targets/:targetId/requirements/:requirementId',
    async (request, reply) => {
      const parsed = ReviewRequirementSchema.safeParse(request.body);
      if (!parsed.success) return invalid(reply, parsed.error);
      return mutate(request.params.id, parsed.data.expectedRevision, reply, session =>
        reviewRequirement(session, request.params.targetId, request.params.requirementId,
          parsed.data.status, parsed.data.evidenceIds));
    });

  app.post<{ Params: IdParams }>('/api/sessions/:id/ai/preview', async (request, reply) => {
    const parsed = AiPreviewRequestSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const session = sessions.get(request.params.id);
    if (!session) return reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
    try {
      const payload = createAiPayload(session, parsed.data.targetId);
      if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > maxAiPayloadBytes) {
        return reply.code(413).send({ error: 'AI_PAYLOAD_TOO_LARGE' });
      }
      const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      return reply.send({
        provider: aiProvider?.name ?? 'not-configured',
        model: aiProvider?.model ?? null,
        enabled: Boolean(aiProvider),
        sessionRevision: session.revision,
        payload,
        previewHash: hash
      });
    } catch {
      return reply.code(404).send({ error: 'JOB_TARGET_NOT_FOUND' });
    }
  });

  app.post<{ Params: IdParams }>('/api/sessions/:id/ai/analyze', async (request, reply) => {
    const parsed = AiAnalyzeRequestSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    if (!aiProvider) return reply.code(503).send({ error: 'AI_DISABLED' });
    const session = sessions.get(request.params.id);
    if (!session) return reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
    if (session.revision !== parsed.data.expectedRevision) {
      return reply.code(409).send({ error: 'STALE_REVISION', session });
    }
    let payload;
    try {
      payload = createAiPayload(session, parsed.data.targetId);
    } catch {
      return reply.code(404).send({ error: 'JOB_TARGET_NOT_FOUND' });
    }
    const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    if (hash !== parsed.data.previewHash) return reply.code(409).send({ error: 'STALE_PREVIEW' });
    if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > maxAiPayloadBytes) {
      return reply.code(413).send({ error: 'AI_PAYLOAD_TOO_LARGE' });
    }
    if (aiRequests >= maxAiAttempts) return reply.code(429).send({ error: 'AI_REQUEST_LIMIT' });
    aiRequests += 1; // no automatic retry; count is durable when a counter file is configured
    persistAiCounters();
    try {
      const response = await aiProvider.analyze(payload);
      const detailed = 'analysis' in response ? response : { analysis: response, usage: null };
      const analysis = validateAiAnalysis(payload, detailed.analysis);
      const usage = detailed.usage;
      if (usage && (!Number.isSafeInteger(usage.inputTokens) || usage.inputTokens < 0 ||
          !Number.isSafeInteger(usage.outputTokens) || usage.outputTokens < 0)) {
        throw new Error('Invalid provider usage metadata.');
      }
      aiSuccesses++;
      if (usage) {
        reportedInputTokens += usage.inputTokens;
        reportedOutputTokens += usage.outputTokens;
      }
      persistAiCounters();
      // Provider output is never applied to evidence, job reviews or session state.
      return reply.send({
        analysis, usage, provider: aiProvider.name, model: aiProvider.model,
        promptVersion: aiProvider.promptVersion ?? null, autoApplied: false
      });
    } catch {
      aiFailures++;
      persistAiCounters();
      // Never log the provider input, API key or raw model response.
      return reply.code(502).send({ error: 'AI_RESULT_UNAVAILABLE' });
    }
  });

  app.put<{ Params: IdParams }>('/api/sessions/:id/route', async (request, reply) => {
    const parsed = SelectRouteSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    return mutate(request.params.id, parsed.data.expectedRevision, reply, session => selectRoute(session, parsed.data.routeId));
  });

  app.put<{ Params: ActionParams }>('/api/sessions/:id/actions/:actionId', async (request, reply) => {
    const parsed = ActionDecisionSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    return mutate(request.params.id, parsed.data.expectedRevision, reply, session =>
      completeAction(session, request.params.actionId, parsed.data.completed));
  });

  app.put<{ Params: IdParams }>('/api/sessions/:id/review', async (request, reply) => {
    const parsed = ReviewSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    return mutate(request.params.id, parsed.data.expectedRevision, reply, session => recordReview(session, parsed.data.notes));
  });

  app.get<{ Params: IdParams }>('/api/sessions/:id/export', async (request, reply) => {
    const session = sessions.get(request.params.id);
    if (!session) return reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
    if (!session.plan) return reply.code(409).send({ error: 'ROUTE_NOT_SELECTED' });
    return reply.type('text/markdown; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="reboundops-seven-day-plan.md"')
      .send(exportMarkdown(session));
  });

  return app;
}

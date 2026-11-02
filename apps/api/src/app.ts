import Fastify, { type FastifyReply } from 'fastify';
import { randomUUID, createHash } from 'node:crypto';
import { loadAiProvider, type AiProvider } from './provider.js';
import { SessionStore } from './storage.js';
import {
  ActionDecisionSchema, AddJobTargetSchema, AiPreviewRequestSchema, AiAnalyzeRequestSchema, CreateSessionSchema, DeleteTargetSchema,
  EvidenceDecisionSchema, CorrectEvidenceSchema, AddSourceDocumentSchema, PersistenceChoiceSchema,
  ReviewRequirementSchema, RestoreSessionSchema,
  ReplaceIntakeSchema, ReviewSchema, SelectRouteSchema, SessionSchema,
  completeAction, createSession, decideEvidence, exportMarkdown, recordReview,
  replaceIntake, selectRoute, addJobTarget, removeJobTarget, reviewRequirement,
  addSourceDocument, removeSourceDocument, correctEvidence,
  validateRestoredSession, createAiPayload, validateAiAnalysis, type Session
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

export function buildApp(options: { aiProvider?: AiProvider; dataDir?: string } = {}) {
  const app = Fastify({ logger: false, bodyLimit: 128 * 1024 });
  const sessions = new SessionStore(options.dataDir);
  const aiProvider = options.aiProvider ?? loadAiProvider();
  let aiRequests = 0;
  const now = () => new Date().toISOString();

  app.addHook('onRequest', async (request, reply) => {
    // The API is localhost-only; requests from arbitrary website origins are refused.
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      await reply.code(403).send({ error: 'ORIGIN_REJECTED' });
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
      return reply.code(400).send({ error: 'INVALID_TRANSITION', message: error instanceof Error ? error.message : 'Invalid change' });
    }
  }

  app.get('/api/ai/status', async () => ({
    enabled: Boolean(aiProvider),
    provider: aiProvider?.name ?? null,
    model: aiProvider?.model ?? null,
    disclosure: 'Data is not transmitted unless a user explicitly previews and consents to the exact payload.'
  }));

  app.get('/api/health', async () => ({
    status: 'ok', mode: 'local-only', persistence: sessions.available ? 'opt-in-disk' : 'memory',
    aiEnabled: Boolean(aiProvider), schemaVersion: 1
  }));

  app.get('/api/persistence/status', async () => ({
    available: sessions.available,
    savedCount: sessions.listSaved().length,
    warnings: sessions.warnings,
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
    const parsed = RestoreSessionSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    if (sessions.size >= 100) return reply.code(503).send({ error: 'SESSION_CAPACITY_REACHED' });
    try {
      const snapshot = validateRestoredSession(parsed.data.session);
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
    sessions.delete(request.params.id);
    return reply.code(204).send();
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
    if (aiRequests >= 10) return reply.code(429).send({ error: 'AI_REQUEST_LIMIT' });
    aiRequests += 1; // no automatic retry and bounded number of calls per API process
    try {
      const analysis = validateAiAnalysis(payload, await aiProvider.analyze(payload));
      // Suggestions are NOT written into the session and never auto-confirm evidence.
      return reply.send({
        analysis,
        provider: aiProvider.name,
        model: aiProvider.model,
        autoApplied: false
      });
    } catch {
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

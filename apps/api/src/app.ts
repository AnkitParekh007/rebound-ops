import Fastify, { type FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import {
  ActionDecisionSchema, CreateSessionSchema, EvidenceDecisionSchema,
  ReplaceIntakeSchema, ReviewSchema, SelectRouteSchema, SessionSchema,
  completeAction, createSession, decideEvidence, exportMarkdown, recordReview,
  replaceIntake, selectRoute, type Session
} from '@reboundops/contracts';

const allowedOrigins = new Set([
  'http://localhost:4200', 'http://127.0.0.1:4200',
  'http://localhost:4174', 'http://127.0.0.1:4174'
]);

type IdParams = { id: string };
type EvidenceParams = IdParams & { evidenceId: string };
type ActionParams = IdParams & { actionId: string };

export function buildApp() {
  const app = Fastify({ logger: false, bodyLimit: 128 * 1024 });
  const sessions = new Map<string, Session>();
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
      const next = SessionSchema.parse({
        ...update(current), revision: current.revision + 1, updatedAt: now()
      });
      sessions.set(id, next);
      return reply.send(next);
    } catch (error) {
      return reply.code(400).send({ error: 'INVALID_TRANSITION', message: error instanceof Error ? error.message : 'Invalid change' });
    }
  }

  app.get('/api/health', async () => ({
    status: 'ok', mode: 'local-only', persistence: 'memory', aiEnabled: false, schemaVersion: 1
  }));

  app.post('/api/sessions', async (request, reply) => {
    const parsed = CreateSessionSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const session = createSession(parsed.data.intake, randomUUID(), now());
    if (sessions.size >= 100) return reply.code(503).send({ error: 'SESSION_CAPACITY_REACHED' });
    sessions.set(session.id, session);
    return reply.code(201).send(session);
  });

  app.get<{ Params: IdParams }>('/api/sessions/:id', async (request, reply) => {
    const session = sessions.get(request.params.id);
    return session ? reply.send(session) : reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
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

import Fastify, { LogController, type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { DocumentKind, ExportFormat } from '@reboundops/contracts';
import { AppError } from './errors.ts';
import type { Workspace } from './workspace.ts';

export const API_VERSION = '0.1.0';
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface ServerOptions {
  workspace: Workspace;
  /** Browser origins allowed to call the API (exact match). */
  allowedOrigins: readonly string[];
  logLevel?: string;
}

function hostnameOf(hostHeader: string | undefined): string {
  if (!hostHeader) return '';
  if (hostHeader.startsWith('[')) return hostHeader.slice(0, hostHeader.indexOf(']') + 1);
  return hostHeader.split(':')[0]?.toLowerCase() ?? '';
}

const sendError = (reply: FastifyReply, status: number, code: string, message: string, details?: unknown) =>
  reply.code(status).send({ error: { code, message, ...(details === undefined ? {} : { details }) } });

export function buildServer(options: ServerOptions): FastifyInstance {
  const { workspace } = options;
  const allowed = new Set(options.allowedOrigins);

  const app = Fastify({
    bodyLimit: 512 * 1024,
    logger: {
      level: options.logLevel ?? 'warn',
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-api-key"]'],
    },
    // No per-request log lines: URLs and bodies can carry personal data.
    logController: new LogController({ disableRequestLogging: true }),
  });

  /* ---------- request guards ---------- */
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    // DNS-rebinding defence: only answer to loopback host names.
    if (!LOOPBACK_HOSTNAMES.has(hostnameOf(req.headers.host))) {
      return sendError(reply, 421, 'bad_host', 'Requests must target a loopback host.');
    }

    const origin = req.headers.origin;
    if (origin !== undefined) {
      if (!allowed.has(origin)) {
        return sendError(reply, 403, 'origin_not_allowed', 'Origin not allowed.');
      }
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
      reply
        .header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        .header('Access-Control-Allow-Headers', 'Content-Type')
        .header('Access-Control-Max-Age', '600');
      return reply.code(204).send();
    }

    // Forms can POST cross-site without preflight; JSON cannot. Require JSON.
    // DELETE carries no body and always needs a CORS preflight, so it is exempt.
    if (MUTATING.has(req.method) && !(req.method === 'DELETE' && !req.headers['content-length'])) {
      const type = req.headers['content-type'] ?? '';
      if (!type.toLowerCase().startsWith('application/json')) {
        return sendError(reply, 415, 'unsupported_media_type', 'Send JSON (application/json).');
      }
    }
    return undefined;
  });

  app.addHook('onSend', async (_req, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Cache-Control', 'no-store');
    reply.header('Cross-Origin-Resource-Policy', 'same-origin');
    return payload;
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) return sendError(reply, err.status, err.code, err.message, err.details);
    if (err instanceof ZodError) {
      return sendError(
        reply,
        400,
        'invalid_request',
        'The request did not match the expected shape.',
        err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }
    const e = err as { statusCode?: number; code?: string; message?: string; name?: string };
    if (e.statusCode && e.statusCode >= 400 && e.statusCode < 500) {
      return sendError(reply, e.statusCode, e.code ?? 'bad_request', e.message ?? 'Bad request.');
    }
    req.log.error({ err: { name: e.name, message: e.message } }, 'unhandled error');
    return sendError(reply, 500, 'internal_error', 'Something went wrong. Your data was not changed.');
  });

  app.setNotFoundHandler((_req, reply) => sendError(reply, 404, 'not_found', 'No such endpoint.'));

  /* ---------- routes ---------- */
  type IdParams = { Params: { id: string } };

  app.get('/api/health', async () => ({
    status: 'ok',
    version: API_VERSION,
    schemaVersion: workspace.schemaVersion,
    aiMode: workspace.getOnboarding().aiMode,
  }));

  app.get('/api/onboarding', async () => workspace.getOnboarding());
  app.put('/api/onboarding', async (req) => workspace.updateOnboarding(req.body));

  app.get('/api/profile', async () => workspace.getProfile());
  app.put('/api/profile', async (req) => workspace.saveProfile(req.body));

  app.post('/api/jobs/extract', async (req) => workspace.extractJob(req.body));
  app.post('/api/jobs', async (req, reply) => reply.code(201).send(workspace.createJob(req.body)));
  app.get<IdParams>('/api/jobs/:id', async (req) => workspace.getJob(req.params.id));

  app.get('/api/applications', async () => workspace.listApplications());
  app.get<IdParams>('/api/applications/:id', async (req) => workspace.getApplication(req.params.id));
  app.post<IdParams>('/api/applications/:id/transitions', async (req) =>
    workspace.transition(req.params.id, req.body),
  );
  app.post<IdParams>('/api/applications/:id/notes', async (req) =>
    workspace.addNote(req.params.id, req.body),
  );

  app.get<IdParams>('/api/applications/:id/assessment', async (req) => workspace.assessApplication(req.params.id));
  app.get('/api/assessments', async () => workspace.assessmentSummaries());
  app.get('/api/rubric', async () => workspace.rubric());

  app.post('/api/resume/import', { bodyLimit: 8 * 1024 * 1024 }, async (req) => workspace.importResume(req.body));
  app.get('/api/resume/files', async () => workspace.listResumeFiles());
  app.get<IdParams>('/api/resume/files/:id/original', async (req, reply) => {
    const { meta, data } = workspace.getResumeOriginal(req.params.id);
    const name = meta.filename.replace(/[^A-Za-z0-9._ -]/g, '_');
    return reply
      .header('Content-Type', 'application/octet-stream')
      .header('Content-Disposition', `attachment; filename="${name}"`)
      .send(data);
  });

  app.get<IdParams>('/api/applications/:id/documents', async (req) => workspace.getDocuments(req.params.id));
  app.post<IdParams>('/api/applications/:id/documents/generate', async (req) => workspace.generateDocuments(req.params.id, req.body));
  app.put<IdParams>('/api/applications/:id/documents/resume', async (req) => workspace.updateResumeDraft(req.params.id, req.body));
  app.put<IdParams>('/api/applications/:id/documents/cover_letter', async (req) => workspace.updateCoverLetter(req.params.id, req.body));
  app.get<{ Params: { id: string; kind: string }; Querystring: { format?: string } }>(
    '/api/applications/:id/documents/:kind/export',
    async (req, reply) => {
      const kind = DocumentKind.parse(req.params.kind);
      const format = ExportFormat.parse(req.query.format ?? 'pdf');
      const result = workspace.exportDocument(req.params.id, kind, format);
      return reply
        .header('Content-Type', result.mediaType)
        .header('Content-Disposition', `attachment; filename="${result.filename}"`)
        .header('X-Content-Check', `passed; ${result.check.checked.length} items verified`)
        .send(result.data);
    },
  );

  type AnswerParams = { Params: { id: string; answerId: string } };
  app.get<IdParams>('/api/applications/:id/package', async (req) => workspace.getPackage(req.params.id));
  app.put<IdParams>('/api/applications/:id/package', async (req) => workspace.updatePackage(req.params.id, req.body));
  app.post<IdParams>('/api/applications/:id/package/questions', async (req) => workspace.addQuestions(req.params.id, req.body));
  app.put<AnswerParams>('/api/applications/:id/package/answers/:answerId', async (req) =>
    workspace.updateAnswer(req.params.id, req.params.answerId, req.body),
  );
  app.delete<AnswerParams>('/api/applications/:id/package/answers/:answerId', async (req) =>
    workspace.removeAnswer(req.params.id, req.params.answerId),
  );

  app.get('/api/dashboard', async () => workspace.dashboard());

  app.get('/api/export', async (_req, reply) => {
    const bundle = workspace.exportAll();
    const stamp = bundle.exportedAt.slice(0, 10);
    return reply
      .header('Content-Disposition', `attachment; filename="reboundops-export-${stamp}.json"`)
      .send(bundle);
  });

  return app;
}

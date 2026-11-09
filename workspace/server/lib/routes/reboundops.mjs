/**
 * ReboundOps Next — narrow same-origin bridge to the ReboundOps Fastify API.
 *
 * This is a PROXY, not a second data store. It exposes allowlisted
 * actions and forwards them to a server-controlled destination:
 *
 *   GET  /api/rebound/ai/status                       → GET /api/ai/status
 *   POST /api/rebound/ai/test-connection              → POST /api/ai/test-connection
 *   GET  /api/rebound/health                          → GET  /api/health
 *   POST /api/rebound/sessions                        → POST /api/sessions
 *   GET  /api/rebound/sessions/:id                    → GET  /api/sessions/:id
 *   PUT  /api/rebound/sessions/:id/route              → PUT  /api/sessions/:id/route
 *   PUT  /api/rebound/sessions/:id/actions/:actionId  → PUT  /api/sessions/:id/actions/:actionId
 *   GET  /api/rebound/sessions/:id/export             → GET  /api/sessions/:id/export
 *   PUT  /api/rebound/sessions/:id/intake             → PUT  /api/sessions/:id/intake
 *   PUT  /api/rebound/sessions/:id/evidence/:evidenceId → PUT  /api/sessions/:id/evidence/:evidenceId
 *
 * Security properties (see docs/INTEGRATION-DEMO.md):
 *  - The destination host is fixed to 127.0.0.1; only the port can be changed,
 *    and only by the operator through REBOUNDOPS_API_PORT. Clients can never
 *    choose a URL, path or method.
 *  - Path params are validated (UUID session IDs, `<route>-<n>` action IDs).
 *  - Mutation bodies are rebuilt from validated fields only; anything else in
 *    the client body is dropped. The ReboundOps API re-validates everything
 *    with its strict Zod contracts.
 *  - No client header is forwarded (no Cookie, Authorization, Origin, Referer).
 *    The upstream request carries Host 127.0.0.1:<port>, which the Fastify
 *    Host/Origin guard already accepts — neither app's guard is weakened.
 *  - The existing ReboundOps Workspace requestGuard (Host allowlist + cross-site
 *    refusal for mutations) runs before these routes; mutations additionally
 *    use the existing writeRateLimit().
 *  - Bodies and exported Markdown are never logged. /api/rebound/* is not
 *    recorded by the activity log (it only maps known ReboundOps paths).
 *  - Nothing is written to the ReboundOps parent project.
 */
import { writeRateLimit } from '../rate-limit.mjs';

export const REBOUND_MAX_BODY_BYTES = 64 * 1024;
const TIMEOUT_MS = 5000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTION_RE = /^(?:return|shift|bridge)-[1-7]$/;
const ROUTE_IDS = new Set(['return', 'shift', 'bridge']);
const EVIDENCE_STATUS = new Set(['unverified', 'confirmed', 'rejected']);
const URGENCY = new Set(['soon', 'quarter', 'flexible']);
const INTAKE_STRINGS = { role: 120, location: 160, priorities: 1200, shiftTarget: 140, bridgeTarget: 140 };

export function reboundUpstream(env = process.env) {
  const port = Number(env.REBOUNDOPS_API_PORT || 4174);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('REBOUNDOPS_API_PORT must be an integer between 1024 and 65535');
  }
  return `http://127.0.0.1:${port}`;
}

function bad(res, message) {
  return res.status(400).json({ error: 'INVALID_REQUEST', message });
}

function isRevision(v) {
  return Number.isSafeInteger(v) && v >= 0;
}

/** Rebuild an intake from known fields only; reject wrong types up front. */
export function pickIntake(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'intake must be an object' };
  const intake = {};
  for (const [key, max] of Object.entries(INTAKE_STRINGS)) {
    const v = raw[key] ?? '';
    if (typeof v !== 'string') return { error: `${key} must be text` };
    if (v.length > max) return { error: `${key} is too long (max ${max})` };
    intake[key] = v;
  }
  if (!Number.isInteger(raw.weeklyHours) || raw.weeklyHours < 1 || raw.weeklyHours > 20) {
    return { error: 'weeklyHours must be a whole number from 1 to 20' };
  }
  intake.weeklyHours = raw.weeklyHours;
  if (!URGENCY.has(raw.urgency)) return { error: 'urgency must be soon, quarter or flexible' };
  intake.urgency = raw.urgency;
  const evidence = raw.evidence ?? [];
  if (!Array.isArray(evidence) || evidence.length > 15) return { error: 'evidence must be a list of at most 15 items' };
  intake.evidence = [];
  for (const item of evidence) {
    if (!item || typeof item !== 'object') return { error: 'invalid evidence item' };
    if (typeof item.id !== 'string' || !UUID_RE.test(item.id)) return { error: 'evidence id must be a UUID' };
    if (typeof item.claim !== 'string' || !item.claim.trim() || item.claim.length > 500) {
      return { error: 'evidence claim must be 1–500 characters' };
    }
    const label = item.source && item.source.label;
    if (typeof label !== 'string' || !label.trim() || label.length > 160) return { error: 'evidence source label is required' };
    // The bridge only creates manual, self-reported claims. They always start
    // unverified — the adapter never marks an achievement as confirmed.
    intake.evidence.push({ id: item.id, claim: item.claim, source: { kind: 'manual', label }, status: 'unverified' });
  }
  return { intake };
}

async function forward(res, method, path, body) {
  let upstream;
  try { upstream = reboundUpstream(); } catch { return res.status(500).json({ error: 'BRIDGE_MISCONFIGURED' }); }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), path === "/api/ai/test-connection" ? 15_000 : TIMEOUT_MS);
  let response;
  try {
    response = await fetch(upstream + path, {
      method,
      // Only these headers — nothing from the browser request is propagated.
      headers: body === undefined
        ? { accept: 'application/json' }
        : { accept: 'application/json', 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const timedOut = err && err.name === 'AbortError';
    return res.status(timedOut ? 504 : 503).json({
      error: timedOut ? 'RECOVERY_SERVICE_TIMEOUT' : 'RECOVERY_SERVICE_OFFLINE',
      message: 'Recovery service is offline. Start it with npm start (or npm run start -w @reboundops/api) from the rebound-ops folder.',
    });
  }
  try {
    const type = response.headers.get('content-type') || '';
    const text = await response.text();
    clearTimeout(timer);
    res.setHeader('Cache-Control', 'no-store');
    if (type.startsWith('text/markdown')) {
      res.status(response.status).type('text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="reboundops-seven-day-plan.md"');
      return res.send(text);
    }
    if (response.status === 204 || !text) return res.status(response.status).end();
    let json;
    try { json = JSON.parse(text); } catch { return res.status(502).json({ error: 'RECOVERY_SERVICE_BAD_RESPONSE' }); }
    return res.status(response.status).json(json);
  } catch {
    clearTimeout(timer);
    return res.status(502).json({ error: 'RECOVERY_SERVICE_BAD_RESPONSE' });
  }
}

function sizeGuard(req, res, next) {
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > REBOUND_MAX_BODY_BYTES) return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' });
  if (req.body !== undefined && Buffer.byteLength(JSON.stringify(req.body)) > REBOUND_MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' });
  }
  if (!req.is('application/json')) return res.status(415).json({ error: 'JSON_REQUIRED' });
  next();
}

function sessionId(req, res, next) {
  if (!UUID_RE.test(String(req.params.id || ''))) return bad(res, 'invalid session id');
  next();
}

export function registerReboundOpsRoutes(app) {
  app.get('/api/rebound/ai/status', (req, res) => forward(res, 'GET', '/api/ai/status'));
  app.post('/api/rebound/ai/test-connection', writeRateLimit(), sizeGuard, (req, res) => {
    if (!req.body || req.body.consent !== true || Object.keys(req.body).length !== 1) return bad(res, 'Explicit connection-test consent is required; send no career data');
    return forward(res, 'POST', '/api/ai/test-connection', { consent: true });
  });
  app.get('/api/rebound/health', (req, res) => forward(res, 'GET', '/api/health'));

  app.get('/api/rebound/runtime', (_req, res) => res.json({ recoveryUrl: reboundUpstream() }));
  app.get('/api/rebound/persistence/status', (_req, res) => forward(res, 'GET', '/api/persistence/status'));
  app.get('/api/rebound/sessions/saved', (_req, res) => forward(res, 'GET', '/api/sessions/saved'));
  app.post('/api/rebound/sessions/restore', writeRateLimit(), sizeGuard, (req, res) =>
    forward(res, 'POST', '/api/sessions/restore', { session: req.body?.session }));
  app.put('/api/rebound/sessions/:id/persistence', writeRateLimit(), sessionId, sizeGuard, (req, res) => {
    const { expectedRevision, mode } = req.body || {};
    if (!isRevision(expectedRevision) || !['disk', 'memory'].includes(mode)) return bad(res, 'Invalid persistence choice');
    return forward(res, 'PUT', `/api/sessions/${req.params.id}/persistence`, { expectedRevision, mode });
  });

  app.post('/api/rebound/sessions', writeRateLimit(), sizeGuard, (req, res) => {
    const { intake, error } = pickIntake(req.body && req.body.intake);
    if (error) return bad(res, error);
    return forward(res, 'POST', '/api/sessions', { intake });
  });

  app.get('/api/rebound/sessions/:id', sessionId, (req, res) =>
    forward(res, 'GET', `/api/sessions/${req.params.id}`));

  app.put('/api/rebound/sessions/:id/route', writeRateLimit(), sessionId, sizeGuard, (req, res) => {
    const { expectedRevision, routeId } = req.body || {};
    if (!isRevision(expectedRevision)) return bad(res, 'expectedRevision must be a non-negative integer');
    if (!ROUTE_IDS.has(routeId)) return bad(res, 'routeId must be return, shift or bridge');
    return forward(res, 'PUT', `/api/sessions/${req.params.id}/route`, { expectedRevision, routeId });
  });

  app.put('/api/rebound/sessions/:id/actions/:actionId', writeRateLimit(), sessionId, sizeGuard, (req, res) => {
    if (!ACTION_RE.test(String(req.params.actionId || ''))) return bad(res, 'invalid action id');
    const { expectedRevision, completed } = req.body || {};
    if (!isRevision(expectedRevision)) return bad(res, 'expectedRevision must be a non-negative integer');
    if (typeof completed !== 'boolean') return bad(res, 'completed must be true or false');
    return forward(res, 'PUT', `/api/sessions/${req.params.id}/actions/${req.params.actionId}`, { expectedRevision, completed });
  });

  // "Edit my answers": replaces the intake (the API then rebuilds routes and
  // clears the plan — the UI warns before calling this).
  app.put('/api/rebound/sessions/:id/intake', writeRateLimit(), sessionId, sizeGuard, (req, res) => {
    const { expectedRevision } = req.body || {};
    if (!isRevision(expectedRevision)) return bad(res, 'expectedRevision must be a non-negative integer');
    const { intake, error } = pickIntake(req.body && req.body.intake);
    if (error) return bad(res, error);
    return forward(res, 'PUT', `/api/sessions/${req.params.id}/intake`, { expectedRevision, intake });
  });

  // The person's own review of an achievement ("reviewed by me" / "set aside").
  // This is self-review, never external verification; the UI says so.
  app.put('/api/rebound/sessions/:id/evidence/:evidenceId', writeRateLimit(), sessionId, sizeGuard, (req, res) => {
    if (!UUID_RE.test(String(req.params.evidenceId || ''))) return bad(res, 'invalid evidence id');
    const { expectedRevision, status } = req.body || {};
    if (!isRevision(expectedRevision)) return bad(res, 'expectedRevision must be a non-negative integer');
    if (!EVIDENCE_STATUS.has(status)) return bad(res, 'status must be unverified, confirmed or rejected');
    return forward(res, 'PUT', `/api/sessions/${req.params.id}/evidence/${req.params.evidenceId}`, { expectedRevision, status });
  });

  app.put('/api/rebound/sessions/:id/actions/:actionId/experiment', writeRateLimit(), sessionId, sizeGuard, (req, res) => {
    const { expectedRevision, title } = req.body || {};
    if (!ACTION_RE.test(req.params.actionId) || !isRevision(expectedRevision) || typeof title !== 'string' || title.trim().length < 3 || title.length > 500) return bad(res, 'Choose an action and a task of 3–500 characters');
    return forward(res, 'PUT', `/api/sessions/${req.params.id}/actions/${req.params.actionId}/experiment`, { expectedRevision, title });
  });

  app.get('/api/rebound/sessions/:id/export' , sessionId, (req, res) =>
    forward(res, 'GET', `/api/sessions/${req.params.id}/export`));

  // Anything else under /api/rebound is not part of the allowlist.
  app.all('/api/rebound/*', (req, res) => res.status(404).json({ error: 'NOT_IN_ALLOWLIST' }));
}

import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import type { FastifyInstance } from 'fastify';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

export const CSP =
  "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

/** Resolves a URL path inside `root`, refusing anything that escapes it. */
export function safeResolve(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const full = resolve(root, `.${decoded.startsWith('/') ? decoded : `/${decoded}`}`);
  return full === root || full.startsWith(root + sep) ? full : null;
}

/** Serves the built Angular app from `dir` on the API's own origin, with SPA fallback. */
export function registerStatic(app: FastifyInstance, dir: string): void {
  const root = resolve(dir);
  const indexPath = resolve(root, 'index.html');
  if (!existsSync(indexPath)) throw new Error(`Web build not found at ${root}. Run "npm run build" first.`);

  const send = (reply: import('fastify').FastifyReply, path: string) => {
    const ext = extname(path);
    const hashed = /-[A-Z0-9]{8}\.(js|css)$/.test(path);
    reply.header('Content-Type', TYPES[ext] ?? 'application/octet-stream');
    reply.header('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
    if (ext === '.html') reply.header('Content-Security-Policy', CSP).header('X-Frame-Options', 'DENY');
    return reply.send(readFileSync(path));
  };

  app.get('/*', async (req, reply) => {
    if (req.url.startsWith('/api/') || req.url === '/api') {
      return reply.code(404).send({ error: { code: 'not_found', message: 'No such endpoint.' } });
    }
    const file = safeResolve(root, req.url);
    if (!file) return reply.code(400).send({ error: { code: 'bad_path', message: 'Invalid path.' } });
    if (existsSync(file) && statSync(file).isFile()) return send(reply, file);
    // Client-side routes fall back to the app shell; missing assets do not.
    if (extname(file)) return reply.code(404).send({ error: { code: 'not_found', message: 'Not found.' } });
    return send(reply, indexPath);
  });
}

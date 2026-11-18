import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ApiConfig {
  host: string;
  port: number;
  dataDir: string;
  allowedOrigins: string[];
  logLevel: string;
  webDist: string | null;
}

const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost']);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const host = env['REBOUND_API_HOST'] ?? '127.0.0.1';
  if (!LOOPBACK.has(host)) {
    throw new Error(`REBOUND_API_HOST must be a loopback address; got "${host}".`);
  }
  const port = Number(env['REBOUND_API_PORT'] ?? 4175);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('REBOUND_API_PORT must be an integer port.');
  }
  const rawDir = env['REBOUND_DATA_DIR'] ?? join(homedir(), '.reboundops');
  const dataDir = isAbsolute(rawDir) ? rawDir : resolve(rawDir);
  const webPort = Number(env['REBOUND_WEB_PORT'] ?? 4174);
  const defaults = [`http://localhost:${webPort}`, `http://127.0.0.1:${webPort}`];
  // When the API serves the web app itself, same-origin requests carry its own origin.
  if (port) defaults.push(`http://localhost:${port}`, `http://127.0.0.1:${port}`);
  const allowedOrigins = (env['REBOUND_ALLOWED_ORIGINS'] ?? defaults.join(','))
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const builtWeb = fileURLToPath(new URL('../../web/dist/browser', import.meta.url));
  const webDist = env['REBOUND_WEB_DIST'] === '' ? null : env['REBOUND_WEB_DIST'] ? resolve(env['REBOUND_WEB_DIST']) : ((existsSync(join(builtWeb, 'index.html')) ? builtWeb : null));
  return { host, port, dataDir, allowedOrigins, logLevel: env['REBOUND_LOG_LEVEL'] ?? 'warn', webDist };
}

import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

export interface ApiConfig {
  host: string;
  port: number;
  dataDir: string;
  allowedOrigins: string[];
  logLevel: string;
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
  const allowedOrigins = (env['REBOUND_ALLOWED_ORIGINS'] ?? `http://localhost:${webPort},http://127.0.0.1:${webPort}`)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return { host, port, dataDir, allowedOrigins, logLevel: env['REBOUND_LOG_LEVEL'] ?? 'warn' };
}

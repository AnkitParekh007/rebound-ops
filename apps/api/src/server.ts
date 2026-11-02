import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import fastifyStatic from '@fastify/static';
import { buildApp } from './app.js';

const app = buildApp();
const builds = [
  resolve(process.cwd(), 'dist/web/browser'),
  resolve(process.cwd(), '../../dist/web/browser')
];
const browserRoot = builds.find(existsSync);
if (browserRoot) {
  // Once compiled, API serves the Angular app on the same localhost origin.
  await app.register(fastifyStatic, { root: browserRoot, prefix: '/' });
}

const port = Number(process.env.PORT || 4174);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('PORT must be between 1024 and 65535');
}
await app.listen({ host: '127.0.0.1', port });
console.info('ReboundOps local API listening at http://127.0.0.1:' + port);

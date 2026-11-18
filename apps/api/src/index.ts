import { acquireLock, openStore } from '@reboundops/storage';
import { loadConfig, type ApiConfig } from './config.ts';
import { buildServer } from './server.ts';
import { Workspace } from './workspace.ts';

export { buildServer, API_VERSION } from './server.ts';
export { Workspace } from './workspace.ts';
export { AppError } from './errors.ts';
export { loadConfig } from './config.ts';

/** Opens the local store and starts listening. Returns a handle to stop cleanly. */
export async function startApi(config: ApiConfig = loadConfig()) {
  const store = openStore({ dataDir: config.dataDir });
  let release: () => void;
  try {
    release = acquireLock(config.dataDir);
  } catch (err) {
    store.close();
    throw err;
  }
  const workspace = new Workspace(store);
  const app = buildServer({ workspace, allowedOrigins: config.allowedOrigins, logLevel: config.logLevel, webDist: config.webDist });
  app.addHook('onClose', async () => {
    store.close();
    release();
  });
  let address: string;
  try {
    address = await app.listen({ host: config.host, port: config.port });
  } catch (err) {
    await app.close();
    throw err;
  }
  return { app, address, store, close: () => app.close() };
}

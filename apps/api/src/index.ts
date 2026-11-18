import { acquireLock, openStore, recoverInterruptedRestore, type Store } from '@reboundops/storage';
import { loadConfig, type ApiConfig } from './config.ts';
import { buildServer } from './server.ts';
import { Workspace } from './workspace.ts';

export { buildServer, API_VERSION } from './server.ts';
export { Workspace } from './workspace.ts';
export { AppError } from './errors.ts';
export { loadConfig } from './config.ts';

/** Opens the local store and starts listening. Returns a handle to stop cleanly. */
export async function startApi(config: ApiConfig = loadConfig()) {
  // Lock first, so two processes starting at once can never both open (and migrate) the database.
  const release = acquireLock(config.dataDir);
  let store: Store;
  try {
    const recovery = recoverInterruptedRestore(config.dataDir);
    if (recovery.action !== 'none') console.warn(`ReboundOps: ${recovery.detail}`);
    store = openStore({ dataDir: config.dataDir });
  } catch (err) {
    release();
    throw err;
  }
  const workspace = new Workspace(store);
  workspace.purgeExpiredDeletes();
  workspace.restore.cleanup();
  const app = buildServer({ workspace, allowedOrigins: config.allowedOrigins, logLevel: config.logLevel, webDist: config.webDist });
  app.addHook('onClose', async () => {
    // After an in-app restore the workspace holds a newly opened store.
    workspace.currentStore.close();
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

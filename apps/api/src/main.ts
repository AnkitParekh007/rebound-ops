import { startApi } from './index.ts';
import { loadConfig } from './config.ts';

let config: ReturnType<typeof loadConfig>;
let api: Awaited<ReturnType<typeof startApi>>;
try {
  config = loadConfig();
  api = await startApi(config);
} catch (err) {
  const e = err as NodeJS.ErrnoException;
  const reason =
    e.code === 'EADDRINUSE' ? `Port ${process.env['REBOUND_API_PORT'] ?? 4175} is already in use. Set REBOUND_API_PORT to another port.` : e.message;
  console.error(`ReboundOps could not start: ${reason}`);
  process.exit(1);
}
// The data directory path is local and useful; personal data is never logged.
console.log(`ReboundOps API listening on ${api.address} (data: ${config.dataDir})`);
if (config.webDist) console.log(`Open ${api.address} in your browser.`);

let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    api.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
}

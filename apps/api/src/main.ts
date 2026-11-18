import { startApi } from './index.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();
const api = await startApi(config);
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

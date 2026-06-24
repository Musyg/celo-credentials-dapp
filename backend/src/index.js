import { createServer } from './server.js';
import { startIndexer } from './indexer.js';

const PORT = Number(process.env.PORT || 8130);
createServer().listen(PORT, () => console.log(`[api] listening on :${PORT}`));
startIndexer().catch((e) => console.error('[indexer] failed to start', e.message));

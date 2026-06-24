import { publicClient, CONTRACT } from './config.js';
import { abi } from './abi.js';
import { initSchema, upsertIssued, markRevoked, dbEnabled } from './db.js';

// Watches CredentialIssued / CredentialRevoked and mirrors them into Postgres,
// so the API can serve a holder's credentials without scanning the chain.
export async function startIndexer() {
  if (!dbEnabled()) { console.log('[indexer] DATABASE_URL not set - indexer disabled'); return; }
  await initSchema();
  console.log('[indexer] watching events on', CONTRACT);

  publicClient.watchContractEvent({
    address: CONTRACT, abi, eventName: 'CredentialIssued',
    onLogs: async (logs) => {
      for (const l of logs) {
        try {
          await upsertIssued({
            tokenId: l.args.tokenId, holder: l.args.to, courseId: l.args.courseId,
            issuer: l.args.issuer, txHash: l.transactionHash, blockNumber: l.blockNumber,
          });
          console.log('[indexer] issued #' + l.args.tokenId);
        } catch (e) { console.error('[indexer] issued error', e.message); }
      }
    },
  });

  publicClient.watchContractEvent({
    address: CONTRACT, abi, eventName: 'CredentialRevoked',
    onLogs: async (logs) => {
      for (const l of logs) {
        try { await markRevoked(l.args.tokenId); console.log('[indexer] revoked #' + l.args.tokenId); }
        catch (e) { console.error('[indexer] revoked error', e.message); }
      }
    },
  });
}

if (import.meta.url === `file://${process.argv[1]}`) startIndexer();

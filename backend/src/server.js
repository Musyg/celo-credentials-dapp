import express from 'express';
import cors from 'cors';
import { publicClient, relayerWallet, issuerAccount, CONTRACT, explorerTx } from './config.js';
import { abi } from './abi.js';
import { signVoucher } from './eip712.js';
import { getByHolder, dbEnabled } from './db.js';

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) =>
    res.json({ ok: true, contract: CONTRACT, db: dbEnabled(), issuer: issuerAccount?.address ?? null }));

  // Issuer signs a voucher (no gas, no tx). Front-end / relayer submits it later.
  app.post('/api/voucher', async (req, res) => {
    try {
      if (!issuerAccount) return res.status(500).json({ error: 'issuer key not configured' });
      const { to, courseId, uri } = req.body;
      const voucher = {
        to, courseId: BigInt(courseId), uri: String(uri),
        nonce: BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000)),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      };
      const signature = await signVoucher(issuerAccount, voucher);
      res.json({ voucher: { ...voucher, courseId: voucher.courseId.toString(),
        nonce: voucher.nonce.toString(), deadline: voucher.deadline.toString() }, signature });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Relayer submits the signed voucher on-chain and pays the gas (gasless for student).
  app.post('/api/relay', async (req, res) => {
    try {
      if (!relayerWallet) return res.status(500).json({ error: 'relayer key not configured' });
      const { voucher, signature } = req.body;
      const v = { to: voucher.to, courseId: BigInt(voucher.courseId), uri: voucher.uri,
        nonce: BigInt(voucher.nonce), deadline: BigInt(voucher.deadline) };
      const hash = await relayerWallet.writeContract({
        address: CONTRACT, abi, functionName: 'mintWithVoucher', args: [v, signature] });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      res.json({ txHash: hash, status: receipt.status, explorer: explorerTx(hash) });
    } catch (e) { res.status(400).json({ error: e.shortMessage || e.message }); }
  });

  // Public verification of a single credential (always on-chain, source of truth).
  app.get('/api/verify/:tokenId', async (req, res) => {
    try {
      const [holder, courseId, issuer, revoked] = await publicClient.readContract({
        address: CONTRACT, abi, functionName: 'verifyCredential', args: [BigInt(req.params.tokenId)] });
      res.json({ tokenId: req.params.tokenId, holder, courseId: courseId.toString(), issuer, revoked });
    } catch (e) { res.status(404).json({ error: 'unknown credential' }); }
  });

  // A holder's credentials (from the indexer; requires DATABASE_URL).
  app.get('/api/credentials/:address', async (req, res) => {
    const rows = await getByHolder(req.params.address);
    if (rows === null) return res.status(503).json({ error: 'indexer/DB not configured' });
    res.json(rows);
  });

  return app;
}

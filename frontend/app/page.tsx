'use client';
import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors/injected';
import { API_BASE, explorerToken } from '@/lib/chain';

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [to, setTo] = useState('');
  const [courseId, setCourseId] = useState('101');
  const [uri, setUri] = useState('https://example.edu/credentials/solidity-101.json');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const recipient = to || address || '';

  async function mint() {
    setBusy(true); setError(''); setResult(null);
    try {
      // 1) Ask the issuer service to sign an EIP-712 voucher (no gas).
      const vRes = await fetch(`${API_BASE}/api/voucher`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: recipient, courseId, uri }),
      });
      const voucherData = await vRes.json();
      if (!vRes.ok) throw new Error(voucherData.error || 'voucher failed');

      // 2) Relayer submits it on-chain and pays the gas (student is gas-free).
      const rRes = await fetch(`${API_BASE}/api/relay`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(voucherData),
      });
      const relay = await rRes.json();
      if (!rRes.ok) throw new Error(relay.error || 'relay failed');
      setResult(relay);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <h1>Issue a credential</h1>
      <p className="muted">Soulbound ERC-721 on Celo Sepolia. The issuer signs an EIP-712
        voucher; a relayer pays gas, so the recipient mints for free.</p>

      <div className="card">
        {isConnected ? (
          <p className="muted">Connected: {address}{' '}
            <a onClick={() => disconnect()} style={{ cursor: 'pointer' }}>(disconnect)</a></p>
        ) : (
          <button onClick={() => connect({ connector: injected() })}>Connect wallet</button>
        )}

        <label>Recipient address</label>
        <input value={recipient} onChange={(e) => setTo(e.target.value)} placeholder="0x..." />
        <label>Course ID</label>
        <input value={courseId} onChange={(e) => setCourseId(e.target.value)} />
        <label>Metadata URI</label>
        <input value={uri} onChange={(e) => setUri(e.target.value)} />

        <button onClick={mint} disabled={busy || !recipient}>
          {busy ? 'Minting...' : 'Mint credential (gasless)'}
        </button>
      </div>

      {error && <div className="card"><strong>Error:</strong> {error}</div>}
      {result && (
        <div className="card">
          <div className="row"><span>Status</span><span>{result.status}</span></div>
          <div className="row"><span>Tx</span><a href={result.explorer} target="_blank">view on Blockscout</a></div>
          <p className="muted" style={{ marginTop: 12 }}>Token list updates on the
            &quot;My credentials&quot; page once the indexer picks up the event.</p>
        </div>
      )}
    </div>
  );
}

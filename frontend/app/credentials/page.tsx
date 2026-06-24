'use client';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { API_BASE, explorerToken } from '@/lib/chain';

export default function CredentialsPage() {
  const { address } = useAccount();
  const [addr, setAddr] = useState('');
  const [rows, setRows] = useState<any[] | null>(null);
  const [msg, setMsg] = useState('');

  const target = addr || address || '';

  async function load() {
    if (!target) return;
    setMsg('Loading...'); setRows(null);
    try {
      const res = await fetch(`${API_BASE}/api/credentials/${target}`);
      if (res.status === 503) { setMsg('Indexer/DB not configured on this backend.'); return; }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setMsg(Array.isArray(data) && data.length === 0 ? 'No credentials for this address.' : '');
    } catch (e: any) { setMsg(e.message); }
  }

  useEffect(() => { if (address) setAddr(address); }, [address]);

  return (
    <div>
      <h1>My credentials</h1>
      <p className="muted">Served by the event indexer (Postgres).</p>
      <div className="card">
        <label>Address</label>
        <input value={target} onChange={(e) => setAddr(e.target.value)} placeholder="0x..." />
        <button onClick={load} disabled={!target}>Load</button>
      </div>
      {msg && <div className="card">{msg}</div>}
      {rows && rows.map((r) => (
        <div className="card" key={r.token_id}>
          <div className="row"><span>Token</span>
            <a href={explorerToken(r.token_id)} target="_blank">#{r.token_id}</a></div>
          <div className="row"><span>Course</span><span>{r.course_id}</span></div>
          <div className="row"><span>Revoked</span><span>{String(r.revoked)}</span></div>
          <div className="row"><span>Verify</span><a href={`/verify/${r.token_id}`}>open</a></div>
        </div>
      ))}
    </div>
  );
}

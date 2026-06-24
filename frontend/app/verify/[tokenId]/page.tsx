'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { publicClient } from '@/lib/publicClient';
import { abi } from '@/lib/abi';
import { CONTRACT, explorerToken } from '@/lib/chain';

export default function VerifyPage() {
  const params = useParams<{ tokenId: string }>();
  const tokenId = params.tokenId;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        // Read directly on-chain - the explorer-independent source of truth.
        const [holder, courseId, issuer, revoked] = await publicClient.readContract({
          address: CONTRACT, abi, functionName: 'verifyCredential', args: [BigInt(tokenId)],
        }) as [string, bigint, string, boolean];
        setData({ holder, courseId: courseId.toString(), issuer, revoked });
      } catch { setError('Unknown credential (not minted or wrong id).'); }
    })();
  }, [tokenId]);

  return (
    <div>
      <h1>Verify credential #{tokenId}</h1>
      <p className="muted">Read live from the contract on Celo Sepolia.</p>
      {error && <div className="card">{error}</div>}
      {data && (
        <div className="card">
          <div className="row"><span>Holder</span><span>{data.holder}</span></div>
          <div className="row"><span>Course ID</span><span>{data.courseId}</span></div>
          <div className="row"><span>Issuer</span><span>{data.issuer}</span></div>
          <div className="row"><span>Revoked</span><span>{String(data.revoked)}</span></div>
          <div className="row"><span>Token</span>
            <a href={explorerToken(tokenId)} target="_blank">view on Celoscan</a></div>
          <p className="muted" style={{ marginTop: 12 }}>
            Authentic if the issuer is your institution&apos;s key and revoked is false.</p>
        </div>
      )}
    </div>
  );
}

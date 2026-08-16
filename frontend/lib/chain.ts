import { defineChain } from 'viem';

export const CONTRACT = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  '0xCE6A729c96C6c5f61d90E0139bCF929A777CCAC7') as `0x${string}`;
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8130';

export const celoSepolia = defineChain({
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: { default: { http: ['https://forno.celo-sepolia.celo-testnet.org'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://celo-sepolia.blockscout.com' } },
  testnet: true,
});

export const explorerToken = (id: string | bigint) =>
  `https://celo-sepolia.blockscout.com/token/${CONTRACT}/instance/${id}`;

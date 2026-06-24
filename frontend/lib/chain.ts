import { defineChain } from 'viem';

export const CONTRACT = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  '0x3Ed7b04b5B0dE9CaD355A229FE503C9e5711CdE0') as `0x${string}`;
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8130';

export const celoSepolia = defineChain({
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: { default: { http: ['https://forno.celo-sepolia.celo-testnet.org'] } },
  blockExplorers: { default: { name: 'Celoscan', url: 'https://sepolia.celoscan.io' } },
  testnet: true,
});

export const explorerToken = (id: string | bigint) =>
  `https://sepolia.celoscan.io/token/${CONTRACT}?a=${id}`;

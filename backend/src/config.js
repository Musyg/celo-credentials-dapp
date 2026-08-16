import 'dotenv/config';
import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const CHAIN_ID = Number(process.env.CHAIN_ID || 11142220);
export const RPC_URL = process.env.RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org';
export const CONTRACT = (process.env.CONTRACT_ADDRESS || '').trim();

export const celoSepolia = defineChain({
  id: CHAIN_ID,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://celo-sepolia.blockscout.com' } },
  testnet: true,
});

export const publicClient = createPublicClient({ chain: celoSepolia, transport: http(RPC_URL) });

function acct(name) {
  const pk = process.env[name];
  if (!pk || !pk.startsWith('0x')) return null;
  return privateKeyToAccount(pk);
}
export const issuerAccount = acct('ISSUER_PRIVATE_KEY');
export const relayerAccount = acct('RELAYER_PRIVATE_KEY');
export const relayerWallet = relayerAccount
  ? createWalletClient({ account: relayerAccount, chain: celoSepolia, transport: http(RPC_URL) })
  : null;

export function explorerTx(h) { return `https://celo-sepolia.blockscout.com/tx/${h}`; }
export function explorerToken(id) { return `https://celo-sepolia.blockscout.com/token/${CONTRACT}/instance/${id}`; }

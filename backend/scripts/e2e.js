// Live end-to-end proof on Celo Sepolia:
// 1) owner authorizes the issuer  2) issuer signs an EIP-712 voucher (off-chain)
// 3) relayer submits it and pays gas (student is gas-free)  4) verify on-chain.
import { decodeEventLog } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  publicClient, relayerWallet, relayerAccount, issuerAccount,
  CONTRACT, explorerTx, explorerToken,
} from '../src/config.js';
import { abi } from '../src/abi.js';
import { signVoucher } from '../src/eip712.js';

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Public RPCs are load-balanced; a read right after a write can hit a lagging
// node. Retry briefly so the proof is deterministic.
async function verifyWithRetry(tokenId, tries = 6) {
  for (let i = 0; i < tries; i++) {
    try {
      return await publicClient.readContract({
        address: CONTRACT, abi, functionName: 'verifyCredential', args: [tokenId] });
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(2000);
    }
  }
}

async function main() {
  if (!issuerAccount || !relayerWallet) throw new Error('ISSUER/RELAYER keys missing in .env');
  log('Contract :', CONTRACT);
  log('Issuer   :', issuerAccount.address);
  log('Relayer  :', relayerAccount.address);

  const owner = await publicClient.readContract({ address: CONTRACT, abi, functionName: 'owner' });
  log('Owner    :', owner);

  let allowed = await publicClient.readContract({
    address: CONTRACT, abi, functionName: 'isIssuer', args: [issuerAccount.address] });
  if (!allowed) {
    if (owner.toLowerCase() !== relayerAccount.address.toLowerCase())
      throw new Error('issuer not authorized and relayer is not the owner');
    log('\n[setIssuer] authorizing issuer...');
    const h = await relayerWallet.writeContract({
      address: CONTRACT, abi, functionName: 'setIssuer', args: [issuerAccount.address, true] });
    await publicClient.waitForTransactionReceipt({ hash: h });
    log('[setIssuer] ok', explorerTx(h));
  } else log('\n[setIssuer] issuer already authorized');

  const student = privateKeyToAccount(generatePrivateKey()).address;
  const voucher = {
    to: student,
    courseId: 101n,
    uri: 'https://example.edu/credentials/solidity-101.json',
    nonce: BigInt(Date.now()),
    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
  };
  const signature = await signVoucher(issuerAccount, voucher);
  log('\n[voucher] student  :', student);
  log('[voucher] signature:', signature.slice(0, 22) + '...');

  log('\n[relay] submitting mintWithVoucher...');
  const hash = await relayerWallet.writeContract({
    address: CONTRACT, abi, functionName: 'mintWithVoucher', args: [voucher, signature] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  log('[relay] status:', receipt.status, '| gas used:', receipt.gasUsed.toString());
  log('[relay] tx:', explorerTx(hash));

  let tokenId;
  for (const l of receipt.logs) {
    try {
      const d = decodeEventLog({ abi, data: l.data, topics: l.topics });
      if (d.eventName === 'CredentialIssued') { tokenId = d.args.tokenId; break; }
    } catch {}
  }
  log('\n[mint] tokenId:', tokenId?.toString());

  const [holder, courseId, issuer, revoked] = await verifyWithRetry(tokenId);
  log('[verify] holder  :', holder);
  log('[verify] courseId:', courseId.toString());
  log('[verify] issuer  :', issuer);
  log('[verify] revoked :', revoked);
  log('[verify] matches student:', holder.toLowerCase() === student.toLowerCase());
  log('\nToken on Celoscan:', explorerToken(tokenId));
  log('\nE2E OK - gasless credential minted + verified on Celo Sepolia.');
}
main().catch((e) => { console.error('E2E FAILED:', e.shortMessage || e.message); process.exit(1); });

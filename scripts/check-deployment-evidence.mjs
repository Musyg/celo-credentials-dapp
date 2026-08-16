import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const evidence = JSON.parse(read('deployment-celo-sepolia.json'));
const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const hashPattern = /^0x[0-9a-fA-F]{64}$/;
const commitPattern = /^[0-9a-f]{40}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(evidence.network.chainId === 11142220, 'Unexpected Celo Sepolia chain ID');
assert(addressPattern.test(evidence.contract.address), 'Invalid contract address');
assert(addressPattern.test(evidence.contract.owner), 'Invalid owner address');
assert(commitPattern.test(evidence.source.commit), 'Invalid source commit');
assert(evidence.contract.sourceVerification.fullyVerified === true, 'Source is not marked fully verified');
assert(evidence.contract.sourceVerification.changedBytecode === false, 'Changed bytecode must be false');
assert(evidence.contract.sourceVerification.partiallyVerified === false, 'Partial verification must be false');

for (const [name, value] of Object.entries({
  deploymentTransaction: evidence.contract.deploymentTransaction,
  issuerAuthorizationTransaction: evidence.lifecycleProof.issuerAuthorizationTransaction,
  issuanceTransaction: evidence.lifecycleProof.issuanceTransaction,
  revocationTransaction: evidence.lifecycleProof.revocationTransaction,
})) {
  assert(hashPattern.test(value), `Invalid ${name}`);
}

assert(evidence.lifecycleProof.tokenId === 1, 'Unexpected demonstration token ID');
assert(evidence.lifecycleProof.courseId === 20260816, 'Unexpected demonstration course ID');
assert(evidence.lifecycleProof.finalState.holder === '0x0000000000000000000000000000000000000000', 'Final holder is not zero');
assert(evidence.lifecycleProof.finalState.issuer.toLowerCase() === evidence.contract.owner.toLowerCase(), 'Final issuer does not match owner');
assert(evidence.lifecycleProof.finalState.revoked === true, 'Final state is not revoked');

const contract = evidence.contract.address;
const references = {
  'deployment-celo-sepolia.txt': [contract],
  'backend/.env.example': [contract],
  'frontend/.env.example': [contract],
  'frontend/lib/chain.ts': [contract, evidence.network.explorerUrl],
  'backend/src/config.js': [evidence.network.explorerUrl],
  'README.md': [
    contract,
    evidence.source.commit,
    evidence.contract.deploymentTransaction,
    evidence.lifecycleProof.issuerAuthorizationTransaction,
    evidence.lifecycleProof.issuanceTransaction,
    evidence.lifecycleProof.revocationTransaction,
    String(evidence.lifecycleProof.issuanceBlock),
    String(evidence.lifecycleProof.revocationBlock),
  ],
};

for (const [path, expectedValues] of Object.entries(references)) {
  const content = read(path);
  for (const value of expectedValues) {
    assert(content.includes(value), `${path} is missing ${value}`);
  }
}

const legacyAddress = '0x3Ed7b04b5B0dE9CaD355A229FE503C9e5711CdE0'.toLowerCase();
for (const path of Object.keys(references)) {
  assert(!read(path).toLowerCase().includes(legacyAddress), `${path} still contains the legacy contract`);
}

console.log(`Deployment evidence is consistent for ${contract} on chain ${evidence.network.chainId}.`);

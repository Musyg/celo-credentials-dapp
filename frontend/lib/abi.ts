import { parseAbi } from 'viem';

export const abi = parseAbi([
  'struct CredentialVoucher { address to; uint256 courseId; string uri; uint256 nonce; uint256 deadline; }',
  'function mintWithVoucher(CredentialVoucher voucher, bytes signature) returns (uint256)',
  'function verifyCredential(uint256 tokenId) view returns (address holder, uint256 courseId, address issuer, bool revoked)',
  'function isIssuer(address account) view returns (bool)',
  'function owner() view returns (address)',
]);

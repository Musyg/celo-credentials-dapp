import { parseAbi } from 'viem';

// Human-readable ABI for the on-chain EducationCredential contract.
export const abi = parseAbi([
  'struct CredentialVoucher { address to; uint256 courseId; string uri; uint256 nonce; uint256 deadline; }',
  'function mintWithVoucher(CredentialVoucher voucher, bytes signature) returns (uint256)',
  'function verifyCredential(uint256 tokenId) view returns (address holder, uint256 courseId, address issuer, bool revoked)',
  'function revoke(uint256 tokenId)',
  'function setIssuer(address issuer, bool allowed)',
  'function isIssuer(address account) view returns (bool)',
  'function owner() view returns (address)',
  'function hashVoucher(CredentialVoucher voucher) view returns (bytes32)',
  'event CredentialIssued(uint256 indexed tokenId, address indexed to, uint256 indexed courseId, address issuer)',
  'event CredentialRevoked(uint256 indexed tokenId, address indexed by)',
]);

import { CHAIN_ID, CONTRACT } from './config.js';

// Must mirror the contract's EIP712("EducationCredential","1") domain and struct.
export const EIP712_TYPES = {
  CredentialVoucher: [
    { name: 'to', type: 'address' },
    { name: 'courseId', type: 'uint256' },
    { name: 'uri', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

export function domain(contract = CONTRACT, chainId = CHAIN_ID) {
  return { name: 'EducationCredential', version: '1', chainId, verifyingContract: contract };
}

/// Issuer signs a voucher off-chain. The signature authorizes a gasless mint.
export async function signVoucher(issuerAccount, voucher) {
  return issuerAccount.signTypedData({
    domain: domain(),
    types: EIP712_TYPES,
    primaryType: 'CredentialVoucher',
    message: voucher,
  });
}

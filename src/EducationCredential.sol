// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title  EducationCredential
/// @notice Soulbound (non-transferable) ERC-721 credentials for a decentralized
///         education platform. Credentials are minted from an EIP-712 voucher
///         signed off-chain by an authorized issuer, so a relayer pays the gas
///         and the student receives the credential gas-free. Built for Celo
///         (gas can also be paid in cUSD via fee-currency at the tx layer).
/// @dev    Security notes: EIP-712 domain separation + per-voucher nonce +
///         deadline guard against signature replay; OZ ECDSA.recover rejects
///         malleable (high-s) signatures.
contract EducationCredential is ERC721URIStorage, EIP712, Ownable {
    struct CredentialVoucher {
        address to; // student receiving the credential
        uint256 courseId; // course / program identifier
        string uri; // metadata URI (e.g. ipfs://...)
        uint256 nonce; // unique per voucher; prevents replay
        uint256 deadline; // unix ts after which the voucher is invalid
    }

    bytes32 private constant VOUCHER_TYPEHASH =
        keccak256("CredentialVoucher(address to,uint256 courseId,string uri,uint256 nonce,uint256 deadline)");

    uint256 private _nextId;

    mapping(address => bool) public isIssuer;
    mapping(uint256 => bool) public nonceUsed;

    struct CredentialData {
        uint256 courseId;
        address issuer;
        bool revoked;
    }
    mapping(uint256 => CredentialData) private _credentials;

    event IssuerSet(address indexed issuer, bool allowed);
    event CredentialIssued(uint256 indexed tokenId, address indexed to, uint256 indexed courseId, address issuer);
    event CredentialRevoked(uint256 indexed tokenId, address indexed by);

    error Soulbound();
    error VoucherExpired();
    error NonceAlreadyUsed();
    error InvalidIssuerSignature();
    error NotAuthorized();
    error UnknownCredential();

    constructor(address initialOwner)
        ERC721("Education Credential", "EDUCRED")
        EIP712("EducationCredential", "1")
        Ownable(initialOwner)
    {}

    function setIssuer(address issuer, bool allowed) external onlyOwner {
        isIssuer[issuer] = allowed;
        emit IssuerSet(issuer, allowed);
    }

    /// @notice Mint a credential from an issuer-signed voucher. Anyone (a relayer)
    ///         may submit it, so the student never needs gas.
    function mintWithVoucher(CredentialVoucher calldata voucher, bytes calldata signature)
        external
        returns (uint256 tokenId)
    {
        if (block.timestamp > voucher.deadline) revert VoucherExpired();
        if (nonceUsed[voucher.nonce]) revert NonceAlreadyUsed();

        address signer = ECDSA.recover(_hashVoucher(voucher), signature);
        if (!isIssuer[signer]) revert InvalidIssuerSignature();

        nonceUsed[voucher.nonce] = true;
        tokenId = ++_nextId;

        _safeMint(voucher.to, tokenId);
        _setTokenURI(tokenId, voucher.uri);
        _credentials[tokenId] = CredentialData({courseId: voucher.courseId, issuer: signer, revoked: false});

        emit CredentialIssued(tokenId, voucher.to, voucher.courseId, signer);
    }

    /// @notice Revoke a credential (issuer or owner). Burns the token and flags it.
    function revoke(uint256 tokenId) external {
        if (!isIssuer[msg.sender] && msg.sender != owner()) revert NotAuthorized();
        if (_credentials[tokenId].issuer == address(0)) revert UnknownCredential();
        _credentials[tokenId].revoked = true;
        _burn(tokenId);
        emit CredentialRevoked(tokenId, msg.sender);
    }

    /// @notice Public verification: who holds it, for which course, issued by whom, revoked?
    function verifyCredential(uint256 tokenId)
        external
        view
        returns (address holder, uint256 courseId, address issuer, bool revoked)
    {
        CredentialData memory c = _credentials[tokenId];
        if (c.issuer == address(0)) revert UnknownCredential();
        return (_ownerOf(tokenId), c.courseId, c.issuer, c.revoked);
    }

    /// @notice EIP-712 digest helper for off-chain signers and tests.
    function hashVoucher(CredentialVoucher calldata voucher) external view returns (bytes32) {
        return _hashVoucher(voucher);
    }

    function _hashVoucher(CredentialVoucher calldata voucher) internal view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    VOUCHER_TYPEHASH,
                    voucher.to,
                    voucher.courseId,
                    keccak256(bytes(voucher.uri)),
                    voucher.nonce,
                    voucher.deadline
                )
            )
        );
    }

    /// @dev Soulbound: allow mint (from==0) and burn (to==0), block transfers.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}

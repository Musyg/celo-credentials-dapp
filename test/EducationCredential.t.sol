// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {EducationCredential} from "../src/EducationCredential.sol";

contract EducationCredentialTest is Test {
    EducationCredential internal cred;

    address internal owner = address(0xA11CE);
    uint256 internal issuerPk = 0xB0B;
    address internal issuer;
    address internal student = address(0x57DE7);

    function setUp() public {
        issuer = vm.addr(issuerPk);
        cred = new EducationCredential(owner);
        vm.prank(owner);
        cred.setIssuer(issuer, true);
    }

    function _voucher(address to, uint256 courseId, uint256 nonce, uint256 deadline)
        internal
        pure
        returns (EducationCredential.CredentialVoucher memory)
    {
        return EducationCredential.CredentialVoucher({
            to: to, courseId: courseId, uri: "ipfs://credential", nonce: nonce, deadline: deadline
        });
    }

    function _sign(EducationCredential.CredentialVoucher memory v, uint256 pk) internal view returns (bytes memory) {
        bytes32 digest = cred.hashVoucher(v);
        (uint8 vv, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, vv);
    }

    function test_MintWithValidVoucher() public {
        EducationCredential.CredentialVoucher memory v = _voucher(student, 101, 1, block.timestamp + 1 days);
        uint256 id = cred.mintWithVoucher(v, _sign(v, issuerPk));
        assertEq(cred.ownerOf(id), student);
        (address holder, uint256 courseId, address iss, bool revoked) = cred.verifyCredential(id);
        assertEq(holder, student);
        assertEq(courseId, 101);
        assertEq(iss, issuer);
        assertFalse(revoked);
    }

    function test_Transfer_Reverts_Soulbound() public {
        EducationCredential.CredentialVoucher memory v = _voucher(student, 1, 1, block.timestamp + 1 days);
        uint256 id = cred.mintWithVoucher(v, _sign(v, issuerPk));
        vm.prank(student);
        vm.expectRevert(EducationCredential.Soulbound.selector);
        cred.transferFrom(student, address(0xBEEF), id);
    }

    function test_Replay_Reverts() public {
        EducationCredential.CredentialVoucher memory v = _voucher(student, 1, 7, block.timestamp + 1 days);
        bytes memory sig = _sign(v, issuerPk);
        cred.mintWithVoucher(v, sig);
        vm.expectRevert(EducationCredential.NonceAlreadyUsed.selector);
        cred.mintWithVoucher(v, sig);
    }

    function test_ExpiredDeadline_Reverts() public {
        EducationCredential.CredentialVoucher memory v = _voucher(student, 1, 2, block.timestamp + 1);
        bytes memory sig = _sign(v, issuerPk);
        vm.warp(block.timestamp + 2);
        vm.expectRevert(EducationCredential.VoucherExpired.selector);
        cred.mintWithVoucher(v, sig);
    }

    function test_NonIssuerSigner_Reverts() public {
        EducationCredential.CredentialVoucher memory v = _voucher(student, 1, 3, block.timestamp + 1 days);
        bytes memory sig = _sign(v, 0xDEAD);
        vm.expectRevert(EducationCredential.InvalidIssuerSignature.selector);
        cred.mintWithVoucher(v, sig);
    }

    function test_Revoke() public {
        EducationCredential.CredentialVoucher memory v = _voucher(student, 1, 4, block.timestamp + 1 days);
        uint256 id = cred.mintWithVoucher(v, _sign(v, issuerPk));
        vm.prank(issuer);
        cred.revoke(id);
        (address holder,,, bool revoked) = cred.verifyCredential(id);
        assertEq(holder, address(0));
        assertTrue(revoked);
    }

    function test_RevokeByStranger_Reverts() public {
        EducationCredential.CredentialVoucher memory v = _voucher(student, 1, 5, block.timestamp + 1 days);
        uint256 id = cred.mintWithVoucher(v, _sign(v, issuerPk));
        vm.prank(address(0xBAD));
        vm.expectRevert(EducationCredential.NotAuthorized.selector);
        cred.revoke(id);
    }

    function testFuzz_Mint(uint96 courseId, uint256 nonce) public {
        vm.assume(nonce != 0);
        EducationCredential.CredentialVoucher memory v = _voucher(student, courseId, nonce, block.timestamp + 1 days);
        uint256 id = cred.mintWithVoucher(v, _sign(v, issuerPk));
        (, uint256 cId,,) = cred.verifyCredential(id);
        assertEq(cId, courseId);
    }
}

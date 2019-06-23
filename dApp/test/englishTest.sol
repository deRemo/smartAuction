pragma solidity ^0.5.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/englishAuction.sol";

contract englishTest{
	englishAuction auction = englishAuction(DeployedAddresses.englishAuction());
	uint expectedLen = 3;
	function testGetBiddingLength() public{
		uint len = auction.getBiddingLength();
		Assert.equal(len, expectedLen, "expected bidding len");
	}
}

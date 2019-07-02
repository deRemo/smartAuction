pragma solidity ^0.5.1;
import "./englishAuction.sol";
import "./vickeryAuction.sol";

//factory contract: used to deploy new smart auctions
//NOTE: remix's default gas limit is not enough (at least 4000000 gas needed)
contract smartAuctionFactory{
    //mapping(string => address) auctions; //keep of all the contracts deployed
    address[] public auctions;
    address owner;
    
    event newEnglishAuctionEvent(address addr); //notify the deployment of a new english auction
    event newVickeryAuctionEvent(address addr); //notify the deployment of a new vickery auction

    constructor() public {
        owner = msg.sender;
    }
    
    function deployEnglishAuction(uint _reservePrice, uint _buyOutPrice, uint _unchallegedLength, uint _increment) public returns (address) {
        englishAuction auction = new englishAuction(_reservePrice, _buyOutPrice, _unchallegedLength, _increment);
        address addr = address(auction);

        auctions.push(addr);
        emit newEnglishAuctionEvent(addr);

        return addr;
    }
    
    function deployVickeryAuction(uint _reservePrice, uint _deposit, uint _bidCommitLength, uint _bidWithdrawLength, uint _bidOpeningLength) public returns (address) {
        vickeryAuction auction = new vickeryAuction(_reservePrice, _deposit, _bidCommitLength, _bidWithdrawLength, _bidOpeningLength);
        address addr = address(auction);

        auctions.push(addr);
        emit newVickeryAuctionEvent(addr);

        return addr;
    }

    function getAuctions() public view returns(address[] memory){
        return auctions;
    }
}
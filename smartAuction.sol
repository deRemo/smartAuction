pragma solidity ^0.4.22;

contract smartAuction {
    address public auctioneer; //the seller
    mapping(address => uint) bidders;
    
    uint highestBid;
    address winningBidder;
    
    uint reservePrice; //the seller may decide to not sell the good if highestBid < reservePrice
    
    enum phase {preAuction, auction, postAuction} //enum phases of the auction
    uint startingBlock; //auction init block number
    uint preAuctionLength; //pre auction time period, in blocks
    uint auctionLength; //auction/bidding time period, in blocks
    uint postAuctionLength; //post auction time period, in blocks
    
    event log(string debug); //debug
    event newBid(address bidder, uint amount); //notify new bid
    event newHighestBid(address bidder, uint amount); //notify new highest bid
    
    //init auction instance
    constructor(uint _preAuctionLength, uint _auctionLength, uint _postAuctionLength, uint _reservePrice) public {
        require(_auctionLength > 0 && _reservePrice > 0, "You must specify the auction time(in block) and reserve price!");
        auctioneer = msg.sender;
        startingBlock = block.number;
        
        preAuctionLength = _preAuctionLength;
        auctionLength = _auctionLength;
        postAuctionLength = _postAuctionLength;
        
        reservePrice = _reservePrice;
    }
    
    //default bid method: the winning bidder is the one with the highest bid
    function bid(uint amount) public {
        address bidder = msg.sender;
        
        bidders[bidder] = amount;
        emit newBid(msg.sender, amount);
        
        if(amount > highestBid){
            highestBid = amount;
            winningBidder = bidder;
            emit newHighestBid(bidder, amount);
        }
    }
    
    //determine the phase of the auction
    function currentPhase() public returns (phase _currentPhase) {
        uint currentBlock = block.number;
        require((startingBlock + preAuctionLength + auctionLength + postAuctionLength) > currentBlock, "The auction is already concluded!");
        
        if((startingBlock + preAuctionLength) - 1 >= currentBlock){
            emit log("pre");
            return phase.preAuction;
        }
        else if((startingBlock + preAuctionLength + auctionLength) - 1 >= currentBlock){
            emit log("au");
            return phase.auction;
        }
        else{
            emit log("post");
            return phase.postAuction;
        }
    }
}

contract englishAuction is smartAuction{
    uint buyOutPrice;
    constructor(uint _preAuctionLength, uint _auctionLength, uint _postAuctionLength, uint _reservePrice, uint _buyOutPrice) 
                    smartAuction(_preAuctionLength, _auctionLength, _postAuctionLength, _reservePrice) public {
        
        buyOutPrice = _buyOutPrice;
    }
    
    function buyOut(uint amount) public {
        require(currentPhase() == phase.preAuction, "Auction already started, you can't buy out anymore!");
        require(amount >= buyOutPrice, "Your amount is not enough!");
        
        //PAY
        emit log("payed buy out");
    }
}
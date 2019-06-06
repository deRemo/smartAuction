pragma solidity ^0.4.21;

contract smartAuction {
    address public auctioneer; //the seller
    mapping(address => uint) bidders;
    
    uint highestBid;
    address winningBidder;
    
    uint reservePrice; //the seller may decide to not sell the good if highestBid < reservePrice
    uint buyOutPrice;
    
    enum phase {preAuction, auction, postAuction} //enum phases of the auction
    uint preAuctionLength;
    uint auctionLength;
    uint postAuctionLength;
    uint startingBlock;
    
    event log(string debug);
    event newBid(address bidder, uint amount); //notify new bid
    event newHighestBid(address bidder, uint amount); //notify new highest bid
    
    //init auction instance
    function smartAuction(uint _preAuctionLength, uint _auctionLength, uint _postAuctionLength, uint _reservePrice, uint _buyOutPrice) public {
        require(_auctionLength > 0 && _reservePrice > 0);
        auctioneer = msg.sender;
        startingBlock = block.number;
        
        preAuctionLength = _preAuctionLength;
        auctionLength = _auctionLength;
        postAuctionLength = _postAuctionLength;
        
        reservePrice = _reservePrice;
        buyOutPrice = _buyOutPrice;
    }
    
    /*function preAuctionPhase() public {
        emit log("before starting the auction");
    }
    
    function AuctionPhase() public {
        emit log("during the auction");
    }
    
    function postAuctionPhase() public {
        emit log("after the auction ended");
    }*/
    
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
    
    function buyOut(uint amount) public {
        require(currentPhase() == phase.preAuction);
        require(amount >= buyOutPrice);
        
        //PAY
    }
    
    //determine the phase of the auction
    function currentPhase() public returns (phase _currentPhase) {
        uint currentBlock = block.number;
        require((startingBlock + preAuctionLength + auctionLength + postAuctionLength) > currentBlock);
        
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
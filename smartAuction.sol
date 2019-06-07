pragma solidity ^0.4.22;

contract smartAuction {
    address public auctioneer; //the seller
    mapping(address => uint) bidders; //maps bidders to the amount they spent
    bool finalized; //set at true when the payment is finalized, to avoid multiple unwanted transfers 
    
    uint highestBid;
    address winningBidder;
    
    uint reservePrice; //the seller may decide to not sell the good if highestBid < reservePrice
    
    enum phase {preAuction, auction, postAuction} //enum phases of the auction
    uint startingBlock; //auction init block number
    uint preAuctionLength; //pre auction time period, in blocks
    uint auctionLength; //auction/bidding time period, in blocks
    uint postAuctionLength; //post auction time period, in blocks
    
    event logEvent(string debug); //debug
    event newHighestBidEvent(address bidder, uint amount); //notify new highest bid
    event finalizeEvent(address bidder, uint amount); //notify that the auction has ended and the good has been payed
    event refundEvent(address bidder, uint amount); //notify if someone get a refund
    
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
    
    //determine the phase of the auction
    function currentPhase() public returns (phase _currentPhase) {
        uint currentBlock = block.number;
        //require((startingBlock + preAuctionLength + auctionLength + postAuctionLength) > currentBlock, "The auction is already concluded!");
        
        if((startingBlock + preAuctionLength) - 1 >= currentBlock){
            emit logEvent("pre");
            return phase.preAuction;
        }
        else if((startingBlock + preAuctionLength + auctionLength) - 1 >= currentBlock){
            emit logEvent("au");
            return phase.auction;
        }
        else{
            emit logEvent("post");
            return phase.postAuction;
        }
    }
    
    //default bid method: the winning bidder is the one with the highest bid
    function bid() payable public;
    
    //public function used by a bidder to withdraw his money
    function withdraw() public returns (bool) {
        address bidder = msg.sender;
        uint amount = bidders[bidder];
        
        return refundTo(bidder, amount);
    }
    
    //private function, used to return a certain amount of money to a certan bidder
    function refundTo(address bidder, uint amount) internal returns (bool){
        if(amount > 0){
            bidders[bidder] = 0;
            if(!bidder.send(amount)){
                bidders[bidder] = amount;
            
                return false;
            }
        }
        
        emit refundEvent(bidder, amount);
        return true;
    }
    
    //default finalize method:transfer the money of the winning bidder to the auctioneer's wallet
    function finalize() payable public{
        require(currentPhase() == phase.postAuction, "Auction hasn't ended yet");
        require(!finalized, "The payment has already been finalized");
        require(msg.sender == winningBidder, "You are not the winner!");
        require(highestBid >= reservePrice, "reserve price minimum not satisfied!");
        
        finalized = true;
        
        emit finalizeEvent(winningBidder, highestBid);
        auctioneer.transfer(highestBid);
    }
}

contract englishAuction is smartAuction{
    uint buyOutPrice; //If someone pays this amount during the preAuction phase, the good is sold immediately without starting the auction
    uint increment; //The minimum amout you have to add to current highestBid in order to be the winning bidder
    uint unchallegedLength; //Number of blocks (including the current one) a bid must be unchallenged before it is considered the final winner
    
    constructor(uint _preAuctionLength, uint _auctionLength, uint _postAuctionLength, uint _reservePrice, uint _buyOutPrice, uint _increment, uint _unchallegedLength) 
                    smartAuction(_preAuctionLength, _auctionLength, _postAuctionLength, _reservePrice) public {
        require(_unchallegedLength <= _auctionLength, "the unchallegedLength must be lower than the auctionLength!");
        buyOutPrice = _buyOutPrice;
        increment = _increment;
        unchallegedLength = _unchallegedLength;
        
        highestBid = reservePrice;
    }
    
    function buyOut() payable public {
        require(currentPhase() == phase.preAuction, "Auction already started, you can't buy out anymore!");
        uint amount = msg.value;
        require(amount >= buyOutPrice, "Your amount is not enough!");
        
        //PAY
        highestBid = amount;
        winningBidder = msg.sender;
        
        //The auction can be considered over, because the buyout condition is satisfied
        preAuctionLength=0;
        auctionLength=0;
    }
    
    function bid() payable public{
        require(currentPhase() != phase.preAuction, "It is not bidding time yet!");
        require(currentPhase() != phase.postAuction, "Auction already ended!");
        
        address bidder = msg.sender;
        uint amount = msg.value;
        require(amount > highestBid, "There is an higher bid already!");
        require(amount >= highestBid + increment, "You have to pay a minimum increment amount!");
        
        //if exists, refund the previous winning bidder
        if(winningBidder != address(0)){
            refundTo(winningBidder, highestBid);
        }

        if(highestBid != 0){
            bidders[bidder] += amount;
        }
        
        highestBid = amount;
        winningBidder = bidder;
        emit newHighestBidEvent(bidder, amount);
    }
}
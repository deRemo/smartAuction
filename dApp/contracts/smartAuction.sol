pragma solidity ^0.5.1;

//smart auction base contract
contract smartAuction {
    address payable auctioneer; //the seller
    mapping(address => uint) bidders; //maps bidders to the amount they spent
    bool finalized; //set at true when the payment is finalized, to avoid multiple unwanted transfers 
    
    uint winningBid;
    address payable winningBidder;
    uint reservePrice; //the seller may decide to not sell the good if highestBid < reservePrice
    
    enum phase {preBidding, bidding, postBidding, end} //enum phases of the auction
    uint creationBlock; //auction creation block number
    uint preBiddingLength; //pre bidding time period, in blocks
    uint biddingLength; //bidding time period, in blocks
    uint postBiddingLength; //post bidding time period, in blocks
    
    event logEvent(string str); //debug
    event newHighestBidEvent(address bidder, uint amount); //notify new highest bid
    event finalizeEvent(address bidder, uint amount); //notify that the auction has ended and the good has been payed
    event refundEvent(address bidder, uint amount); //notify if someone get a refund
    event noWinner(); //notify if there is no winner
    
    //init auction instance
    constructor(uint _reservePrice, uint _preBiddingLength, uint _biddingLength, uint _postBiddingLength) public {
        require(_biddingLength > 0, "You must specify the bidding time(in block) and reserve price!");
        auctioneer = msg.sender;
        creationBlock = block.number;
        
        preBiddingLength = _preBiddingLength;
        biddingLength = _biddingLength;
        postBiddingLength = _postBiddingLength;
        
        reservePrice = _reservePrice;
    }
    
    //determine the phase of the auction
    function getCurrentPhase() public view returns (phase) {
        uint currentBlock = block.number;
        //require((creationBlock + preBiddingLength + biddingLength + postBiddingLength) > currentBlock, "The auction is already concluded!");
        
        if((creationBlock + preBiddingLength) - 1 >= currentBlock){
            return phase.preBidding;
        }
        else if((creationBlock + preBiddingLength + biddingLength) - 1 >= currentBlock){
            return phase.bidding;
        }
        else if((creationBlock + preBiddingLength + biddingLength + postBiddingLength) - 1 >= currentBlock){
            return phase.postBidding;
        }
        else{
            return phase.end;
        }
    }
    
    //default bid conditions
    function bidConditions() view internal{
        phase _currentPhase = getCurrentPhase();
        require(_currentPhase != phase.preBidding, "It is not bidding time yet!");
        require(_currentPhase != phase.postBidding || _currentPhase != phase.end, "Auction already ended!");
    }
    
    //default withdraw conditions
    function withdrawConditions() view internal{
        phase _currentPhase = getCurrentPhase();
        require(_currentPhase != phase.preBidding, "It is not bidding time yet, so you have nothing to withdraw!");
        require(_currentPhase != phase.bidding, "You can't withdraw during bidding time!");
    }
    
    //internal function, used to refund the bidder
    //Note: if amount is lower than how much the bidder spent, the leftovers remains on the contract as a fee!
    function refundTo(address payable bidder, uint amount) internal  {
        require(amount > 0, "amount needs to be higher than zero!");
        require(amount <= bidders[bidder], "you don't have to refund that much!");
        
        uint total = bidders[bidder];
        if (total > 0) {
            bidders[bidder] = 0;

            bidder.transfer(amount);
            emit refundEvent(bidder, amount);
        }
    }
    /*
    function refundTo(address bidder, uint amount) internal returns (bool){
        //require(amount > 0, "amount needs to be higher than zero!");
        //require(amount <= bidders[bidder], "you don't have to refund that much!");
        uint total = bidders[bidder];
        
        if(total > 0){
            bidders[bidder] = 0;
            if(amount > 0 && amount <= total){
                if(!bidder.send(amount)){
                    bidders[bidder] = total;
                
                    return false;
                }
                
                emit refundEvent(bidder, amount);
            }
        }
        
        return true;
    }*/
    /*
    function refundTo(address bidder, uint amount) internal returns (bool){
        require(amount > 0, "amount needs to be higher than zero!");
        require(amount <= bidders[bidder], "you don't have to refund that much!");
        
        uint total = bidders[bidder];
        bidders[bidder] = 0;
        if(!bidder.send(amount)){
            bidders[bidder] = total;
        
            return false;
        }
        
        emit refundEvent(bidder, amount);
        return true;
    }*/
    
    //default finalize conditions
    function finalizeConditions() internal{
        require(getCurrentPhase() == phase.end, "Auction hasn't ended yet");
        require(!finalized, "Auction has ended and the payment has already been finalized");
        require(msg.sender == winningBidder || msg.sender == auctioneer, "You are not the winner or the auctioneer!");
        
        finalized = true;
    }
    
    //debug function: used to create a fake transaction
    function wait() public returns (phase) {
        emit logEvent("wait");
        
        return getCurrentPhase();
    }
    
    //finalize method: not implemented in order to make the contract abstract
    function finalize() public;
    
    function getAuctioneer() public view returns(address){
        return auctioneer;
    }
    
    function getPreBiddingLength() public view returns(uint){
        return preBiddingLength;
    }
    
    function getBiddingLength() public view returns(uint){
        return biddingLength;
    }
    
    function getPostBiddingLength() public view returns(uint){
        return postBiddingLength;
    }
    
    function getAuctionLength() public view returns(uint){
        return preBiddingLength + biddingLength + postBiddingLength;
    }
}
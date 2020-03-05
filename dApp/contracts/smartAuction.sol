pragma solidity ^0.5.3;

//smart auction base contract
contract smartAuction {
    address payable seller;
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
    
    event logEvent(string message, uint val); //debug
    event newHighestBidEvent(address bidder, uint amount); //notify new highest bid
    event finalizeEvent(address bidder, uint amount); //notify that the auction has ended and the good has been payed
    event noWinnerEvent(); //notify that the auction has ended with no winner
    event refundEvent(address bidder, uint amount); //notify if someone get a refund
    
    //init auction instance
    constructor(address payable _seller, uint _reservePrice, uint _preBiddingLength, uint _biddingLength, uint _postBiddingLength) public {
        require(_biddingLength > 0, "You must specify the bidding time(in block) and reserve price!");
        seller = _seller;
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
        
        if((creationBlock + preBiddingLength) >= currentBlock){
            return phase.preBidding;
        }
        else if((creationBlock + preBiddingLength + biddingLength) >= currentBlock){
            return phase.bidding;
        }
        else if((creationBlock + preBiddingLength + biddingLength + postBiddingLength) >= currentBlock){
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
        if(amount > 0){
            require(amount <= bidders[bidder], "you don't have to refund that much!");
        
            uint total = bidders[bidder];
            if (total > 0) {
                bidders[bidder] = 0;

                bidder.transfer(amount);
                emit refundEvent(bidder, amount);
            }
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
    function finalizeConditions() public{
        require(getCurrentPhase() == phase.end, "Auction hasn't ended yet");
        require(!finalized, "Auction has ended and the payment has already been finalized");
        require(msg.sender == winningBidder || msg.sender == seller, "You are not the winner or the seller!");
        
        finalized = true;
    }
    
    //debug function: used to create a fake transaction
    function wait() public returns (phase) {
        emit logEvent("block.num", block.number);

        return getCurrentPhase();
    }
    
    //finalize method: not implemented in order to make the contract abstract
    function finalize() public;
    
    function isFinalized() public view returns(bool){
        return finalized;
    }

    //Getters

    function getSeller() public view returns(address){
        return seller;
    }
    
    function getWinningBidder() public view returns(address){
        return winningBidder;
    }

    function getWinningBid() public view returns(uint){
        return winningBid;
    }

    function getCreationBlock() public view returns(uint){
        return creationBlock;
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

pragma solidity ^0.4.22;

contract smartAuction {
    address public auctioneer; //the seller
    mapping(address => uint) bidders; //maps bidders to the amount they spent
    bool finalized; //set at true when the payment is finalized, to avoid multiple unwanted transfers 
    
    uint highestBid;
    address winningBidder;
    
    uint reservePrice; //the seller may decide to not sell the good if highestBid < reservePrice
    
    enum phase {preBidding, bidding, postBidding, end} //enum phases of the auction
    uint creationBlock; //auction creation block number
    uint preBiddingLength; //pre bidding time period, in blocks
    uint biddingLength; //bidding time period, in blocks
    uint postBiddingLength; //post bidding time period, in blocks
    
    event logEvent(string debug); //debug
    event newHighestBidEvent(address bidder, uint amount); //notify new highest bid
    event finalizeEvent(address bidder, uint amount); //notify that the auction has ended and the good has been payed
    event refundEvent(address bidder, uint amount); //notify if someone get a refund
    
    //init auction instance
    constructor(uint _reservePrice, uint _preBiddingLength, uint _biddingLength, uint _postBiddingLength) public {
        require(_biddingLength > 0 && _reservePrice > 0, "You must specify the bidding time(in block) and reserve price!");
        auctioneer = msg.sender;
        creationBlock = block.number;
        
        preBiddingLength = _preBiddingLength;
        biddingLength = _biddingLength;
        postBiddingLength = _postBiddingLength;
        
        reservePrice = _reservePrice;
    }
    
    //determine the phase of the auction
    function currentPhase() public returns (phase) {
        uint currentBlock = block.number;
        //require((creationBlock + preBiddingLength + biddingLength + postBiddingLength) > currentBlock, "The auction is already concluded!");
        
        if((creationBlock + preBiddingLength) - 1 >= currentBlock){
            emit logEvent("pre");
            return phase.preBidding;
        }
        else if((creationBlock + preBiddingLength + biddingLength) - 1 >= currentBlock){
            emit logEvent("bd");
            return phase.bidding;
        }
        else if((creationBlock + preBiddingLength + biddingLength + postBiddingLength) - 1 >= currentBlock){
            emit logEvent("post");
            return phase.postBidding;
        }
        else{
            emit logEvent("end");
            return phase.end;
        }
    }
    
    //default bid conditions
    function bidConditions() internal{
        phase _currentPhase = currentPhase();
        require(_currentPhase != phase.preBidding, "It is not bidding time yet!");
        require(_currentPhase != phase.postBidding || currentPhase() != phase.end, "Auction already ended!");
    }
    
    //default withdraw conditions
    function withdrawConditions() internal{
        phase _currentPhase = currentPhase();
        require(_currentPhase != phase.bidding, "You can't withdraw during bidding time!");
    }
    
    //internal function, used to refund the bidder
    //WARNING: if amount is lower than how much the bidder spent, the leftovers remains on the contract for ever!
    //WARNING: DON'T call it directly, but use it in another function that does all the condition checks instead!
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
        require(currentPhase() == phase.end, "Auction hasn't ended yet");
        require(!finalized, "The payment has already been finalized");
        require(msg.sender == winningBidder || msg.sender == auctioneer, "You are not the winner or the auctioneer!");
        require(highestBid >= reservePrice, "reserve price minimum not satisfied!");
        
        finalized = true;
        
        emit finalizeEvent(winningBidder, highestBid);
        auctioneer.transfer(highestBid);
    }
}

/* 
pre bidding phase: grace period, length = 30
bidding phase: buyout then bids, length depends on the unchalleged time
post bidding phase: not used, length = 0
end phase: finalize
*/
contract englishAuction is smartAuction{
    uint buyOutPrice; //If someone pays this amount before any bid in the bidding time, the good is sold immediately without starting the auction
    uint increment; //The minimum amount you have to add to current highestBid in order to be the winning bidder
    uint unchallegedLength; //Number of blocks (excluding the current one) a bid must be unchallenged before it is considered the winning bid
    
    constructor(uint _reservePrice, uint _buyOutPrice, uint _unchallegedLength, uint _increment) 
                    smartAuction( _reservePrice, 0, _unchallegedLength, 0) public {
        buyOutPrice = _buyOutPrice;
        increment = _increment;
        unchallegedLength = _unchallegedLength;
        
        highestBid = reservePrice;
    }
    
    function buyOut() payable public {
        super.bidConditions(); //it is like a bid that always win
        
        require(buyOutPrice != 0, "NO buy out price or someone else already bidded!");
        uint amount = msg.value;
        require(amount >= buyOutPrice, "Your amount is not enough to buy out!");
        
        //pay!
        highestBid = amount;
        winningBidder = msg.sender;
        
        //The auction can be considered over, because the buyout condition is satisfied
        preBiddingLength=0;
        biddingLength=0;
    }
    
    function bid() payable public{
        super.bidConditions();
        
        address bidder = msg.sender;
        uint amount = msg.value;
        require(amount > highestBid, "There is an higher bid already!");
        require(amount >= highestBid + increment, "You have to pay a minimum increment amount!");
        
        biddingLength += block.number - creationBlock + 1; //increment bidding time in order to have the same unchallegedLength for each bid
        
        //no more chances of buying out the good
        if(buyOutPrice != 0){
            buyOutPrice = 0;
        }
        
        //if exists, refund the previous winning bidder
        if(winningBidder != address(0)){
            refundTo(winningBidder, highestBid);
        }
        
        highestBid = amount;
        winningBidder = bidder;
        emit newHighestBidEvent(bidder, amount);
    }
}

/* 
pre bidding phase: grace period, length = 30
bidding phase: bid commit and withdraw
post bidding phase: bid opening
end phase: finalize
*/
contract vickeryAuction is smartAuction{
    uint deposit; //deposit requirement for committing a bid
    uint bidCommitLength; //block time length of the subphase bid committment, on which bidders submit a commitment to their bid (PART OF BIDDING TIME)
    uint bidWithdrawLength; //block time length of the subphase bid withdrawal, on which bidders can withdraw their bids, by paying a fee (PART OF BIDDING TIME)
    uint bidOpeningLength; //block time length of the opening phase, on which all bidders should reveal their bids (IT IS THE POST BIDDING PHASE RENAMED)
    
    mapping(address => bytes32) commits; //keep track of the hashed committments
    
    constructor(uint _reservePrice, uint _deposit, uint _bidCommitLength, uint _bidWithdrawLength, uint _bidOpeningLength) 
                    smartAuction(_reservePrice, 0, _bidCommitLength + _bidWithdrawLength, _bidOpeningLength) public {
        
        deposit = _deposit; 
        bidCommitLength = _bidCommitLength;
        bidWithdrawLength = _bidWithdrawLength;
        bidOpeningLength = _bidOpeningLength;
    }
    
    function bid(uint32 nonce, uint bidCommit) payable public{
        super.bidConditions();
        
        require((creationBlock + preBiddingLength + bidCommitLength) - 1 >= block.number, "It is not bid committment time anymore!");
        uint amount = msg.value;
        address bidder = msg.sender;
        require(commits[bidder] == 0, "You have already made a committment!");
        require(amount >= deposit, "Amount is not enough: minimum deposit required!");
        
        bidders[bidder] = amount; //saving the deposit requirement
        
        bytes32 hash = keccak256(nonce, " ", bidCommit); //because sha3 is deprecated!
        commits[bidder] = hash;
    }
    
    function withdraw() public returns (bool){
        super.bidConditions(); //Because in this case the withdraw require the same conditions of bids!
        require((creationBlock + preBiddingLength + bidCommitLength) - 1 < block.number, "It is still bid committment time!");
        
        address bidder = msg.sender;
        uint amount = bidders[bidder]/2; //they pay half deposit as a fee
        commits[bidder] = bytes32(0); //remove committment
        
        return refundTo(bidder, amount);
    }
    
    function reveal(uint32 nonce) payable public{
        require(currentPhase() == phase.postBidding, "It is not reveal time yet");
        
        uint amount = msg.value;
        address bidder = msg.sender;
        bytes32 hash = keccak256(nonce, " ", amount);
        require(hash == commits[bidder], "The committment doesn't match with the amount sended!");
        
        
    }
}
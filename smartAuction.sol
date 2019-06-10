pragma solidity ^0.4.22;

contract smartAuction {
    address auctioneer; //the seller
    mapping(address => uint) bidders; //maps bidders to the amount they spent
    bool finalized; //set at true when the payment is finalized, to avoid multiple unwanted transfers 
    
    uint winningBid;
    address winningBidder;
    uint reservePrice; //the seller may decide to not sell the good if highestBid < reservePrice
    
    enum phase {preBidding, bidding, postBidding, end} //enum phases of the auction
    uint creationBlock; //auction creation block number
    uint preBiddingLength; //pre bidding time period, in blocks
    uint biddingLength; //bidding time period, in blocks
    uint postBiddingLength; //post bidding time period, in blocks
    
    event logEvent(string str); //debug
    event testEvent(uint value); //debug
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
        require(_currentPhase != phase.bidding, "You can't withdraw during bidding time!");
    }
    
    //internal function, used to refund the bidder
    //Note: if amount is lower than how much the bidder spent, the leftovers remains on the contract as a fee!
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
    }
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
        require(!finalized, "The payment has already been finalized");
        require(msg.sender == winningBidder || msg.sender == auctioneer, "You are not the winner or the auctioneer!");
        
        finalized = true;
    }
    
    function getAuctioneer() public view returns(address){
        return auctioneer;
    }
    
    function getBiddingLength() public view returns(uint){
        return biddingLength;
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
    
    event buyOutEvent(address bidder, uint amount); //notify that someone buy out the good
    
    constructor(uint _reservePrice, uint _buyOutPrice, uint _unchallegedLength, uint _increment) 
                    smartAuction( _reservePrice, 0, _unchallegedLength, 0) public {
        buyOutPrice = _buyOutPrice;
        increment = _increment * (10**18); //convert in ether
        unchallegedLength = _unchallegedLength;
        
        winningBid = reservePrice * (10**18); //convert in ether
    }
    
    function buyOut() payable public {
        super.bidConditions(); //it is like a bid that always win
        
        require(buyOutPrice != 0, "NO buy out price or someone else already bidded!");
        uint amount = msg.value;
        require(amount >= buyOutPrice, "Your amount is not enough to buy out!");
        
        //pay!
        winningBid = amount;
        winningBidder = msg.sender;
        
        //The auction can be considered over, because the buyout condition is satisfied
        preBiddingLength=0;
        biddingLength=0;
        
        emit buyOutEvent(winningBidder, winningBid);
    }
    
    function bid() payable public{
        super.bidConditions();
        
        address bidder = msg.sender;
        uint amount = msg.value;
        require(amount > winningBid, "There is an higher bid already!");
        require(amount >= winningBid + increment, "You have to pay a minimum increment amount!");
        
        biddingLength += unchallegedLength - (biddingLength - ((block.number - creationBlock) + 1)); //increment bidding time in order to have the same unchallegedLength for each bid
        
        //no more chances of buying out the good
        if(buyOutPrice != 0){
            buyOutPrice = 0;
        }
        
        //if exists, refund the previous winning bidder
        if(winningBidder != address(0)){
            refundTo(winningBidder, winningBid);
        }
        
        winningBid = amount;
        winningBidder = bidder;
        bidders[winningBidder] = winningBid;
        emit newHighestBidEvent(bidder, amount);
    }
    
    function finalize() public{
        super.finalizeConditions();
        auctioneer.transfer(winningBid);
        
        emit finalizeEvent(winningBidder, winningBid);
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
    
    uint price; //amount that the winner has to pay (the second highest bid)
    mapping(address => bytes32) commits; //keep track of the hashed committments
    
    event noWinner();
    
    constructor(uint _reservePrice, uint _deposit, uint _bidCommitLength, uint _bidWithdrawLength, uint _bidOpeningLength) 
                    smartAuction(_reservePrice * (10**18), 0, _bidCommitLength + _bidWithdrawLength, _bidOpeningLength) public { //convert in ether
        
        deposit = _deposit * (10**18); //convert in ether
        //price = _reservePrice * (10**18); //convert in ether
        
        bidCommitLength = _bidCommitLength;
        bidWithdrawLength = _bidWithdrawLength;
        bidOpeningLength = _bidOpeningLength;
    }
    
    //commit using an hashed message to ensure the bid's secrecy
    function bid(bytes32 hash) payable public{
        super.bidConditions();
        require((creationBlock + preBiddingLength + bidCommitLength) - 1 >= block.number, "It is not bid committment time anymore!");
        
        uint depositAmount = msg.value;
        address bidder = msg.sender;
        require(commits[bidder] == 0, "You have already made a committment!");
        require(depositAmount >= deposit, "Deposit amount is not enough!");
        
        bidders[bidder] = depositAmount; //saving the deposit requirement
        commits[bidder] = hash; //saving the hashed committment
    }
    
    //Handy method used to generate and send hashed committment
    function simple_bid(uint32 nonce, uint bidAmount) payable public{
        bid(keccak256(nonce, bidAmount * (10**18))); //convert in ether
    }
    
    function withdraw() public returns (bool){
        super.bidConditions(); //Because in this case the withdraw require the same conditions of bids!
        require((creationBlock + preBiddingLength + bidCommitLength + bidWithdrawLength) - 1 >= block.number, "It is still bid committment time!");
        
        address bidder = msg.sender;
        uint refundAmount = bidders[bidder]/2; //they pay half deposit as a fee
        commits[bidder] = bytes32(0); //remove committment
        
        return refundTo(bidder, refundAmount);
    }
    
    function reveal(uint32 nonce) payable public{
        require(getCurrentPhase() == phase.postBidding, "It is not reveal time yet");
        require(commits[msg.sender] != bytes32(0), "You didn't bid in this auction!");
        
        uint amount = msg.value;
        address bidder = msg.sender;
        bytes32 hash = keccak256(nonce, amount); //sha3 is deprecated!
        require(hash == commits[bidder], "The amount doesn't match with the committment!");
        
        refundTo(bidder, bidders[bidder]); //refund full deposit
        bidders[bidder] += amount; //add bid amount
        
        //dinamically set the winner and the price
        if(amount > winningBid){
            
            if(winningBidder != address(0)){ //check if there was already a winner: if so, refund him
                refundTo(winningBidder, winningBid); //refund bid amount
                price = winningBid;
            }
            
            winningBid = amount;
            winningBidder = bidder;
            emit newHighestBidEvent(bidder, amount);
        }
        else{
            if(amount > price){ //check if your bid will be the final price
                price = amount;
            }
            
            refundTo(bidder, bidders[bidder]); //refund bid amount
        }
    }
    
    //give back the remaining to the winning bidder
    function finalize() public{
        super.finalizeConditions();
        
        if(winningBid >= reservePrice){
            auctioneer.transfer(price);
            
            bidders[winningBidder] -= price;
            
            refundTo(winningBidder, bidders[winningBidder]);
            emit finalizeEvent(winningBidder, price);
        }
        else{
            emit noWinner();
            refundTo(winningBidder, winningBid);
        }
    }
}
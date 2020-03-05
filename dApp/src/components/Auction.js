import React, { Component } from 'react';
import { withStyles } from '@material-ui/core'

import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Paper from '@material-ui/core/Paper';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import Button from '@material-ui/core/Button';
import SwapHorizontalCircleIcon from '@material-ui/icons/SwapHorizontalCircle';
import Grid from '@material-ui/core/Grid';

//import { MyTextField } from "./customs/AuctionCustoms";

const styles = (theme) => ({
	root: {
		flexGrow: 1,
	},
	
	paper: {
    	textAlign: 'center',
        color: "theme.palette.text.secondary",
    },

    phase_paper: {
    	textAlign: 'center',
        color: "theme.palette.text.secondary",
    },

    auction_button:{
		margin: theme.spacing(1),
    },

    grid: {
        marginTop: '5px',
        alignItems: 'center',
    },
});

//enum: phases of an auction
const phases = Object.freeze({
	PREBID : 0,
    BID : 1,
    //Special "subcases" of BID for vickery auction
    COMMIT : 1.1,
    WITHDRAW : 1.2,
    //
    POSTBID : 2, 
    END : 3
});

//the following enums propose prettier names to display to the end-user
//(phase -> "pretty_phase")
const en_pretty_phases = Object.freeze({
    0 : 'GRACE',
    1 : 'BID',
    //phase 2 (postbid) is not used in english auction
    3 : 'END'
});
const vk_pretty_phases = Object.freeze({
    0 : 'GRACE',
    1.1 : 'COMMIT',
    1.2 : 'WITHDRAW',
    2 : 'REVEAL',
    3 : 'END'
});

//enum: types of contract
const types = Object.freeze({
	ENGLISH : 'englishAuction',
	VICKERY : 'vickeryAuction',
	FACTORY : 'smartAuctionFactory'
});

class Auction extends Component {
    constructor(props){
        super(props);
        
        //initial state: set up the generic component properties and
        //those depending on the auction type
        const isEnglish = this.props.auction_type === types.ENGLISH;
        this.state = {
            //general infos about the contract
            addr : this.props.auction_addr,
            type : this.props.auction_type,
            contract : this.props.auction_json,

            //display values & properties
            open_dialog : false,
            pretty_phases : (isEnglish) ? en_pretty_phases : vk_pretty_phases,
            icon_color : (isEnglish) ? "primary" : "error",
            bid_value : '',
            nonce_value : '',
        }
    }

    componentDidMount(){
        //Retrieve auction infos
        this.state.contract.at(this.state.addr).then(async(instance) =>{
            console.log("auction contract: ", instance);
            //WIP
            /*const updateInfo = (fun, name) => {
                fun().then(result => { this.setState({name : result}); });
            };
            updateInfo(instance.getSeller, "seller");
            console.log(updateInfo(instance.getSeller));*/

            /* LOAD UP AUCTION INFOS */
            const isEnglish = this.state.type === types.ENGLISH;
            this.setState({
                //general information about the auction,
                seller: await instance.getSeller(),
                creationBlock: parseInt(await instance.getCreationBlock(), 10),
                preBiddingLength: parseInt(await instance.getPreBiddingLength(), 10),
                biddingLength: parseInt(await instance.getBiddingLength(), 10),
                postBiddingLength: parseInt(await instance.getPostBiddingLength(), 10),
                auctionLength: parseInt(await instance.getAuctionLength(), 10),
                winning_bidder : await instance.getWinningBidder(),
                winning_bid : parseInt((await instance.getWinningBid()), 10),
                finalized: await instance.isFinalized(),

                //auction type specific informations
                increment : (isEnglish) ? parseInt(await instance.getIncrement(), 10) : undefined,
                buy_out : (isEnglish) ? parseInt(await instance.getBuyOutPrice(), 10) : undefined,

                deposit : (isEnglish) ? undefined : parseInt(await instance.getDeposit(), 10),
                bidCommitLength : (isEnglish) ? undefined : parseInt(await instance.getBidCommitLength(), 10),
                bidWithdrawLength : (isEnglish) ? undefined : parseInt(await instance.getBidWithdrawLength(), 10),
                account_committed : (isEnglish) ? undefined : (await instance.userCommitted(this.props.account)),
            })

            //now that everything is set up, I can calculate the auction's phase
            this.setState({
                currentPhase : this.getCurrentPhase(),
            })
        });

        //Set up external and internal event listeners
        this.state.contract.at(this.state.addr).then(async(instance) =>{
            /* SUBSCRIBE TO "LOCAL" (i.e. events in the dApp itself) EVENTS*/
            //subscribe to the dispatcher in order to listen to new mined blocks
            this.props.dispatcher.addEventSubscriber("newBlock", this.state.addr, () => { 
                //calculate new current phase
                this.setState({
                    currentPhase : this.getCurrentPhase(),
                })

                //check if finalized
                instance.isFinalized().then(async(res) => {
                    this.setState({finalized : res});
                }); 

                if(this.state.type === types.VICKERY){
                    instance.userCommitted(this.props.account).then(async(res) => {
                        this.setState({
                            account_committed : res,
                        });
                    });
                }
            });

            //In vickery auctions, you have to check if the user has committed to the auction
            if(this.state.type === types.VICKERY){
                this.props.dispatcher.addEventSubscriber("accountSwitch", this.state.addr, () => { 
                    instance.userCommitted(this.props.account).then(async(res) => {
                        this.setState({
                            account_committed : res,
                        });
                    });
                });
            }

            /* SUBSCRIBE TO SOLIDITY EVENTS*/
    
            instance.newHighestBidEvent().on('data', (event) => {
                console.log("newHighestBidEvent", event);
                this.setState({
                    winning_bidder : event.returnValues[0],
                    winning_bid : parseInt(event.returnValues[1], 10)
                })

                //if english auction, the bidding time is "artificially" stretched everytime
                //there is a new winning bid
                if(this.state.type === types.ENGLISH){
                    instance.getBiddingLength().then(async(res) => {
                        this.setState({biddingLength : parseInt(res, 10) });
                    })

                    instance.getAuctionLength().then(async(res) => {
                        this.setState({auctionLength : parseInt(res, 10) });
                    })
                }
            });

            instance.finalizeEvent().on('data', (event) =>{
                console.log("finalize");

                //dispatch a new event to notify the end of the auction
                this.props.dispatcher.dispatch('auctionEnd', { addr : this.state.addr,
                                                               winning_bidder : event.returnValues[0],
                                                               winning_bid : parseInt(event.returnValues[1], 10) });
            });

            instance.noWinnerEvent().on('data', () =>{
                console.log("no winner");

                //dispatch a new event to notify the end of the auction
                this.props.dispatcher.dispatch('auctionEnd', { addr : this.state.addr });
            });

            //debug event
            instance.logEvent().on('data', (event) =>{
                //dispatch a new event to notify the debug message
                this.props.dispatcher.dispatch('debug', { msg : event.returnValues[0], 
                                                          val : event.returnValues[1] });

                console.log("msg: "+event.returnValues[0]+"  |  val: "+event.returnValues[1]);
            });

            //hash event
            if(this.state.type === types.VICKERY){
                instance.hashEvent().on('data', (event) =>{
                    //dispatch a new event to notify the debug message
                    this.props.dispatcher.dispatch('debug', { msg : event.returnValues[0], 
                                                              val : -1 });
    
                    console.log("hash: "+event.returnValues[0]);
                });
            }

            instance.refundEvent().on('data', (event) =>{
                console.log("refundEvent", event);

                //check if you are the one receiving the refund
                if(event.returnValues[0] === this.props.account){
                    //dispatch refund event
                    this.props.dispatcher.dispatch('refund', { addr : this.state.addr, 
                                                               amount : event.returnValues[1] });
                }
            });
        });
    }

    //Update one auction's information, by passing the auction's function and the
    //related field. NOTE: uints are converted to BigNumber in javascript, therefore
    //set the isUint flag to true to convert it back to int
    updateInfo = (fun, field, isUint = false) => {
        fun().then(async(result) => {

            if(isUint){
                result = parseInt(result, 10);
            }

            this.setState({field : result}); 
        });
    }

    /* ENGLISH AUCTION FUNCTIONS */
    //check if the buyOut conditions are satistied:
    //>bid conditions have to be satisfied
    //>the seller has to enable buy outs
    //>the amount has to be greater or equal to the requested buy out
    buyOutConditions = () => {
        return this.bidConditions() &&
               this.state.buy_out !== 0 &&
               parseInt(this.state.bid_value) >= this.state.buy_out;
    };

    //send the buyout transaction
    handleBuyOut = () =>{
        if(this.buyOutConditions()){
            this.state.contract.at(this.state.addr).then(async(instance) => {
                instance.buyOut({from : this.props.account, value : this.state.bid_value});
            }).catch(err => {
                console.log('error: ', err.message);
            });
        }
        else{
            console.error("invalid buy out");
        }
    };

    //check if the bid conditions for english auction are satisfied
    englishBidConditions = () => {
        return this.bidConditions() &&
               parseInt(this.state.bid_value) >= this.state.winning_bid + this.state.increment;
    }

    //send the bid transaction
    handleBidButton = () =>{
        if(this.bidConditions()){
            this.state.contract.at(this.state.addr).then(async(instance) => {
                instance.bid({from : this.props.account, value : this.state.bid_value});
            }).catch(err => {
                console.log('error: ', err.message);
            });
        }
        else{
            console.error("invalid bid amount");
        }
    };

    /* VICKERY AUCTION FUNCTIONS */
    commitConditions = () => {
        return this.state.currentPhase === phases.COMMIT &&
               !this.state.account_committed && 
               parseInt(this.state.bid_value) >= this.state.deposit;
    }

    handleCommitButton = () => {
        if(this.commitConditions()){
            //create hash
            const hashedMsg = this.props.web3.utils.keccak256(this.props.web3.eth.abi.encodeParameters(['bytes32', 'uint'], [this.props.web3.utils.asciiToHex(this.state.nonce_value), this.state.bid_value]));
            console.log(hashedMsg);
            
            //send transaction
            this.state.contract.at(this.state.addr).then(async(instance) => {
                instance.bid(hashedMsg, {from : this.props.account, value : this.state.deposit});
            }).catch(err => {
                console.log('error: ', err.message);
            });
        }
        else{
            console.error("not commit phase");
        }
    }

    withdrawConditions = () => {
        return this.state.currentPhase === phases.WITHDRAW;
    }

    handleWithdrawButton = () => {
        if(this.withdrawConditions()){
            //send transaction
            this.state.contract.at(this.state.addr).then(async(instance) => {
                instance.withdraw({from : this.props.account});
            }).catch(err => {
                console.log('error: ', err.message);
            });
        }
        else{
            console.error("not withdraw phase");
        }
    }

    revealConditions = () => {
        return this.state.currentPhase === phases.POSTBID &&
               this.state.account_committed;
    }

    handleRevealButton = () => {
        if(this.revealConditions()){
            //send transaction
            this.state.contract.at(this.state.addr).then(async(instance) => {
                instance.reveal(this.props.web3.utils.fromAscii(this.state.nonce_value), {from : this.props.account, value : this.state.bid_value});
            }).catch(err => {
                console.log('error: ', err.message);
            });
        }
        else{
            console.error("not reveal phase");
        }
    }

    /* GENERIC AUCTION FUNCTIONS */

    //Used to calculate the phase of the auction
    //(this way I can avoid calling the contract at every new mined block)
    getCurrentPhase = () => {
        const currentBlock = this.props.currentBlock + 1;

        if((this.state.creationBlock + this.state.preBiddingLength) >= currentBlock){
            return phases.PREBID;
        }
        else if((this.state.creationBlock + this.state.preBiddingLength + this.state.biddingLength) >= currentBlock){
            if(this.state.type === types.ENGLISH){
                return phases.BID;
            }
            else{
                const bid_phase = this.state.creationBlock + this.state.preBiddingLength + this.state.biddingLength;

                if((bid_phase - this.state.bidCommitLength) >= currentBlock){
                    return phases.COMMIT;
                }
                else{
                    return phases.WITHDRAW;
                }
            }
        }
        else if((this.state.creationBlock + this.state.preBiddingLength + this.state.biddingLength + this.state.postBiddingLength) >= currentBlock){
            return phases.POSTBID;
        }
        else{
            return phases.END;
        }
    }

    //check if the generic bid conditions are satisfied:
    //>bid only if it is bidding time
    //>numbers only
    //>no empty value
    bidConditions = () =>{
        return this.getCurrentPhase() === phases.BID &&
               this.state.bid_value.match(/[a-z]/i) === null && 
               this.state.bid_value !== "";
    }

    //check if the auction is finalizable:
    // >the phase must be END
    // >the auction must be not already finalized
    // >you must be the winning bidder or the seller
    finalizeConditions = () => {
        return this.state.currentPhase === phases.END && 
               !this.state.finalized && 
               (this.props.account === this.state.winning_bidder || this.props.account === this.state.seller);
    }

    //handle the finalize event
    handleFinalize = () => {
        //if auction ended..
        if(this.finalizeConditions()){
            //unsubscribe from event dispatcher, because the auction is ended
            this.props.dispatcher.removeEventSubscriber("newBlock", this.state.addr);

            //trigger finalize()
            this.state.contract.at(this.state.addr).then(async(instance) =>{
                instance.finalize({from : this.props.account});
            });
        }
        else{
            console.error("can't finalize (wrong phase? wrong user? already finalized?");
        }
    };

    /* UI FUNCTIONS */

    //open and close the Auction Dialog, which is used to interact with it
    //and display the auction's infos
    handleDisplayDialog = (flag) => {
        this.setState({open_dialog : flag,
                       bid_value : '',
                       nonce_value : ''});
    };

    //get the bid value from the text field and store it in the state
    handleTextFieldChange = (e) => {
        if(e.target.id === "commit-field" || e.target.id === "bid-field"){
            this.setState({
                bid_value : e.target.value,
            });
        }
        else{
            this.setState({
                nonce_value : e.target.value,
            });
        }
    };

    //input field condition: empty field or numbers only
    inputFieldCondition = (field) =>{
        return field === "" || field.match(/^\d+$/) !== null;
    }

    //Requirements for an input field, in order to enable a button
    inputButtonConditions = (field) => {
        return field !== undefined &&
               field !== "" &&
               this.inputFieldCondition(field);
    };

    displayAreaByType = (props) => {
        const type = props.auction_type;
        
        if(type === types.ENGLISH){
            return(
                <DialogContentText>
                    Grace period (in blocks): <b>{this.state.preBiddingLength}</b><br/>
                    Bidding period (in blocks): <b>{this.state.biddingLength} </b><br/>
                    Total auction length (in blocks): <b>{this.state.auctionLength} </b><br/>
                    Current phase: <b>{this.state.pretty_phases[this.state.currentPhase]} </b><br/>
                    Buy Out Price (in wei): <b>{this.state.buy_out}</b>
                </DialogContentText>
            );
        }
        else{
            return(
                <DialogContentText>
                    Grace period (in blocks): <b>{this.state.preBiddingLength}</b><br/>
                    Commit / Withdraw period (in blocks): <b>{this.state.biddingLength} </b><br/>
                    Reveal period (in blocks): <b>{this.state.postBiddingLength} </b><br/>
                    Total auction length (in blocks): <b>{this.state.auctionLength} </b><br/>
                    Current phase: <b>{this.state.pretty_phases[this.state.currentPhase]} </b><br/>
                </DialogContentText>
            );
        }
    }

    //Render different functionalities, depending on the auction type
    actionAreaByType = (props) => {
        const type = props.auction_type;
        
        if(type === types.ENGLISH){
            return(
                <Grid
                    container
                    direction="row"
                    justify="flex-end"
                >
                    <TextField 
                        id="bid-field"
                        label="bid (in wei)"
                        onChange={this.handleTextFieldChange}
                        error={!this.inputFieldCondition(this.state.bid_value)}
                        helperText={!this.inputFieldCondition(this.state.bid_value) ? 'Numbers only!' : ''}
                        margin="normal"
                        fullWidth
                    />
                    <Button 
                        id="buyout-button"
                        onClick={this.handleBuyOut} 
                        disabled={!(this.inputButtonConditions(this.state.bid_value) && this.buyOutConditions())}
                        color="primary"
                    >
                        Buy Out
                    </Button>
                    <Button 
                        id="bid-button"
                        onClick={this.handleBidButton} 
                        disabled={!(this.inputButtonConditions(this.state.bid_value) && this.englishBidConditions())}
                        color="primary"
                    >
                        Bid
                    </Button>
                </Grid>
            );
        }
        else{
            return(
                <Grid
                    container
                    direction="row"
                    justify="flex-end"
                >
                    <TextField 
                        id="commit-field"
                        label="Committed value (in wei)"
                        onChange={this.handleTextFieldChange}
                        error={!this.inputFieldCondition(this.state.bid_value)}
                        fullWidth
                    />
                    <TextField 
                        id="nonce-field"
                        label="nonce (in numbers)"
                        onChange={this.handleTextFieldChange}
                        error={!this.inputFieldCondition(this.state.nonce_value)}
                        helperText={"NOTE: by pressing COMMIT, you accept to spend "+this.state.deposit+" wei as a deposit"}
                        fullWidth
                    />
                    <Button 
                        id="commit-button" 
                        onClick={this.handleCommitButton} 
                        disabled={!(this.inputButtonConditions(this.state.bid_value) && this.inputButtonConditions(this.state.nonce_value) && this.commitConditions())}
                        color="primary"
                    >
                        Commit
                    </Button>
                    <Button 
                        id="withdraw-button" 
                        onClick={this.handleWithdrawButton}
                        disabled={!(this.withdrawConditions())}
                        color="primary"
                    >
                        Withdraw
                    </Button>
                    <Button 
                        id="reveal-button" 
                        onClick={this.handleRevealButton} 
                        disabled={!(this.inputButtonConditions(this.state.bid_value) && this.inputButtonConditions(this.state.nonce_value) && this.revealConditions())}
                        color="primary"
                    >
                        Reveal
                    </Button>
                </Grid>
            );
        }
    }

    render(){
        const { classes } = this.props;

        return(
            <Paper className={classes.paper}>
                <Grid
                    container
                    direction="row"
                    justify="center"
                    alignItems="center"
                >
                    <SwapHorizontalCircleIcon color={this.state.icon_color} fontSize="large"></SwapHorizontalCircleIcon>
                    <Typography noWrap variant="body1" color="textSecondary" align="center">
                        Current phase: <b>{this.state.pretty_phases[this.state.currentPhase]}</b>
                    </Typography>
                </Grid>
                <Button 
                    color="primary" 
                    className={classes.auction_button} 
                    onClick={() => this.handleDisplayDialog(true)}
                >
                    Open auction
                </Button>

                <Dialog
                    open={this.state.open_dialog}
                    onClose={() => this.handleDisplayDialog(false)}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                <DialogTitle id="alert-dialog-title">{"Informations"}</DialogTitle>
                <DialogContent>
                {/* displayArea*/}
                <DialogContentText>
                    Auction type: <b>{this.state.type}</b><br/>
                    Auction address: <b>{this.state.addr}</b><br/>
                    Seller: <b>{this.state.seller}</b><br/>
                </DialogContentText>
                <this.displayAreaByType auction_type={this.state.type}/>
                <DialogContentText>
                    Winning Bidder: <b>{this.state.winning_bidder}</b><br/>
                    Winning Bid (in wei): <b>{this.state.winning_bid}</b>
                </DialogContentText>
                {/* ActionArea */}
                <this.actionAreaByType auction_type={this.state.type}/>
                </DialogContent>
                <DialogActions>
                <Button onClick={this.handleFinalize} disabled={!this.finalizeConditions()} color="primary">
                    Finalize
                </Button>
                <Button onClick={() => this.handleDisplayDialog(false)} color="primary">
                    Close
                </Button>
                </DialogActions>
            </Dialog>
            </Paper>
        );
    }
}

export default withStyles(styles)(Auction);
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

//enum: phases of an auction (prebid, bid, postbid and end)
const phases = Object.freeze({
	PREBID : '0',
	BID : '1',
	POSTBID : '2', 
	END : '3'
});

//Since using "0,1,2,3" or "PREBID, BID, POSTBID" is not very human readable,
//the following enums propose prettier names to display to the end-user
const en_pretty_phases = Object.freeze({
    '0' : 'GRACE',
    '1' : 'BID',
    //phase 2 (postbid) is not used in english auction
    '3' : 'END'
});
const vk_pretty_phases = Object.freeze({
    '0' : 'GRACE',
    '1' : 'COMMIT / WITHDRAW',
    '2' : 'REVEAL',
    '3' : 'END' 
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
                preBiddingLength: (await instance.getPreBiddingLength()).toString(),
                biddingLength: (await instance.getBiddingLength()).toString(),
                postBiddingLength: (await instance.getPostBiddingLength()).toString(),
                auctionLength: (await instance.getAuctionLength()).toString(),
                currentPhase: (await instance.getCurrentPhase()).toString(),
                winning_bidder : await instance.getWinningBidder(),
                winning_bid : (await instance.getWinningBid()).toString(),
                finalized: await instance.isFinalized(),

                //auction type specific informations
                increment : (isEnglish) ? (await instance.getIncrement()).toString() : undefined,
                buy_out : (isEnglish) ? (await instance.getBuyOutPrice()).toString() : undefined,

                deposit : (isEnglish) ? undefined : (await instance.getDeposit()).toString(),
                is_commit_phase : (isEnglish) ? undefined : (await instance.isBidCommitPhase()),
                is_withdraw_phase : (isEnglish) ? undefined : (await instance.isBidWithdrawPhase()),
                account_committed : (isEnglish) ? undefined : (await instance.userCommitted()),
            })
        });

        //Set up external and internal event listeners
        this.state.contract.at(this.state.addr).then(async(instance) =>{
            /* SUBSCRIBE TO "LOCAL" (i.e. events in the dApp itself) EVENTS*/
            //subscribe to the dispatcher in order to listen to new mined blocks
            this.props.dispatcher.addEventSubscriber("newBlock", this.state.addr, () => { 
                //check the current phase
                instance.getCurrentPhase().then(async(phase) => {
                    this.setState({
                        currentPhase : phase.toString(),
                    });
                })

                //check if finalized
                instance.isFinalized().then(async(res) => {
                    this.setState({finalized : res});
                }); 

                //if vickery auction, you also have to check the "subphases" of the bidding phase
                if(this.state.type === types.VICKERY){
                    instance.isBidCommitPhase().then(async(res) => {
                        this.setState({is_commit_phase : res});
                    });

                    instance.isBidCommitPhase().then(async(res) => {
                        this.setState({is_withdraw_phase : res});
                    });
                }
            });

            //In vickery auctions, you have to check if the user has committed to the auction
            if(this.state.type === types.VICKERY){
                this.props.dispatcher.addEventSubscriber("accountSwitch", this.state.addr, () => { 
                    instance.userCommitted().then(async(res) => {
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
                    winning_bid : event.returnValues[1]
                })
            });

            instance.finalizeEvent().on('data', (event) =>{
                console.log("finalize");

                //dispatch a new event to notify the end of the auction
                this.props.dispatcher.dispatch('auctionEnd', { addr : this.state.addr,
                                                               winning_bidder : event.returnValues[0],
                                                               winning_bid : event.returnValues[1] });
            });

            instance.noWinnerEvent().on('data', () =>{
                console.log("no winner");

                //dispatch a new event to notify the end of the auction
                this.props.dispatcher.dispatch('auctionEnd', { addr : this.state.addr });
            });

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

    /* ENGLISH AUCTION FUNCTIONS */
    //check if the buyOut conditions are satistied:
    //>bid conditions have to be satisfied
    //>the seller has to enable buy outs
    //>the amount has to be greater or equal to the requested buy out
    buyOutConditions = () => {
        return this.bidConditions() &&
               parseInt(this.state.buy_out) !== 0 &&
               parseInt(this.state.bid_value) >= parseInt(this.state.buy_out);
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
               parseInt(this.state.bid_value) >= parseInt(this.state.winning_bid) + parseInt(this.state.increment);
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
        return this.bidConditions() &&
               this.state.is_commit_phase &&
               this.state.account_committed && 
               parseInt(this.state.bid_value) >= parseInt(this.state.deposit);
    }

    withdrawConditions = () => {
        return this.bidConditions() &&
               !this.state.is_commit_phase &&
               this.state.is_withdraw_phase;
    }

    revealConditions = () => {
        return this.state.currentPhase === phases.POSTBID &&
               this.state.account_committed;
    }

    /* GENERIC AUCTION FUNCTIONS */
    //check if the generic bid conditions are satisfied:
    //>bid only if it is bidding time
    //>numbers only
    //>no empty value
    bidConditions = () =>{
        return this.state.currentPhase === phases.BID &&
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
                    Current phase: <b>{this.state.pretty_phases[this.state.currentPhase]} </b>
                </DialogContentText>
            );
        }
    }

    //open and close the Auction Dialog (used to show the auction's infos)
    handleDisplayDialog = (flag) => {
        this.setState({open_dialog : flag});
    };

    //get the bid value from the text field and store it in the state
    handleTextFieldChange = (e) => {
        this.setState({
            bid_value : e.target.value,
        });
    };

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
                        id="committ-field"
                        label="hash (in byte32)"
                        onChange={this.handleTextFieldChange}
                        error={!this.inputFieldCondition(this.state.bid_value)}
                        helperText={!this.inputFieldCondition(this.state.bid_value) ? 'Numbers only!' : ''}
                        margin="normal"
                        fullWidth
                    />
                    <Button id="commit-button" onClick={this.handleBidButton} color="primary">
                        Commit
                    </Button>
                    <Button id="withdraw-button" onClick={this.handleBidButton} color="primary">
                        Withdraw
                    </Button>

                    <TextField
                        id="reveal-field"
                        label="nonce (in uint32)"
                        margin="normal"
                        fullWidth
                        onChange={this.handleTextFieldChange}
                    />
                    <Button id="reveal-button" onClick={this.handleBidButton} color="primary">
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
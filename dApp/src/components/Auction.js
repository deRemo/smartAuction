import React, { Component } from 'react';
import { withStyles } from '@material-ui/core'

import Typography from '@material-ui/core/Typography';
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
import EnglishHandlers from './handlers/EnglishHandlers';
import VickeryHandlers from './handlers/VickeryHandlers';

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

//enum: types of contract
const types = Object.freeze({
	ENGLISH : 'englishAuction',
	VICKERY : 'vickeryAuction',
	FACTORY : 'smartAuctionFactory'
});

class Auction extends Component {
    constructor(props){
        super(props);
        
        const isEnglish = this.props.auction_type === types.ENGLISH;

        //pick the set of handlers based on the auction type
        this.handlers = (isEnglish) ? new EnglishHandlers(phases) : new VickeryHandlers(phases);

        //initial state: set up the generic component properties and
        //those depending on the auction type
        this.state = {
            //general infos about the contract
            addr : this.props.auction_addr,
            type : this.props.auction_type,
            contract : this.props.auction_json,

            //display values & properties
            open_dialog : false,
            bid_value : '',
            nonce_value : '',
        }
    }

    componentDidMount(){
        //Retrieve auction infos
        this.state.contract.at(this.state.addr).then(async(instance) =>{
            console.log("auction contract: ", instance);

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

            //load auction specific informations
            //this.setState(this.handlers.loadInfos(this.state));

            //console.log(this.handlers.loadInfos(instance));
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
                //update current phase
                this.setState({
                    currentPhase : this.getCurrentPhase(),
                })

                //update finalized state
                instance.isFinalized().then(async(res) => {
                    this.setState({finalized : res});
                }); 

                //update committed state for the current account, if vickery
                if(this.state.type === types.VICKERY){
                    instance.userCommitted(this.props.account).then(async(res) => {
                        this.setState({
                            account_committed : res,
                        });
                    });
                }
            });

            //In vickery auctions, you have to update the committed state, if the account changes
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
                //there is a new winning bid, therefore I have to update the length values
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

            this.state.contract.at(this.state.addr).then(async(instance) =>{
                //finalize the auction
                instance.finalize({from : this.props.account});

                //notify that an auction has been finalized
                this.props.dispatcher.dispatch('finalized', { addr : this.state.addr });
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
                    <SwapHorizontalCircleIcon color={this.handlers.icon_color} fontSize="large"></SwapHorizontalCircleIcon>
                    <Typography noWrap variant="body1" color="textSecondary" align="center">
                        Current phase: <b>{this.handlers.pretty_phases[this.state.currentPhase]}</b>
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
                {this.handlers.renderDisplayArea(this.state)}
                <DialogContentText>
                    Winning Bidder: <b>{this.state.winning_bidder}</b><br/>
                    Winning Bid (in wei): <b>{this.state.winning_bid}</b>
                </DialogContentText>
                {/* ActionArea */}
                {this.handlers.renderActionArea(this.state, 
                                                this.props, 
                                                this.handleTextFieldChange, 
                                                this.inputFieldCondition, 
                                                this.inputButtonConditions)}
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
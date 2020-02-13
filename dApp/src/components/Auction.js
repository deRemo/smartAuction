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

import { MyTextField, MyButton } from "./customs/AuctionCustoms";

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
        this.state = {
            //general infos about the contract
            addr : this.props.auction_addr,
            type : this.props.auction_type,
            contract : this.props.auction_json,

            //display values & properties
            open_dialog : false,
            pretty_phases : (this.props.auction_type === types.ENGLISH) ? en_pretty_phases : vk_pretty_phases,
            icon_color : (this.props.auction_type === types.ENGLISH) ? "primary" : "error",
            bid_value : '',
            display_phase : '',
            
            //disable component properties
            disable_finalize_button : true,
            disable_bid_button : true,
        }
    }

    componentDidMount(){
        this.state.contract.at(this.state.addr).then(async(instance) =>{
            console.log("auction contract: ", instance);
            //WIP
            /*const updateInfo = (fun, name) => {
                fun().then(result => { this.setState({name : result}); });
            };
            updateInfo(instance.getSeller, "seller");
            console.log(updateInfo(instance.getSeller));*/

            /* LOAD UP AUCTION INFOS */
            //general information about the auction,
            this.setState({
                seller: await instance.getSeller(),
                winning_bidder : await instance.getWinningBidder(),
                winning_bid : (await instance.getWinningBid()).toString(),
                preBiddingLength: (await instance.getPreBiddingLength()).toString(),
                biddingLength: (await instance.getBiddingLength()).toString(),
                postBiddingLength: (await instance.getPostBiddingLength()).toString(),
                auctionLength: (await instance.getAuctionLength()).toString(),
                currentPhase: (await instance.getCurrentPhase()).toString(),
                finalized: await instance.isFinalized(),
            })

            //display properties for the general informations
            this.setState({
                display_phase : this.state.pretty_phases[this.state.currentPhase],
                disable_bid_button : !this.isBidAmountCorrect(),
                disable_finalize_button : !this.isFinalizable(),
            })
            
            /* SUBSCRIBE TO "LOCAL" (i.e. events in the dApp itself) EVENTS*/
            //subscribe to the dispatcher in order to listen to new mined blocks
            this.props.dispatcher.addEventSubscriber("newBlock", this.state.addr, () => { 
                //check the current phase
                instance.getCurrentPhase().then(async(phase) => {
                    this.setState({
                        currentPhase : phase.toString(),
                        display_phase : this.state.pretty_phases[phase],
                    });
                }).then(() => {
                    this.setState({
                        disable_bid_button : !this.isBidAmountCorrect(),
                        disable_finalize_button : !this.isFinalizable(),
                    });
                });

                //check if finalized
                instance.isFinalized().then(async(res) => {
                    this.setState({finalized: res});
                }); 
            });

            this.props.dispatcher.addEventSubscriber("accountSwitch", this.state.addr, () => {
                this.setState({
                    disable_finalize_button : !this.isFinalizable(),
                });
            });

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

    //open and close the Auction Dialog (used to show the auction's infos)
    handleDisplayDialog = (flag) => {
        this.setState({open_dialog : flag});
    };

    isNumberOnly = (field) => {
		return field.match(/[a-z]/i) !== null;
    };
    
    isEmpty = (field) => {
        return field === "";
    }

    //get the bid value from the text field and store it in the state
    handleTextFieldChange = (e) => {
        this.setState({
            bid_value : e.target.value,
        });
    };

     //check if the bid amount in the textfield is valid:
    //>numbers only
    //>no empty value
    //>greater than the winning bid + increment
    isBidAmountCorrect = () =>{
        return this.state.bid_value.match(/[a-z]/i) === null && 
               this.state.bid_value !== "";
               //&& this.state.bid_value >= this.state.winning_bid + this.state.increment;
    }

    //send the bid transaction
    handleBidButton = () =>{
        if(this.isBidAmountCorrect()){
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

    //check if the auction is finalizable:
    // >the phase must be END
    // >the auction must be not already finalized
    // >you must be the winning bidder or the seller
    isFinalizable = () => {
        return this.state.currentPhase === phases.END && 
               !this.state.finalized && 
               (this.props.account === this.state.winning_bidder || this.props.account === this.state.seller);
    }

    //handle the finalize event
    handleFinalize = () => {
        //if auction ended..
        if(this.isFinalizable()){
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

    //Render different functionalities, depending on the auction type
    renderByType = (props) => {
        const type = props.auction_type;
        
        if(type === types.ENGLISH){
            return(
                <Grid
                    container
                    direction="row"
                    justify="flex-end"
                >
                    <MyTextField
                        id="bid-field"
                        label="bid (in wei)"
                        onChange={this.handleTextFieldChange}
                        field={this.state.bid_value}
                    />
                    <MyButton 
                        id="bid-button" 
                        onClick={this.handleBidButton} 
                        field={this.state.bid_value}
                        value="Bid"
                    />
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
                    <MyTextField
                        id="committ-field"
                        label="hash (in byte32)"
                        onChange={this.handleTextFieldChange}
                        field={this.state.bid_value}
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
                        Current phase: <b>{this.state.display_phase}</b>
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
                <DialogContentText>
                    Auction type: <b>{this.state.type}</b><br/>
                    Auction address: <b>{this.state.addr}</b><br/>
                    Seller: <b>{this.state.seller}</b><br/>
                    <br/>
                    Pre bidding length (in blocks): <b>{this.state.preBiddingLength}</b><br/>
                    Bidding length (in blocks): <b>{this.state.biddingLength} </b><br/>
                    Post bidding length (in blocks): <b>{this.state.postBiddingLength} </b><br/>
                    Total auction length (in blocks): <b>{this.state.auctionLength} </b><br/>
                    Current phase: <b>{this.state.display_phase} </b><br/>
                    <br/>
                    Winning Bidder: <b>{this.state.winning_bidder}</b><br/>
                    Winning Bid (in wei): <b>{this.state.winning_bid}</b>
                </DialogContentText>
                <this.renderByType auction_type={this.state.type}/>
                </DialogContent>
                <DialogActions>
                <Button onClick={this.handleFinalize} disabled={this.state.disable_finalize_button} color="primary">
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
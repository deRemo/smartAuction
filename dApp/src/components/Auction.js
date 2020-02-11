import React, { Component } from 'react';
import { withStyles } from '@material-ui/core'
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import SwapHorizontalCircleIcon from '@material-ui/icons/SwapHorizontalCircle';
import Grid from '@material-ui/core/Grid';

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

    button:{
		margin: theme.spacing(1),
    },
});

//4 generic phases: prebid, bid, postbid and end
const phases = {
	PREBID: '0',
	BID: '1',
	POSTBID: '2', 
	END: '3'
};

//enum: types of contract
const types = {
	ENGLISH: 'englishAuction',
	VICKERY: 'vickeryAuction',
	FACTORY: 'smartAuctionFactory'
};

class Auction extends Component {
    constructor(props){
        super(props);
        
        //initial state
        this.state = {
            open_dialog : false,
            addr : this.props.auction_addr,
            type : this.props.auction_type,
            contract : this.props.auction_json,
            //account : this.props.account,
            bid_value : '',
            icon_color : (this.props.auction_type === types.ENGLISH) ? "primary" : "error"
        }

        //store general information about the auction in state
        this.state.contract.at(this.state.addr).then(async(instance) =>{
            console.log("auction contract: ", instance);

            const updateInfo = (fun, name) => {
                fun().then(result => { this.setState({name : result}); });
            };

            updateInfo(instance.getSeller, "seller");
            //console.log(updateInfo(instance.getSeller));
            this.setState({
                //seller: updateInfo(instance.getSeller),
                winning_bidder : await instance.getWinningBidder(),
                winning_bid : (await instance.getWinningBid()).toString(),
                preBiddingLength: (await instance.getPreBiddingLength()).toString(),
                biddingLength: (await instance.getBiddingLength()).toString(),
                postBiddingLength: (await instance.getPostBiddingLength()).toString(),
                auctionLength: (await instance.getAuctionLength()).toString(),
                currentPhase: this.stringifyPhase(await instance.getCurrentPhase())
            })
        });
    }

    componentDidMount(){
        this.state.contract.at(this.state.addr).then(async(instance) =>{
            //subscribe to the dispatcher in order to listen to new mined blocks
            this.props.dispatcher.addEventSubscriber("newBlock", this.state.addr, () => { 
                //check the current phase
                instance.getCurrentPhase().then((phase) => {
                    //update information panel
                    this.setState({currentPhase: this.stringifyPhase(phase)});

                    //if auction ended, trigger finalize()
                    if(phase.toString() === phases.END){
                        if(this.props.account === this.state.winning_bidder || this.props.account === this.state.seller){
                            //unsubscribe from event dispatcher, because the auction is ended
                            this.props.dispatcher.removeEventSubscriber("newBlock", this.state.addr);

                            //trigger finalize
                            instance.finalize({from : this.props.account});
                        }
                    }
                }); 
            });

            //set up event listeners
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

    //get the bid value from the text field and store it in the state
    handleTextFieldChange = (e) => {
        this.setState({
            bid_value : e.target.value
        });
    };

    //send the bid transaction
    handleBidButton = () =>{
        this.state.contract.at(this.state.addr).then(async(instance) => {
            instance.bid({from : this.props.account, value : this.state.bid_value});
        }).catch(err => {
            console.log('error: ', err.message);
        });
    };

    //used to display the phase in the auction card
    stringifyPhase = (phase) => {
        if(phase.toString() === phases.PREBID){
            return "PREBID";
        }
        else if(phase.toString() === phases.BID){
            return "BID";
        }
        else if(phase.toString() === phases.POSTBID){
            return "POSTBID";
        }
        else return "END";
    };

    //Render different functionalities, depending on the auction type
    renderByType = (props) => {
        const type = props.auction_type;

        if(type === types.ENGLISH){
            return(
                <Grid
                    container
                    direction="row"
                    justify="center"
                    alignItems="center"
                >
                    <TextField
                        id="bid-field"
                        label="bid (in wei)"
                        margin="normal"
                        onChange={this.handleTextFieldChange}
                    />
                    <Button id="bid-button"onClick={this.handleBidButton} color="primary">
                        Bid
                    </Button>
                </Grid>
            );
        }
        else{
            return(
                <p>missing</p>
            );
        }
    }

    render(){
        const { classes } = this.props;
       
        //<Paper className={`${classes.paper} ${classes[this.props.auction_type]}`}>
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
                        Current phase: <b>{this.state.currentPhase}</b>
                    </Typography>
                </Grid>
                <Button 
                    color="primary" 
                    className={classes.button} 
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
                    Current phase: <b>{this.state.currentPhase} </b><br/>
                    <br/>
                    Winning Bidder: <b>{this.state.winning_bidder}</b><br/>
                    Winning Bid (in wei): <b>{this.state.winning_bid}</b>
                </DialogContentText>
                <this.renderByType auction_type={this.state.type}/>
                </DialogContent>
                <DialogActions>
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
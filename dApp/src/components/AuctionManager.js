import React, { Component } from 'react';
import { withStyles } from '@material-ui/core'
import Grid from '@material-ui/core/Grid';
import Snackbar from '@material-ui/core/Snackbar';

import Auction from "./Auction";

//enum: auction's phases
const phases = {
	PREBID: '0',
	BID: '1',
	POSTBID: '2', 
	END: '3'
};

const styles = (theme) => ({
	root: {
		flexGrow: 1,
	},
});

//Dispatch events and display the auctions
class AuctionManager extends Component {
    constructor(props){
        super(props);

        this.state = {
			auctions: {}, //addresses of the deployed, not finalized, auctions
			open_snackbar : false, //used to open a snackbar
        	snackbar_msg : '' //message to show in the snackbar
        }
    }
    
    componentDidMount(){
		//Retrive the factory instance
		this.props.contracts[this.props.types.FACTORY].deployed().then(async(instance) => {
			console.log("factory contract: ", instance);

			//Set listener to retrieve and display newly deployed auctions
			const newAuctionsListener = (eventFun, type) => {
				eventFun.on('data', (event) => {
					console.log("deployed contract event: ", event);

					//add auction to the manager grid
					this.addAuction(event.returnValues[0], type);
				});
			};

			//exec aux function
			newAuctionsListener(instance.newEnglishAuctionEvent(), this.props.types.ENGLISH);
			newAuctionsListener(instance.newVickeryAuctionEvent(), this.props.types.VICKERY);

			//Don't render the finalized auctions
			const removeFinalizedAuctions = (auctions, type) => {
				if(auctions != null){
					auctions.forEach((addr) => {
						//retrieve auction instance
						this.props.contracts[type].at(addr).then(async(instance) => {
							instance.getCurrentPhase().then((result) => {
								if(result.toString() !== phases.END){
									this.addAuction(addr, type);
								}
							});
						});
					});
				}
			}
			
			//exec aux function
			instance.getEnglishAuctions().then(async(auctions) => { 
				removeFinalizedAuctions(auctions, this.props.types.ENGLISH);
			});
			instance.getVickeryAuctions().then(async(auctions) => { 
				removeFinalizedAuctions(auctions, this.props.types.VICKERY);
			});
		});

		//subscribe to the dispatcher in order to listen to finalized auctions
		//and display an alert
		this.props.dispatcher.addEventSubscriber("auctionEnd", 0, (data) => {
			if(data.addr !== undefined){
				console.log("remove ended auction");
				delete this.state.auctions[data.addr];

				var msg = '';
				if(data.winning_bidder !== undefined && data.winning_bid !== undefined){
					msg = "bidder "+data.winning_bidder+" won auction "+data.addr
				}
				else{
					msg = "no winner for auction "+data.addr
				}

				//show notification
				this.handleSnackBar(true, msg);
			}
			else{
				console.error("AUCTIONEND NOTIFICATION ERROR: INCOMPLETE DATA")
			}
		});

		//subscribe to the dispatcher in order to listen to refund event
		//and alert the (correct) user using the snackbar
		this.props.dispatcher.addEventSubscriber("refund", 0, (data) => {
			if(data.addr !== undefined && data.amount !== undefined){
				//show notification
				this.handleSnackBar(true, "refunded by auction "+data.addr+" ( "+data.amount+" wei )");
			}
			else{
				console.error("REFUND NOTIFICATION ERROR: INCOMPLETE DATA")
			}
		});
    }

	//Adds a new auction to the auction list, that will be
	//display in the bidder section throught the auction manager
    addAuction = (addr, type) => {
        this.setState(oldState => ({
			...oldState,
			auctions: {
				...oldState.auctions,
				[addr]: type
			}
		}));
    }

	//open and close the SnackBar (used to display alerts)
    handleSnackBar = (flag, msg) => {
        this.setState({open_snackbar : flag, snackbar_msg : msg});
	};
	
    render(){
        const { classes } = this.props;

        return(
            <React.Fragment>
                <Grid container className={classes.root} spacing={2} direction="column-reverse" justify="space-evenly" alignItems="stretch">
                    {/* map each auction to a card */}
					{Object.keys(this.state.auctions).map((addr) => (
                        <Grid key={addr} item>
                           <Auction 
                                auction_addr={addr} 
                                auction_type={this.state.auctions[addr]}
								auction_json={this.props.contracts[this.state.auctions[addr]]}
								account={this.props.account}
								dispatcher={this.props.dispatcher}
                            />
                        </Grid>
                    ))}
                </Grid>

				<Snackbar
                	anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                	autoHideDuration={3000}
                	open={this.state.open_snackbar}
                	onClose={() => this.handleSnackBar(false, "")}
                	message={this.state.snackbar_msg}
            	/>
            </React.Fragment>
        );
    }
}

export default withStyles(styles)(AuctionManager);
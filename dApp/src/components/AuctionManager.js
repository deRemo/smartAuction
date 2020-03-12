import React, { Component } from 'react';
import { withStyles } from '@material-ui/core'
import Grid from '@material-ui/core/Grid';
import Snackbar from '@material-ui/core/Snackbar';

import Auction from "./Auction";

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
		//Retrieve the factory instance
		this.props.contracts[this.props.types.FACTORY].deployed().then(async(instance) => {
			console.log("factory contract: ", instance);

			//Set listener to retrieve and display newly deployed auctions
			const newAuctionsListener = (eventFun, type) => {
				eventFun.on('data', (event) => {
					console.log("deployed contract event: ", event);

					//add auction to the manager grid
					this.addAuction(event.returnValues[0], type);

					//snackbar notification
					this.handleSnackBar(true, "New "+type+" at "+event.returnValues[0]);
				});
			};

			//exec aux function
			newAuctionsListener(instance.newEnglishAuctionEvent(), this.props.types.ENGLISH);
			newAuctionsListener(instance.newVickeryAuctionEvent(), this.props.types.VICKERY);

			//Don't render the finalized auctions
			const removeFinalizedAuctions = (auctions, type) => {
				if(auctions.length > 0){
					auctions.forEach((addr) => {
						this.props.web3.eth.getCode(addr).then((res) => {
							//check that the auction didn't self-destruct
							if(res !== "0x" && res !== "0x0"){
								//retrieve auction instance
								this.props.contracts[type].at(addr).then(async(instance) => {
									//if finalized, remove the auction from the list
									instance.isFinalized().then((finalized) => {
										if(!finalized){
											this.addAuction(addr, type);
										}
										else{
											//notify the factory manager about the finalized auction
											this.props.dispatcher.dispatch('finalized', { addr : addr });
										}
									});
								});
							}
						}).catch(err => {console.log(err)});
					});
				}
			}
			
			//exec aux function
			instance.getEnglishAuctions().then(async(auctions) => { 
				removeFinalizedAuctions(auctions, this.props.types.ENGLISH);
			}).catch(err => {console.error("did you deploy the auction factory via truffle migrate?", err)});
			
			instance.getVickeryAuctions().then(async(auctions) => { 
				removeFinalizedAuctions(auctions, this.props.types.VICKERY);
			}).catch(err => {console.error("did you deploy the auction factory via truffle migrate?", err)});
		}).catch(err => {console.error("did you deploy the auction factory via truffle migrate?", err)});

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
				console.log(msg);
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
				const msg = "refunded by auction "+data.addr+" ( "+data.amount+" wei )"
				this.handleSnackBar(true, msg);
				console.log(msg)
			}
			else{
				console.error("REFUND NOTIFICATION ERROR: INCOMPLETE DATA")
			}
		});

		//subscribe to log event for debug purposes
		this.props.dispatcher.addEventSubscriber("debug", 0, (data) => {
			if(data.msg !== undefined && data.val !== undefined){
				//show notification
				this.handleSnackBar(true, "msg: "+data.msg+"  |  val: "+data.val);
			}
			else{
				console.error("DEBUG NOTIFICATION ERROR: INCOMPLETE DATA")
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
								web3={this.props.web3}
								currentBlock={this.props.currentBlock}
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
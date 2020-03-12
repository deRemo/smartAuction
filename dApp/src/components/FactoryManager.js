import React, { Component } from 'react';

import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';

class FactoryManager extends Component {
    constructor(props){
        super(props);

        this.state = {
            open : false,
            anchorEl : null,
            auctions : [],
        }
    }

    componentDidMount(){
        this.props.dispatcher.addEventSubscriber("finalized", 0, (data) => {
            //subscribe to the dispatcher in order to receive the addresses
            //of finalized auctions, in order to collect the fees
			if(data.addr !== undefined){
                this.setState(oldState => ({
                    auctions : [...oldState.auctions, data.addr],
                }));
			}
			else{
				console.error("AUCTIONEND NOTIFICATION ERROR: INCOMPLETE DATA")
			}
		});
    }

    isOwner = () => {
        return this.state.auctioneer === this.props.account;
    }

    anyAuction = () => {
        return this.state.auctions.length > 0;
    }

    handleMenuOpen = event => {
        if(this.anyAuction()){
            this.setState({
                open : true,
                anchorEl : event.currentTarget,
            });
        }
    };
    
    handleClick = (auction) =>{
        this.props.contracts[this.props.types.BASE].at(auction).then(async(instance) => {
            //collect fee from selected items
            instance.collect({from : this.props.account}).then(() =>{
                //filter out the destroyed auction
                this.setState({
                    auctions : this.state.auctions.filter((addr) => {
                                    return addr !== auction;
                            }),
                });
                
                //Close menu
                if(!this.anyAuction()){
                    this.handleClose();
                }
            });
        });
    };

    handleClose = () => {
        //Close menu
        this.setState({
            open : false,
            anchorEl : null,
        })
    };

    handleFactoryDestruction = () => {
        if(this.isOwner()){
            this.props.contracts[this.props.types.FACTORY].deployed().then(async(instance) => {
                instance.closeFactory({from : this.props.account}).then(() => {
                    console.log("smart auction factory closed");
                }).catch(err => {console.error("did you deploy the auction factory via truffle migrate?", err)});
            }).catch(err => {console.error("did you deploy the auction factory via truffle migrate?", err)});
        }
    }
    
    render(){
        return(
            <React.Fragment>
                <Button 
                    onClick={this.handleMenuOpen}
                    disabled={!this.anyAuction()}
                    color="primary"
                >
                    Collect Fees
                </Button>
                 <Menu
                    id="auction-menu"
                    anchorEl={this.state.anchorEl}
                    keepMounted
                    open={this.state.open}
                    onClose={this.handleClose}
                    PaperProps={{
                        style: {
                            maxHeight: 48 * 4.5,
                            width: 430,
                        },
                    }}
                >
                    {this.state.auctions.map(auction => (
                    <MenuItem key={auction} onClick={() => {this.handleClick(auction)}}>
                        {auction}
                    </MenuItem>
                    ))}
                </Menu>

                <Button 
                    onClick={this.handleFactoryDestruction} 
                    color="primary"
                    disabled={!this.isOwner()}
                >
                    Destroy Auction Factory
                </Button>
            </React.Fragment>
        );
    }
}

export default FactoryManager;
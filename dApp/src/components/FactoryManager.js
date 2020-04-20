//react & material-ui
import React, { Component } from 'react';

import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';

class FactoryManager extends Component {
    constructor(props){
        super(props);

        this.state = {
            openMenu : false, //used to open the collectable auction menu
            anchorEl : null,
            isClose : false, //check if auction factory is destroyed
            auctions : [], //auctions finalized that need to be collected
        }
    }

    componentDidMount(){
        //Retrieve the owner of the factory (the auctioneer)
        this.props.contracts[this.props.types.FACTORY].deployed().then(async(instance) => {
            this.setState({
                auctioneer : await instance.getOwner(),
            })
        }).catch(err => {console.error("DID YOU DEPLOY THE AUCTION FACTORY VIA TRUFFLE MIGRATE?", err)});
        
        //subscribe to the dispatcher in order to receive the addresses
        //of finalized auctions, in order to collect the fees
        this.props.dispatcher.addEventSubscriber("collectable", 0, (data) => {
			if(data.addr !== undefined){
                this.setState(oldState => ({
                    auctions : [...oldState.auctions, data.addr],
                }));
			}
			else{
				console.error("COLLECTRABLE NOTIFICATION ERROR: INCOMPLETE DATA")
			}
		});
    }

    isOwner = () => {
        return this.state.auctioneer === this.props.account;
    }

    anyAuction = () => {
        return this.state.auctions.length > 0;
    }

    //Used to open/close the collectable auctions' menu
    handleMenu = event => {
        if(this.anyAuction() && this.isOwner() && !this.state.openMenu){
            this.setState({
                openMenu : true,
                anchorEl : event.currentTarget,
            });
        }
        else{
            this.setState({
                openMenu : false,
                anchorEl : null,
            });
        }
    };
    
    //Used to invoke collect() on the selected auction
    handleClick = (auction) =>{
        if(this.isOwner()){
            this.props.contracts[this.props.types.BASE].at(auction).then(async(instance) => {
                //collect fee from selected items
                instance.collect({from : this.props.account}).then(() =>{
                    //filter out the destroyed auction
                    this.setState({
                        auctions : this.state.auctions.filter((addr) => { return addr !== auction;}),
                    });
                    
                    //close the menu (if no more auctions to collect)
                    this.handleMenu();
                });
            });
        }
    };

    handleFactoryDestruction = () => {
        if(this.isOwner()){
            this.props.contracts[this.props.types.FACTORY].deployed().then(async(instance) => {
                instance.closeFactory({from : this.props.account}).then(() => {
                    console.log("smart auction factory closed");

                    //close factory
                    this.setState({
                        isClose : true,
                    });
                }).catch(err => {console.error("DID YOU DEPLOY THE AUCTION FACTORY VIA TRUFFLE MIGRATE?", err)});
            }).catch(err => {console.error("DID YOU DEPLOY THE AUCTION FACTORY VIA TRUFFLE MIGRATE?", err)});
        }
    }
    
    render(){
        return(
            <React.Fragment>
                <Button 
                    onClick={this.handleMenu}
                    disabled={!(this.anyAuction() && this.isOwner())}
                    color="primary"
                >
                    Collect Fees
                </Button>
                 <Menu
                    id="auction-menu"
                    anchorEl={this.state.anchorEl}
                    keepMounted
                    open={this.state.openMenu}
                    onClose={this.handleMenu}
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
                    disabled={!(!this.state.isClose && !this.anyAuction() && this.isOwner())}
                >
                    Destroy Auction Factory
                </Button>
            </React.Fragment>
        );
    }
}

export default FactoryManager;
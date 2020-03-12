//react part
import React, { Component } from 'react';
import { withStyles } from '@material-ui/core'
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';

//contract part
import Web3 from 'web3';
import TruffleContract from 'truffle-contract';

import smartAuction from './build/contracts/smartAuction.json';
import englishAuction from './build/contracts/englishAuction.json';
import vickeryAuction from './build/contracts/vickeryAuction.json';
import smartAuctionFactory from './build/contracts/smartAuctionFactory.json';

//custom component part
import NavBar from "./components/Navbar";
import AuctionCreator from "./components/AuctionCreator";
import AuctionManager from "./components/AuctionManager";
import FactoryManager from "./components/FactoryManager";

//utils
import EventDispatcher from "./utils/EventDispatcher";

//styles of the material-ui's components
const styles = theme => ({
	root: {
		flexGrow: 1,
	},

	control: {
		padding: theme.spacing(2),
	},
	
	paper: {
		padding: theme.spacing(3),
    	textAlign: 'center',
    	color: theme.palette.text.secondary,
	},
});

//enum: types of contract
const types = {
	BASE: 'smartAuction',
	ENGLISH: 'englishAuction',
	VICKERY: 'vickeryAuction',
	FACTORY: 'smartAuctionFactory'
};

class App extends Component {
	//App attribute

	constructor(props){
		super(props);
		
		//used to propagate events locally (in the dApp)
		this.dispatcher = new EventDispatcher();

		//React state
		this.state = {
			contracts: {}, //store contract abstractions
			account: undefined,
			currentBlock: undefined,
		}

		//Init web3
		if(typeof web3 != 'undefined') { // Check whether exists a provider, e.g Metamask
			this.web3Provider = window.ethereum; // !! new standard, since 2/11/18
			this.web3 = new Web3(this.web3Provider);
		
			try {
				// Permission popup
				window.ethereum.enable().then(async() => { console.log("DApp connected"); });
			}
			catch(error) { console.log(error); }
		} 
		else { // Otherwise, create a new local instance of Web3
				this.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545'); // <==
				this.web3 = new Web3(this.web3Provider);
		}
		console.log("web3 version " + this.web3.version);

		//Get contracts using truffle-contract and store them in state
		const retrieveContract = (type, json) => {
			this.state.contracts[type] = TruffleContract(json);
			this.state.contracts[type].setProvider(this.web3Provider);
		};

		//exec aux function
		retrieveContract(types.BASE, smartAuction);
		retrieveContract(types.ENGLISH, englishAuction);
		retrieveContract(types.VICKERY, vickeryAuction);
		retrieveContract(types.FACTORY, smartAuctionFactory);
	}

	componentDidMount(){
		//set an interval to get the current account and detect when 
		//it is changed (as recommended by metamask)
		setInterval(() => {
			this.web3.eth.getCoinbase(async(err, account) => {
				//convert address(they are stored in mixed case in the contracts)
				const mixed_case_account = this.web3.utils.toChecksumAddress(account);
				
				if(!err){
					if(mixed_case_account !== this.state.account){
						this.setState({ account : mixed_case_account });
						this.dispatcher.dispatch("accountSwitch", this.state.account);

						console.log("Account Address: "+ this.state.account);
					}
				}
				else{
					console.log(err);
				}
			});
		  }, 100);

		//Get current block number and propagate to the auctions 
		this.web3.eth.getBlockNumber(async(err, blockNum) => {
			if(!err){
				console.log("current block: " + blockNum);
				this.setState({ currentBlock : blockNum });
			}
		});

		//Check for new mined block: display the new block number
		//and propagate it to the auctions
		this.web3.eth.subscribe("newBlockHeaders", (error, event) => {
			if(!error) {
				this.setState({ currentBlock : event.number});

				//emits block event
				this.dispatcher.dispatch('newBlock', event.number);
			}
		});
	}

	render(){
		const { classes } = this.props;

		return (
			<React.Fragment>
				<NavBar currentBlock={this.state.currentBlock} account={this.state.account}/>
				<main>
					<Container maxWidth="lg">
						<Grid container className={classes.root} spacing={2} justify="center">
							<Grid item xs={10} sm={10}>
								<Paper className={classes.paper}>
									bidder
									<AuctionManager 
										types={types} 
										account={this.state.account} 
										contracts={this.state.contracts}
										dispatcher={this.dispatcher}
										web3={this.web3}
										currentBlock={this.state.currentBlock}
									/>
								</Paper>
							</Grid>
							<Grid item xs={10} sm={10}>
								<Paper className={classes.paper}>
									seller
									<AuctionCreator factory={this.state.contracts[types.FACTORY]} account={this.state.account}/>
								</Paper>
							</Grid>
							<Grid item xs={10} sm={10}>
								<Paper className={classes.paper}>
									auctioneer
									<p></p>
									<FactoryManager
										types={types}
										account={this.state.account}
										contracts={this.state.contracts}
										dispatcher={this.dispatcher}
									/>
								</Paper>
							</Grid>
						</Grid>
					</Container>

					<Container maxWidth="sm">
						<Box my={4}>
							<Typography variant="body2" color="textSecondary" align="center">
								smartAuction dApp made by Remo Andreoli [ P2P 2018/2019 ]
							</Typography>
						</Box>
					</Container>
				</main>
			</React.Fragment>
		);
	}
}

export default withStyles(styles)(App);
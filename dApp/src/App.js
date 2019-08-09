//react part
import React, { Component } from 'react';
import { withStyles } from '@material-ui/core'
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';

//contract part
import Web3 from 'web3';
import TruffleContract from 'truffle-contract';
import englishAuction from './build/contracts/englishAuction.json';
import vickeryAuction from './build/contracts/vickeryAuction.json';
import smartAuctionFactory from './build/contracts/smartAuctionFactory.json';

//custom component part
import NavBar from "./components/navbar";
import ContractCreator from "./components/auction_creator";
import AuctionManager from "./components/auction_manager";

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

class App extends Component {
	//App attribute

	constructor(props){
		super(props);

		this.state = {
			auctions: [],
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

		//Get contracts
		this.state.contracts["englishAuction"] = TruffleContract(englishAuction);
		this.state.contracts["englishAuction"].setProvider(this.web3Provider);
		
		this.state.contracts["vickeryAuction"] = TruffleContract(vickeryAuction);
		this.state.contracts["vickeryAuction"].setProvider(this.web3Provider);
		
		this.state.contracts["smartAuctionFactory"] = TruffleContract(smartAuctionFactory);
		this.state.contracts["smartAuctionFactory"].setProvider(this.web3Provider);

		//Init event handlers
		//Check for new mined block, to display the current block number
		this.web3.eth.subscribe("newBlockHeaders", (error, event) => {
			if(!error) {
				this.setState({ currentBlock: event.number});
			}
		});
		
		//factory event listener, to retrieve and display the deployed auctions
		this.state.contracts["smartAuctionFactory"].deployed().then(async(instance) => {
			console.log(instance);

			this.web3.eth.getBlockNumber(function (error, block) {
				instance.newEnglishAuctionEvent().on('data', function (event) {
					console.log("Event catched");
					console.log(event);
					// If event has parameters: event.returnValues.valueName
				});
			});
			
			/*this.web3.eth.subscribe('logs', {
					address: "0xD7c7e0329F61aa3B0f3F85BfA483fF9208c45A7e", 
					topics: ["0x89c2071d9fd4eb44012e6d6412a8e21f4b329bf4f1a4cdd3ed08958bb1764f3d"]
				}, 
				(error, event) => {
					if (!error)
						console.log(event);
				})
			.on("data", function(log){
				console.log(log);
			})
			.on("changed", function(log){
				console.log(log);
			});*/
		});
	}

	componentDidMount(){
		//Get current account
		this.web3.eth.getCoinbase(async(err, account) => {
            if(!err) {
				this.setState({ account: account });
				console.log("Account Address: "+ this.state.account);
                //$("#accountId").html("Account Address: " + account); //accountId is a piece of plain text
            }
		});

		//Get the current block number
		this.web3.eth.getBlockNumber(async(err, blockNum) => {
			if(!err){
				console.log("current block: " + blockNum);
				this.setState({ currentBlock: blockNum });
			}
		});
	}
	
	//add to the auctions array a new auction
    handleContractDeploy = (event) => {
        this.setState(oldState => ({
			...oldState,
            auctions: this.state.auctions.concat(Math.random()),
		}));
	}

	//create a new factory contract
	//used only ONCE to start the auction system
	handleFactoryDeploy = () => {
		this.state.contracts["smartAuctionFactory"].new({from: this.state.account}).then(instance => {
			console.log('factory contract deployed at address '+ instance.address);
			//factoryAddress = instance.address;
			
		}).catch(err => {
			console.log('error: factory contract not deployed', err);
		});
	}

	render(){
		const { classes } = this.props;

		return (
			<React.Fragment>
				<NavBar currentBlock={this.state.currentBlock}/>
				<main>
					<Container maxWidth="lg">
						<Grid container className={classes.root} spacing={2} justify = "center">
							<Grid item xs={10} sm={10}>
								<Paper className={classes.paper}>
									bidder
									<AuctionManager auctions={this.state.auctions} onDeploy={this.handleContractDeploy}/>
								</Paper>
							</Grid>
							<Grid item xs={10} sm={10}>
								<Paper className={classes.paper}>
									seller
									<ContractCreator factory={this.state.contracts["smartAuctionFactory"]} account={this.state.account} onDeploy={this.handleContractDeploy}/>
								</Paper>
							</Grid>
							<Grid item xs={10} sm={10}>
								<Paper className={classes.paper}>
									auctioneer
									<p></p>
									<Button onClick={() => this.handleFactoryDeploy()} variant="contained">
										Deploy Auction Factory!
									</Button>
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


/* OLD, FUNCTIONAL COMPONENT
import { makeStyles } from '@material-ui/core/styles';
const useStyles = makeStyles(theme => ({
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
}));

export default function App() {
	const classes = useStyles();

	const [state, setState] = React.useState({
        auctions: [],
	});
	
	//add to the auctions array a new auction
    const handleDeploy = (event) => {
        setState(oldState => ({
            ...oldState,
            auctions: state.auctions.concat(Math.random()),
        }));
	}
	
	return (
		<React.Fragment>
			<NavBar/>
			<main>
				<Container maxWidth="lg">
					<Grid container className={classes.root} spacing={2} justify = "center">
						<Grid item xs={10} sm={10}>
							<Paper className={classes.paper}>
								bidder
								<AuctionManager auctions={state.auctions} onDeploy={handleDeploy}/>
							</Paper>
						</Grid>
						<Grid item xs={10} sm={10}>
							<Paper className={classes.paper}>
								seller
								<ContractCreator onDeploy={handleDeploy}/>
							</Paper>
						</Grid>
						<Grid item xs={10} sm={10}>
							<Paper className={classes.paper}>auctioneer</Paper>
						</Grid>
					</Grid>
				</Container>

				<Container maxWidth="sm">
					<Box my={4}>
						<Typography variant="body2" color="textSecondary" align="center">
      						P2P 2018/2019 Final Project made by Remo Andreoli
    					</Typography>
					</Box>
				</Container>
			</main>
		</React.Fragment>
	);
}
*/
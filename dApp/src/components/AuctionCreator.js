//react part
import React, { Component } from 'react';
import { withStyles } from '@material-ui/core'
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';

//custom component part (WORK IN PROGRESS)
//import CustomTextField from "./ui/customTextField";

const styles = theme => ({
	root: {
		display: 'flex',
		flexWrap: 'wrap',
	},
	
	formControl: {
		margin: theme.spacing(1),
		minWidth: 120,
	},

	header:{
		margin: 0,
	},

	button:{
		margin: theme.spacing(1),
	},
});

class AuctionCreator extends Component {

	constructor(props){
		super(props);

		//state of the text fields used to configure the contract
		this.state = {
			//english auction
			en_reserve_price: '',
			buyout_price: '',
			unchallenged_length: '',
			increment: '',

			//vickery auction
			vk_reserve_price: '',
			min_deposit: '',
			commitment_length: '',
			withdrawal_length: '',
			opening_length: '',
		}
	}

	//handle the state in change due to user input
	handleTextFieldChange = (auctionType) => {
		auctionType.persist();
		this.setState(oldState => ({
		  ...oldState,
		  [auctionType.target.id]: auctionType.target.value,
		}));
	}

	//deploy the auction
	handleAuctionDeploy = (auctionType) => {
		this.props.factory.deployed().then(async(instance) =>{
			if(auctionType === "en"){
				instance.deployEnglishAuction(
					this.state["en_reserve_price"],
					this.state["buyout_price"],
					this.state["unchallenged_length"], 
					this.state["increment"],
					{from: this.props.account}
				);
			}
			else if(auctionType === "vk"){
				instance.deployVickeryAuction(
					this.state["vk_reserve_price"],
					this.state["min_deposit"],
					this.state["commitment_length"], 
					this.state["withdrawal_length"],
					this.state["opening_length"],
					{from: this.props.account}
				);
			}
			else{
				console.error("AUCTION CREATOR ERROR: AUCTION TYPE NOT DEFINED");
			}
		});
		console.log("deploying "+auctionType+" auction: ", this.state); //NOTE: use commas to print things
																	   //when mixing strings and objects
	}

	//Used by the text field to check if the input text is made of numbers only:
	//returns true if there is an alphabetical character, else false
	isNumberOnly = (field) => {
		return (this.state[field].match(/[a-z]/i) !== null);
	}

	//User by the text fields to check if the input text is empty:
	//return true if empty, else false
	isEmpty = (field) =>{
		return this.state[field] === "";
	}

	//if there is a field error or an empty field, disable the deploy button
	checkButtonError = (auctionType) => {
		var empty = true; //true if the fields are empty
		var wrong = true; //true if the fiels are wrongly filled
		
		var keys = Object.keys(this.state);
		var filtered_keys = keys.filter((k) => {
			return !this.isEmpty(k);
		}).filter((k) => {
			return !this.isNumberOnly(k);
		});

		console.log(filtered_keys);

		if(auctionType === "en"){
			empty = this.isEmpty("en_reserve_price") || this.isEmpty("buyout_price") ||
					this.isEmpty("unchallenged_length") ||  this.isEmpty("increment");

			wrong = this.isNumberOnly("en_reserve_price") || this.isNumberOnly("buyout_price") ||
					this.isNumberOnly("unchallenged_length") || this.isNumberOnly("increment");
		}
		
		if(auctionType === "vk"){
			//check if the fields are empty
			empty = this.isEmpty("vk_reserve_price") || this.isEmpty("min_deposit") ||
					this.isEmpty("commitment_length") ||  this.isEmpty("withdrawal_length") ||
					this.isEmpty("opening_length");

			//check if the fields are wrong
			wrong = this.isNumberOnly("vk_reserve_price") || this.isNumberOnly("min_deposit") ||
					this.isNumberOnly("commitment_length") || this.isNumberOnly("withdrawal_length") ||
					this.isNumberOnly("opening_length");
		}
		
		return empty || wrong;
	}

	render(){
		const { classes } = this.props;

		return (
			<React.Fragment>
				<h2 className={classes.header}>English</h2>
				<form className={classes.root} autoComplete="off">
					<FormControl className={classes.formControl}>
						<TextField 
							id="en_reserve_price" 
							label="Reserve Price"
							onChange={this.handleTextFieldChange}
							margin="none"
							error={this.isNumberOnly("en_reserve_price")}
							helperText={this.isNumberOnly("en_reserve_price") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(wei)</FormHelperText>
					</FormControl>
					<FormControl className={classes.formControl}>
						<TextField 
							id="buyout_price" 
							label="Buy Out"
							onChange={this.handleTextFieldChange}
							margin="none"
							error={this.isNumberOnly("buyout_price")}
							helperText={this.isNumberOnly("buyout_price") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(wei)</FormHelperText>
					</FormControl>
					<FormControl className={classes.formControl}>
						<TextField 
							id="increment" 
							label="Min. Increment"
							onChange={this.handleTextFieldChange}
							margin="none"
							error={this.isNumberOnly("increment")}
							helperText={this.isNumberOnly("increment") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(wei)</FormHelperText>
					</FormControl>
					<FormControl className={classes.formControl}>
						<TextField 
							id="unchallenged_length" 
							label="Unchallenged Length"
							onChange={this.handleTextFieldChange}
							margin="none"
							error={this.isNumberOnly("unchallenged_length")}
							helperText={this.isNumberOnly("unchallenged_length") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(blocks)</FormHelperText>
					</FormControl>
				</form>
				<Button 
					onClick={() => this.handleAuctionDeploy("en")} 
					color="primary"
					className={classes.button}
					disabled={this.checkButtonError("en")}
				>
					Deploy!
				</Button>
	
				<Divider variant="middle" />
	
				<h2 className={classes.header}>Vickery</h2>
				<form className={classes.root} autoComplete="off">
					<FormControl className={classes.formControl}>
						<TextField 
							id="vk_reserve_price" 
							label="Reserve Price"
							onChange={this.handleTextFieldChange}
							margin="none"
							error={this.isNumberOnly("vk_reserve_price")}
							helperText={this.isNumberOnly("vk_reserve_price") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(wei)</FormHelperText>
					</FormControl>
					<FormControl className={classes.formControl}>
						<TextField 
							id="min_deposit" 
							label="Min. Deposit"
							onChange={this.handleTextFieldChange}
							margin="none"
							error={this.isNumberOnly("min_deposit")}
							helperText={this.isNumberOnly("min_deposit") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(wei)</FormHelperText>
					</FormControl>
				</form>
				<form className={classes.root} autoComplete="off">
					<FormControl className={classes.formControl}>
						<TextField 
							id="commitment_length" 
							label="Commitment Phase Length"
							onChange={this.handleTextFieldChange}
							margin="none"
							error={this.isNumberOnly("commitment_length")}
							helperText={this.isNumberOnly("commitment_length") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(blocks)</FormHelperText>
					</FormControl>
					<FormControl className={classes.formControl}>
						<TextField 
							id="withdrawal_length" 
							label="Withdrawal Phase Length"
							onChange={this.handleTextFieldChange}
							margin="none"
							error={this.isNumberOnly("withdrawal_length")}
							helperText={this.isNumberOnly("withdrawal_length") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(blocks)</FormHelperText>
					</FormControl>
					<FormControl className={classes.formControl}>
						<TextField 
							id="opening_length" 
							label="Opening Phase Length"
							onChange={this.handleTextFieldChange}
							margin="none"
							error={this.isNumberOnly("opening_length")}
							helperText={this.isNumberOnly("opening_length") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(blocks)</FormHelperText>
					</FormControl>
				</form>
				<Button 
					onClick={() => this.handleAuctionDeploy("vk")} 
					color="primary"
					className={classes.button}
					disabled={this.checkButtonError("vk")}
				>
					Deploy!
				</Button>
			</React.Fragment>
		);
	}
}

export default withStyles(styles)(AuctionCreator);
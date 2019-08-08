//react part
import React, { Component } from 'react';
import { withStyles } from '@material-ui/core'
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';

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

class ContractCreator extends Component {

	constructor(props){
		super(props);

		//state of the text fields used to configure the contract
		this.state = {
			en_reserve_price: '',
			en_buyout_price: '',
			en_unchallenged_length: '',
			en_increment: '',

			vk_reserve_price: '',
			vk_min_deposit: '',
			vk_commitment_length: '',
			vk_withdrawal_length: '',
			vk_opening_length: '',
		}
	}

	//handle the state in change due to user input
	handleChange = (auctionType) => {
		auctionType.persist();
		this.setState(oldState => ({
		  ...oldState,
		  [auctionType.target.id]: auctionType.target.value,
		}));
	}

	//deploy the contract
	handleDeploy = (auctionType) => {
		if(auctionType === "en"){
			console.log("deploy en");
			this.props.factory.at("0xD7c7e0329F61aa3B0f3F85BfA483fF9208c45A7e").then(async(instance) =>{
				instance.deployEnglishAuction(
					this.state["en_reserve_price"],
					this.state["en_buyout_price"],
					this.state["en_unchallenged_length"], 
					this.state["en_increment"],
					{from: this.props.account}
				);
			});
		}
		else if(auctionType === "vk"){
			console.log("deploy vk");
			this.props.factory.deployed().then(async(instance) =>{
				instance.deployVickeryAuction(
					this.state["vk_reserve_price"],
					this.state["vk_min_deposit"],
					this.state["vk_commitment_length"], 
					this.state["vk_withdrawal_length"],
					this.state["vk_opening_length"],
					{from: this.props.account}
				);
			});
		}
		else{
			console.log("error: auction type not defined");
		}
		console.log(this.state);

		//add new card to the bidder section
		this.props.onDeploy();
	}

	//return true if there is an alphabetical character in the fild, else false (we want numbers only!)
	checkFieldError = (field) => {
		return (this.state[field].match(/[a-z]/i) !== null);
	}

	//return true if field is empty, else false
	checkFieldEmpty = (field) =>{
		return this.state[field] === "";
	}

	//if there is a field error, disable the correct button
	checkButtonError = (auctionType) => {
		var empty = true; //true if the fields are empty
		var wrong = true; //true if the fiels are wrongly filled
		
		if(auctionType === "en"){
			empty = this.checkFieldEmpty("en_reserve_price") || this.checkFieldEmpty("en_buyout_price") ||
					this.checkFieldEmpty("en_unchallenged_length") ||  this.checkFieldEmpty("en_increment");

			wrong = this.checkFieldError("en_reserve_price") || this.checkFieldError("en_buyout_price") ||
					this.checkFieldError("en_unchallenged_length") || this.checkFieldError("en_increment");
		}
		
		if(auctionType === "vk"){
			//check if the fields are empty
			empty = this.checkFieldEmpty("vk_reserve_price") || this.checkFieldEmpty("vk_min_deposit") ||
					this.checkFieldEmpty("vk_commitment_length") ||  this.checkFieldEmpty("vk_withdrawal_length") ||
					this.checkFieldEmpty("vk_opening_length");

			//check if the fields are wrong
			wrong = this.checkFieldError("vk_reserve_price") || this.checkFieldError("vk_min_deposit") ||
					this.checkFieldError("vk_commitment_length") || this.checkFieldError("vk_withdrawal_length") ||
					this.checkFieldError("vk_opening_length");
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
							onChange={this.handleChange}
							className={classes.textField}
							margin="none"
							error={this.checkFieldError("en_reserve_price")}
							helperText={this.checkFieldError("en_reserve_price") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(wei)</FormHelperText>
					</FormControl>
					<FormControl className={classes.formControl}>
						<TextField 
							id="en_buyout_price" 
							label="Buy Out"
							onChange={this.handleChange}
							className={classes.textField}
							margin="none"
							error={this.checkFieldError("en_buyout_price")}
							helperText={this.checkFieldError("en_buyout_price") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(wei)</FormHelperText>
					</FormControl>
					<FormControl className={classes.formControl}>
						<TextField 
							id="en_increment" 
							label="Min. Increment"
							onChange={this.handleChange}
							className={classes.textField}
							margin="none"
							error={this.checkFieldError("en_increment")}
							helperText={this.checkFieldError("en_increment") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(wei)</FormHelperText>
					</FormControl>
					<FormControl className={classes.formControl}>
						<TextField 
							id="en_unchallenged_length" 
							label="Unchallenged Length"
							onChange={this.handleChange}
							className={classes.textField}
							margin="none"
							error={this.checkFieldError("en_unchallenged_length")}
							helperText={this.checkFieldError("en_unchallenged_length") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(blocks)</FormHelperText>
					</FormControl>
				</form>
				<Button 
					onClick={() => this.handleDeploy("en")} 
					variant="contained" 
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
							onChange={this.handleChange}
							className={classes.textField}
							margin="none"
							error={this.checkFieldError("vk_reserve_price")}
							helperText={this.checkFieldError("vk_reserve_price") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(wei)</FormHelperText>
					</FormControl>
					<FormControl className={classes.formControl}>
						<TextField 
							id="vk_min_deposit" 
							label="Min. Deposit"
							onChange={this.handleChange}
							className={classes.textField}
							margin="none"
							error={this.checkFieldError("vk_min_deposit")}
							helperText={this.checkFieldError("vk_min_deposit") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(wei)</FormHelperText>
					</FormControl>
				</form>
				<form className={classes.root} autoComplete="off">
					<FormControl className={classes.formControl}>
						<TextField 
							id="vk_commitment_length" 
							label="Commitment Phase Length"
							onChange={this.handleChange}
							className={classes.textField}
							margin="none"
							error={this.checkFieldError("vk_commitment_length")}
							helperText={this.checkFieldError("vk_commitment_length") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(blocks)</FormHelperText>
					</FormControl>
					<FormControl className={classes.formControl}>
						<TextField 
							id="vk_withdrawal_length" 
							label="Withdrawal Phase Length"
							onChange={this.handleChange}
							className={classes.textField}
							margin="none"
							error={this.checkFieldError("vk_withdrawal_length")}
							helperText={this.checkFieldError("vk_withdrawal_length") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(blocks)</FormHelperText>
					</FormControl>
					<FormControl className={classes.formControl}>
						<TextField 
							id="vk_opening_length" 
							label="Opening Phase Length"
							onChange={this.handleChange}
							className={classes.textField}
							margin="none"
							error={this.checkFieldError("vk_opening_length")}
							helperText={this.checkFieldError("vk_opening_length") ? 'Numbers only!' : ''}
						/>
						<FormHelperText>(blocks)</FormHelperText>
					</FormControl>
				</form>
				<Button 
					onClick={() => this.handleDeploy("vk")} 
					variant="contained" 
					className={classes.button}
					disabled={this.checkButtonError("vk")}
				>
					Deploy!
				</Button>
			</React.Fragment>
		);
	}
}

export default withStyles(styles)(ContractCreator);

/* OLD, FUNCTIONAL COMPONENT
import { makeStyles } from '@material-ui/core/styles';
const useStyles = makeStyles(theme => ({
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
}));

export default function ContractCreator(props) {
	const classes = useStyles();

	//state of the text field used to configure the contract
	const [state, setState] = React.useState({
		en_reserve_price: '',
		en_buyout_price: '',
		en_increment: '',
		en_unchallenged_length: '',

		vk_reserve_price: '',
		vk_min_deposit: '',
		vk_commitment_length: '',
		vk_withdrawal_length: '',
		vk_opening_length: '',
	});

	//handle the state in change due to user input
	function handleChange(auctionType) {
		auctionType.persist();
		setState(oldState => ({
		  ...oldState,
		  [auctionType.target.id]: auctionType.target.value,
		}));

		//if (auctionType.target.value.match(/[a-z]/i)) {
		//}
	}

	//deploy the contract
	function handleDeploy(auctionType) {
		console.log(state);

		//add new card to the bidder section
		props.onDeploy();
	}

	return (
		<React.Fragment>
			<h2 className={classes.header}>English</h2>
			<form className={classes.root} autoComplete="off">
				<FormControl className={classes.formControl}>
					<TextField 
						id="en_reserve_price" 
						label="Reserve Price"
						onChange={handleChange}
						className={classes.textField}
						margin="none"
						error={state.en_reserve_price.match(/[a-z]/i)}
						helperText={state.en_reserve_price.match(/[a-z]/i) ? 'Numbers only!' : ''}
					/>
					<FormHelperText>(wei)</FormHelperText>
				</FormControl>
				<FormControl className={classes.formControl}>
					<TextField 
						id="en_buyout_price" 
						label="Buy Out"
						onChange={handleChange}
						className={classes.textField}
						margin="none"
					/>
					<FormHelperText>(wei)</FormHelperText>
				</FormControl>
				<FormControl className={classes.formControl}>
					<TextField 
						id="en_increment" 
						label="Min. Increment"
						onChange={handleChange}
						className={classes.textField}
						margin="none"
					/>
					<FormHelperText>(wei)</FormHelperText>
				</FormControl>
				<FormControl className={classes.formControl}>
					<TextField 
						id="en_unchallenged_length" 
						label="Unchallenged Length"
						onChange={handleChange}
						className={classes.textField}
						margin="none"
					/>
					<FormHelperText>(blocks)</FormHelperText>
				</FormControl>
			</form>
			<Button onClick={handleDeploy} variant="contained" className={classes.button}>Deploy!</Button>

			<Divider variant="middle" />

			<h2 className={classes.header}>Vickery</h2>
			<form className={classes.root} autoComplete="off">
				<FormControl className={classes.formControl}>
					<TextField 
						id="vk_reserve_price" 
						label="Reserve Price"
						onChange={handleChange}
						className={classes.textField}
						margin="none"
					/>
					<FormHelperText>(wei)</FormHelperText>
				</FormControl>
				<FormControl className={classes.formControl}>
					<TextField 
						id="vk_min_deposit" 
						label="Min. Deposit"
						onChange={handleChange}
						className={classes.textField}
						margin="none"
					/>
					<FormHelperText>(wei)</FormHelperText>
				</FormControl>
			</form>
			<form className={classes.root} autoComplete="off">
				<FormControl className={classes.formControl}>
					<TextField 
						id="vk_commitment_length" 
						label="Commitment Phase Length"
						onChange={handleChange}
						className={classes.textField}
						margin="none"
					/>
					<FormHelperText>(blocks)</FormHelperText>
				</FormControl>
				<FormControl className={classes.formControl}>
					<TextField 
						id="vk_withdrawal_length" 
						label="Withdrawal Phase Length"
						onChange={handleChange}
						className={classes.textField}
						margin="none"
					/>
					<FormHelperText>(blocks)</FormHelperText>
				</FormControl>
				<FormControl className={classes.formControl}>
					<TextField 
						id="vk_opening_length" 
						label="Opening Phase Length"
						onChange={handleChange}
						className={classes.textField}
						margin="none"
					/>
					<FormHelperText>(blocks)</FormHelperText>
				</FormControl>
			</form>
			<Button onClick={handleDeploy} variant="contained" className={classes.button}>Deploy!</Button>
		</React.Fragment>
	);
}
*/
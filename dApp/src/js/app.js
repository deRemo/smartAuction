//App init phases

//1. Init web3
//2. Init smart contracts (read json files)
//3. Activate event listeners
//4. Render page (call smart contract functions useful for initialization)

App = {
	//Attributes
	contracts: {}, // Store contract abstractions
	web3Provider: null, // Web3 provider
	url: 'http://localhost:7545', // Url for web3
	
	//Functions
	init: function() { return App.initWeb3(); },
	initWeb3: function() { /* initialize Web3 */ 
		if(typeof web3 != 'undefined') { // Check whether exists a provider, e.g Metamask
			App.web3Provider = window.ethereum; // !! new standard, since 2/11/18
			web3 = new Web3(App.web3Provider);
		
			try {
				// Permission popup
				ethereum.enable().then(async() => { console.log("DApp connected"); });
			}
			catch(error) { console.log(error); }
		} 
		else { // Otherwise, create a new local instance of Web3
				App.web3Provider = new Web3.providers.HttpProvider(App.url); // <==
				web3 = new Web3(App.web3Provider);
		}

		return App.initContract(); 
	},

	initContract: function() {/* Upload the contract's */ 
		$.getJSON('englishAuction.json').done(function(c) {
			App.contracts["englishAuction"] = TruffleContract(c);
			App.contracts["englishAuction"].setProvider(App.web3Provider);
			
			return App.listenForEvents();
		});
	},

	listenForEvents: function() { /* Activate event listeners */ 
		App.contracts["englishAuction"].deployed().then(async (instance) => {
			web3.eth.getBlockNumber(function (error, block) {

				instance.noWinner().on('data', function (event) {
					$("#eventId").html("Event catched!");
				
					console.log("Event catched");
					console.log(event);
					// If event has parameters: event.returnValues.valueName
				});
			});
		});	
		return App.render(); 
	},

	render: function() { /* Render page */
		// Retrieve contract instance
		App.contracts["englishAuction"].deployed().then(async(instance) =>{
			//Get auctioneer address
			const au = await instance.getAuctioneer();
			console.log(au);
			$("#valueId").html("" + au);
		});
	},
	
	getBiddingLength: function() {
        App.contracts["englishAuction"].deployed().then(async(instance) =>{

			const len = await instance.getBiddingLength({from: App.account});
			console.log(len);
        });
	},
	
	getAuctionLength: function() {
        App.contracts["englishAuction"].deployed().then(async(instance) =>{

			const len = await instance.getAuctionLength({from: App.account});
			console.log(len);
        });
	},

	getAuctioneer: function() {
        App.contracts["englishAuction"].deployed().then(async(instance) =>{

			const au = await instance.getAuctioneer({from: App.account});
			console.log(au);
        });
    }
}

// Call init whenever the window loads
$(function() {
	$(window).on('load', function () {
		App.init();
	});
});

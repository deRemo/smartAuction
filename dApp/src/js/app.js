//App init phases

//1. Init web3
//2. Init smart contracts (read json files)
//3. Activate event listeners
//4. Render page (call smart contract functions useful for initialization)
const Web3 = require('web3');

App = {
	//Attributes
	contracts: {}, // Store contract abstractions
	web3Provider: null, // Web3 provider
	url: 'http://localhost:7545', // Url for web3
	account: '0x0',

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
		console.log("web3 version " + web3.version);

		return App.initContract(); 
	},

	initContract: function() {/* Upload the contract's */ 
		 // Get current account
		 web3.eth.getCoinbase(function(err, account) {
            if(err == null) {
                App.account = account;
                console.log("Account Address: "+ account);
                $("#accountId").html("Account Address: " + account); //accountId is a piece of plain text
            }
		});
		
		//still have to figure out how to use it
		$.getJSON('smartAuctionFactory.json').done(function(c) {
			App.contracts["smartAuctionFactory"] = TruffleContract(c);
			App.contracts["smartAuctionFactory"].setProvider(App.web3Provider);
		});

		$.getJSON('englishAuction.json').done(function(c) {
			App.contracts["englishAuction"] = TruffleContract(c);
			App.contracts["englishAuction"].setProvider(App.web3Provider);
			
			//not working
			/*App.contracts["englishAuction"].defaults({
				from: App.account,
				gas: 4712388,
				gasPrice: 100000000000
			});*/

			return App.listenForEvents();
		});
	},

	listenForEvents: function() { /* Activate event listeners */ 
		App.contracts["englishAuction"].deployed().then(async (instance) => {
			web3.eth.getBlockNumber(function (error, block) {
				instance.events.noWinner().on('data', function (event) {
					$("#eventId").html("Event catched!");
				
					console.log("Event catched");
					console.log(event);
					// If event has parameters: event.returnValues.valueName
				});
			});
		});	
		return App.render(); 
	},

	render: function() { /* Render useful information retrieved from the contracts */
		/*App.contracts["smartAuctionFactory"].deployed().then(async(instance) =>{
			const auctions = await instance.getAuctions();

			console.log(auctions);
			$("#valueId").html("" + au);
		});*/

		App.contracts["englishAuction"].deployed().then(async(instance) =>{
			//Get auctioneer address
			const au = await instance.getAuctioneer();

			console.log(au);
			$("#valueId").html("" + au);
		});
	},
	
	deploy: function(){
		/*App.contracts["smartAuctionFactory"].deployed().then(async(instance) =>{
			const auctionAddr = await instance.deployEnglishAuction(3,3,3,3);
			console.log(auctionAddr);
			App.contracts["englishAuction"].at(auctionAddr).then(async(instance) => {
				const bidded = await instance.bid({from: App.account, value: web3.toWei("10", 'wei')});
				console.log("bidded " + bidAmount + " wei at auction " + auctionAddr);
			});
		});*/
		
		App.contracts["englishAuction"].new(3,3,3,3,{from: App.account}).then(instance => {
			console.log('contract deployed at address '+ instance.address);

			addAuction(instance.address);
		}).catch(err => {
			console.log('error: contract not deployed', err);
		});
	},

	getBiddingLength: function() {
        App.contracts["englishAuction"].deployed().then(async(instance) =>{

			const len = await instance.getBiddingLength({from: App.account});
			console.log(len);
        });
	},

	bid: function() {
		const bidAmount = document.getElementById("bidField").value;
		const auctionAddr = getSelectedAuction();

		App.contracts["englishAuction"].at(auctionAddr).then(async(instance) => {
			const bidded = await instance.bid({from: App.account, value: web3.toWei(bidAmount, 'wei')});
			console.log("bidded " + bidAmount + " wei at auction " + auctionAddr);
		});
        /*App.contracts["englishAuction"].deployed().then(async(instance) =>{
			const bidded = await instance.bid({from: App.account, value: web3.toWei(bidAmount, 'wei')});
		});*/
	},

	wait: function() {
        App.contracts["englishAuction"].deployed().then(async(instance) =>{
			const len = await instance.wait({from: App.account});
			console.log("waiting..");
		});
	},

	finalize: function() {
        App.contracts["englishAuction"].deployed().then(async(instance) =>{
			const len = await instance.finalize({from: App.account});
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

// Call App init whenever the window loads
$(function() {
	$(window).on('load', function () {
		App.init();
	});
});

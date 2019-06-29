//App init phases

//1. Init web3
//2. Init smart contracts (read json files)
//3. Activate event listeners
//4. Render page (call smart contract functions useful for initialization)
var factoryAddress = 0x0;

const contractType = {
    ENGLISH_AUCTION: 'englishAuction',
    VICKERY_AUCTION: 'vickeryAuction',
    AUCTION_FACTORY: 'smartAuctionFactory'
}

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
		console.log("web3 version " + web3.version.api);

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

		web3.eth.getBlockNumber(function (err, block) {
			if(err == null){
				console.log(block);
				$("#currentBlock").html("current block: " + block);
			}
		});
		
		//still have to figure out how to use it
		$.getJSON(contractType.AUCTION_FACTORY+'.json').done(function(c) {
			App.contracts[contractType.AUCTION_FACTORY] = TruffleContract(c);
			App.contracts[contractType.AUCTION_FACTORY].setProvider(App.web3Provider);
		});

		//deploy factory
		/*App.contracts["smartAuctionFactory"].new({from: App.account}).then(instance => {
			console.log('factory contract deployed at address '+ instance.address);
			factoryAddress = instance.address;
			
		}).catch(err => {
			console.log('error: contract not deployed', err);
		});*/

		$.getJSON(contractType.ENGLISH_AUCTION+'.json').done(function(c) {
			App.contracts[contractType.ENGLISH_AUCTION] = TruffleContract(c);
			App.contracts[contractType.ENGLISH_AUCTION].setProvider(App.web3Provider);
			
			//not working
			/*App.contracts[contractType.ENGLISH_AUCTION].defaults({
				from: App.account,
				gas: 4712388,
				gasPrice: 100000000000
			});*/
			return App.listenForEvents();
		});
	},

	listenForEvents: function() { /* Activate event listeners */
		/*App.contracts["smartAuctionFactory"].at(factoryAddress).then(async (instance) => {
			web3.eth.getBlockNumber(function (error, block) {

				instance.newEnglishAuctionEvent().watch((error, result) => {
					if (error){
						console.log('Error in event handler: ' + error);
					}
					else{
						const res = JSON.stringify(result.args);
						addAuction(res[0]);  
						console.log('newEnglishAuctionEvent: ' + res);
					}
				});
			});
		});*/

		App.contracts[contractType.ENGLISH_AUCTION].deployed().then(async (instance) => {
			web3.eth.getBlockNumber(function (error, block) {

				instance.noWinnerEvent().watch((error, result) => {
					if (error){
						console.log('Error in event handler: ' + error);
					}
					else{
						  console.log('noWinnerEvent: ' + JSON.stringify(result.args));
					}
				});

				instance.newHighestBidEvent().watch((error, result) => {
					if (error){
						console.log('Error in event handler: ' + error);
					}
					else{
						  console.log('newHighestBidEvent: ' + JSON.stringify(result.args));
					}
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

		$("#factoryId").load("js/factoryAddress.txt", function(response, status, xhr) {
			if(response.length == 0){
				console.log("no factory");
			}
			else{
				factoryAddress = $('#factoryId').html();
				console.log("factory address is "+ factoryAddress);
			}
		});

		App.contracts[contractType.ENGLISH_AUCTION].deployed().then(async(instance) =>{
			//Get auctioneer address
			const au = await instance.getAuctioneer();

			console.log(au);
			$("#valueId").html("" + au);
		});
	},
	
	deploy: function(type){
		/*App.contracts["smartAuctionFactory"].at(factoryAddress).then(async(instance) =>{
			const auctionAddr = await instance.deployEnglishAuction(3,3,3,3);
			//console.log(auctionAddr);
			App.contracts[contractType.ENGLISH_AUCTION].at(auctionAddr).then(async(instance) => {
				const bidded = await instance.bid({from: App.account, value: web3.toWei("10", 'wei')});
				console.log("bidded " + bidAmount + " wei at auction " + auctionAddr);
			});
		});*/
		
		deployNewContract(type, 3, 3, 3, 3);
	},

	getBiddingLength: function() {
        App.contracts[contractType.ENGLISH_AUCTION].deployed().then(async(instance) =>{

			const len = await instance.getBiddingLength({from: App.account});
			console.log(len);
        });
	},

	bid: function() {
		const bidAmount = document.getElementById("bidField").value;
		const auctionAddr = getSelectedAuction();

		getAuctionInstance(contractType.ENGLISH_AUCTION, auctionAddr).then(async(instance) => {
			const bidded = await instance.bid({from: App.account, value: web3.toWei(bidAmount, 'wei')});
			console.log("bidded " + bidAmount + " wei at auction " + auctionAddr);
		});

		/*
		App.contracts[contractType.ENGLISH_AUCTION].at(auctionAddr).then(async(instance) => {
			const bidded = await instance.bid({from: App.account, value: web3.toWei(bidAmount, 'wei')});
			console.log("bidded " + bidAmount + " wei at auction " + auctionAddr);
		});*/
	},

	wait: function() {
        App.contracts[contractType.ENGLISH_AUCTION].deployed().then(async(instance) =>{
			const len = await instance.wait({from: App.account});
			console.log("waiting..");
		});
	},

	finalize: function() {
        App.contracts[contractType.ENGLISH_AUCTION].deployed().then(async(instance) =>{
			const len = await instance.finalize({from: App.account});
		});
	},
	
	getAuctionLength: function() {
        App.contracts[contractType.ENGLISH_AUCTION].deployed().then(async(instance) =>{

			const len = await instance.getAuctionLength({from: App.account});
			console.log(len);
        });
	},

	getAuctioneer: function() {
        App.contracts[contractType.ENGLISH_AUCTION].deployed().then(async(instance) =>{

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

//deploy a new contract, specifying the type and the list of parameters
function deployNewContract(type, ...params){
	App.contracts[type].new(...params, {from: App.account}).then(async(instance) => {
		console.log('contract ' + type + ' deployed at address '+ instance.address);
		addAuction(instance.address);
	}).catch(err => {
		console.log('error: contract not deployed', err);
	});
}

//get an auction instance from his type and address
function getAuctionInstance(auctionType, auctionAddr){
	return App.contracts[auctionType].at(auctionAddr);
}
const englishAuction = artifacts.require("englishAuction");

contract("englishAuction", function(accounts) => {
    it("test the correctness of the functions", async function() => {
    	const instance = await englishAuction.deployed();
	const result = await instance.getAuctionLength();
	
	console.log(result);
    });
});

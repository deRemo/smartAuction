//load the englishAuction.json from the build folder
const factory = artifacts.require("smartAuctionFactory");

module.exports = function(deployer){
	deployer.deploy(factory);
};

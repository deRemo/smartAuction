const Migrations = artifacts.require("Migrations");

//load the smartAuction.json from the build folder
const smartAuction = artifacts.require("smartAuction");

module.exports = function(deployer){
	deployer.deploy(Migrations);

	//deploy a new instance of smartAuction
	deployer.deploy(smartAuction);
};

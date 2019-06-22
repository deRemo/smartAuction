const Migrations = artifacts.require("Migrations");

//load the englishAuction.json from the build folder
const englishAuction = artifacts.require("englishAuction");

module.exports = function(deployer){
	deployer.deploy(Migrations);

	//deploy a new instance of englishAuction
	deployer.deploy(englishAuction, 3, 3, 3, 3);
};

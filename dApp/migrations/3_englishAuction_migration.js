//load the englishAuction.json from the build folder
const englishAuction = artifacts.require("englishAuction");

module.exports = function(deployer){
	//deploy a new instance of englishAuction
	deployer.deploy(englishAuction, 3, 3, 3, 3);
};

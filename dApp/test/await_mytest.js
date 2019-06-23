const englishAuction = artifacts.require("englishAuction");

contract("englishAuction", accounts => {
    it("test the correctness of the functions", () => {
		const instance = await englishAuction.deployed();
		const result = await instance.getAuctionLength();


		console.log(result);
    });
});

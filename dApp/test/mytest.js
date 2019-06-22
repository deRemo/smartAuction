const englishAuction = artifacts.require("englishAuction");

contract("englishAuction", accounts => {
    it("test the correctness of the functions", () => {
        englishAuction.deployed().then(instance => {
            instance.getAuctionLength().then(result => {
                assert.equal(result.toNumber(), 3, "result should be 3");
            });
        });
    });
});
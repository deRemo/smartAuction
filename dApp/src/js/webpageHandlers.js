//get the address of the selected auction of the select list
function getSelectedAuction() {
	var auctionList = document.getElementById("auctionList");
	var selectedAuction = auctionList.options[auctionList.selectedIndex].value;

	console.log("auction selected: " + selectedAuction);
	return selectedAuction;
}

//add an address to the select list
function addAuction(addr){
	var auctionList = document.getElementById("auctionList");

	//create new option element and add a text to it
	var newAuction = document.createElement('option');
	newAuction.appendChild(document.createTextNode(addr));
	newAuction.value = addr;

	//add to auctionList
	auctionList.append(newAuction);
}
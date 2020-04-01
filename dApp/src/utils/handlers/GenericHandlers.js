class GenericHandlers{
    constructor(){
        this.bid_value = "";
        this.nonce_value = "";
    }

    //get a value from a text field and store it in the state
    handleTextFieldChange = (e) => {
        if(e.target.id === "commit-field" || e.target.id === "bid-field"){
            this.bid_value = e.target.value;
        }
        else{
            this.nonce_value = e.target.value;
        }
    };

    //input field condition: empty field or numbers only
    inputFieldCondition = (field) =>{
        return field === "" || field.match(/^\d+$/) !== null;
    }

    //Requirements for an input field, in order to enable a button
    inputButtonConditions = (field) => {
        return field !== undefined &&
               field !== "" &&
               this.inputFieldCondition(field);
    };
}

export default GenericHandlers;
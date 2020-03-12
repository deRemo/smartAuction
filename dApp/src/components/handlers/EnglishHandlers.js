import React from 'react';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import DialogContentText from '@material-ui/core/DialogContentText';

//import GenericHandlers from './GenericHandlers';

//Specific handlers for english auctions, used to interact with them and
//manage the UI elements
class EnglishHandlers{
    constructor(phases){
        this.icon_color = "primary";
        this.phases = phases;

        //Prettier names to display to the end-user
        //(phase -> "pretty_phase")
        this.pretty_phases = Object.freeze({
            0 : 'GRACE',
            1 : 'BID',
            //phase 2 (postbid) is not used in english auction
            3 : 'END'
        });
        //this.gh = new GenericHandlers();
    }

    loadInfos = (state) => {
        state.contract.at(state.addr).then(async(instance) =>{
            return {
                increment : parseInt(await instance.getIncrement(), 10),
                buy_out : parseInt(await instance.getBuyOutPrice(), 10),
            };
        });
        /*const increment = instance.getIncrement().then((res) => {
            return parseInt(res, 10);
        });

        const buy_out = instance.getBuyOutPrice().then((res) => {
            return parseInt(res, 10);
        });*/
    }

    //check if the buyOut conditions are satistied:
    //>bid conditions have to be satisfied
    //>the seller has to enable buy outs
    //>the amount has to be greater or equal to the requested buy out
    buyOutConditions = (state) => {
        return state.currentPhase === this.phases.BID &&
               state.buy_out !== 0 &&
               parseInt(state.bid_value) >= state.buy_out;
    };

    //send the buyout transaction
    handleBuyOut = (state, props) =>{
        if(this.buyOutConditions(state)){
            state.contract.at(state.addr).then(async(instance) => {
                instance.buyOut({from : props.account, value : state.bid_value});
            }).catch(err => {
                console.log('error: ', err.message);
            });
        }
        else{
            console.error("invalid buy out");
        }
    };

    //check if the bid conditions for english auction are satisfied
    englishBidConditions = (state) => {
        return state.currentPhase === this.phases.BID &&
               parseInt(state.bid_value) >= state.winning_bid + state.increment;
    }

    //send the bid transaction
    handleBidButton = (state, props) =>{
        if(this.englishBidConditions(state)){
            state.contract.at(state.addr).then(async(instance) => {
                instance.bid({from : props.account, value : state.bid_value});
            }).catch(err => {
                console.log('error: ', err.message);
            });
        }
        else{
            console.error("invalid bid amount");
        }
    };

    renderDisplayArea = (state) => {
        return (
            <DialogContentText>
                Grace period (in blocks): <b>{state.preBiddingLength}</b><br/>
                Bidding period (in blocks): <b>{state.biddingLength} </b><br/>
                Total auction length (in blocks): <b>{state.auctionLength} </b><br/>
                Current phase: <b>{this.pretty_phases[state.currentPhase]} </b><br/>
                Buy Out Price (in wei): <b>{state.buy_out}</b>
            </DialogContentText>
        );
    }

    renderActionArea = (state, props, handleTextFieldChange, inputFieldCondition, inputButtonConditions) => {
        return (
            <Grid
                container
                direction="row"
                justify="flex-end"
            >
                <TextField 
                    id="bid-field"
                    label="bid (in wei)"
                    onChange={handleTextFieldChange}
                    error={!inputFieldCondition(state.bid_value)}
                    helperText={!inputFieldCondition(state.bid_value) ? 'Numbers only!' : ''}
                    margin="normal"
                    fullWidth
                />
                <Button 
                    id="buyout-button"
                    onClick={() => {this.handleBuyOut(state, props)}} 
                    disabled={!(inputButtonConditions(state.bid_value) && this.buyOutConditions(state, props))}
                    color="primary"
                >
                    Buy Out
                </Button>
                <Button 
                    id="bid-button"
                    onClick={() => {this.handleBidButton(state, props)}} 
                    disabled={!(inputButtonConditions(state.bid_value) && this.englishBidConditions(state, props))}
                    color="primary"
                >
                    Bid
                </Button>
            </Grid>
        );
    }
}

export default EnglishHandlers;
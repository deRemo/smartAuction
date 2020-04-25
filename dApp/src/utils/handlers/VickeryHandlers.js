//react & material-ui
import React from 'react';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import DialogContentText from '@material-ui/core/DialogContentText';

//Specific handlers for vickery auctions, used to interact with them and
//manage the UI elements
class VickeryHandlers{
    constructor(phases){
        this.icon_color = "error";
        this.phases = phases;

        //Prettier names to display to the end-user
        //(phase -> "pretty_phase")
        this.pretty_phases = Object.freeze({
            0 : 'GRACE',
            1.1 : 'COMMIT',
            1.2 : 'WITHDRAW',
            2 : 'REVEAL',
            3 : 'END'
        });
    }
    
    commitConditions = (state) => {
        return state.currentPhase === this.phases.COMMIT &&
               !state.account_committed && 
               parseInt(state.bid_value) >= state.deposit;
    }

    handleCommitButton = (state, props) => {
        if(this.commitConditions(state)){
            //create hash
            const hashedMsg = props.web3.utils.keccak256(props.web3.eth.abi.encodeParameters(['bytes32', 'uint'], [props.web3.utils.asciiToHex(state.nonce_value), state.bid_value]));
            console.log(hashedMsg);
            
            //send transaction
            state.contract.at(state.addr).then(async(instance) => {
                instance.bid(hashedMsg, {from : props.account, value : state.deposit});
            }).catch(err => {
                console.log('error: ', err.message);
            });
        }
        else{
            console.error("not commit phase");
        }
    }

    withdrawConditions = (state) => {
        return state.currentPhase === this.phases.WITHDRAW && state.account_committed;
    }

    handleWithdrawButton = (state, props) => {
        if(this.withdrawConditions(state)){
            //send transaction
            state.contract.at(state.addr).then(async(instance) => {
                instance.withdraw({from : props.account});
            }).catch(err => {
                console.log('error: ', err.message);
            });
        }
        else{
            console.error("not withdraw phase");
        }
    }

    revealConditions = (state) => {
        return state.currentPhase === this.phases.POSTBID &&
               state.account_committed;
    }

    handleRevealButton = (state, props) => {
        if(this.revealConditions(state)){
            //send transaction
            state.contract.at(state.addr).then(async(instance) => {
                instance.reveal(props.web3.utils.fromAscii(state.nonce_value), {from : props.account, value : state.bid_value});
            }).catch(err => {
                console.log('error: ', err.message);
            });
        }
        else{
            console.error("not reveal phase");
        }
    }

    renderDisplayArea = (state) => {
        return (
            <DialogContentText>
                Current phase: <b>{this.pretty_phases[state.currentPhase]} </b><br/>
                Phase change in <b>{state.remainingBlocks}</b> blocks <br/>
            </DialogContentText>  
        );
    }

    renderActionArea = (state, props, handleTextFieldChange, inputFieldCondition, inputButtonConditions) => {
        return(
            <Grid
                container
                direction="row"
                justify="flex-end"
            >
                <TextField 
                    id="commit-field"
                    label="Committed value (in wei)"
                    onChange={handleTextFieldChange}
                    error={!inputFieldCondition(state.bid_value)}
                    fullWidth
                />
                <TextField 
                    id="nonce-field"
                    label="nonce (in numbers)"
                    onChange={handleTextFieldChange}
                    error={!inputFieldCondition(state.nonce_value)}
                    helperText={"NOTE: by pressing COMMIT, you accept to spend "+state.deposit+" wei as a deposit"}
                    fullWidth
                />
                <Button 
                    id="commit-button" 
                    onClick={() => {this.handleCommitButton(state, props)}} 
                    disabled={!(inputButtonConditions(state.bid_value) && inputButtonConditions(state.nonce_value) && this.commitConditions(state, props))}
                    color="primary"
                >
                    Commit
                </Button>
                <Button 
                    id="withdraw-button" 
                    onClick={() => {this.handleWithdrawButton(state, props)}}
                    disabled={!(this.withdrawConditions(state, props))}
                    color="primary"
                >
                    Withdraw
                </Button>
                <Button 
                    id="reveal-button" 
                    onClick={() =>{this.handleRevealButton(state, props)}} 
                    disabled={!(inputButtonConditions(state.bid_value) && inputButtonConditions(state.nonce_value) && this.revealConditions(state, props))}
                    color="primary"
                >
                    Reveal
                </Button>
            </Grid>
        );
    }
}

export default VickeryHandlers;
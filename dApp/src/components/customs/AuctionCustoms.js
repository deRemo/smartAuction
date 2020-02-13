
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

//custom versions of some material ui components in order to
//increase re-usability in Auction.js

//returns true if there is an alphabetical character, else false
const isNumberOnly = (field) => {
    return field.match(/[a-z]/i) !== null;
};

//return true if empty, else false
const isEmpty = (field) => {
    return field === "";
};

//returns a custom TextField, that show an error message if the input is incorrect 
//pass as props: id, label, field value and onChange function
export function MyTextField(props){
    
    return(
        <React.Fragment>
            <TextField 
                id={props.id}
                label={props.label}
                onChange={props.onChange}
                error={isNumberOnly(props.field)}
                helperText={isNumberOnly(props.field) ? 'Numbers only!' : ''}
                margin="normal"
                fullWidth
            />
        </React.Fragment>
    );
}

//returns a custom button, that is disabled based on the field variable
export function MyButton(props){
    return(
        <React.Fragment>
            <Button 
                id={props.id}
                onClick={props.onClick}
                disabled={isNumberOnly(props.field) || isEmpty(props.field)}
                color="primary"
            >
                {props.value}
            </Button>
        </React.Fragment>
    );
}

import React from 'react';
import TextField from '@material-ui/core/TextField';
import FormHelperText from '@material-ui/core/FormHelperText';

//create a textField component by passing: id, label, field value and onChange function
export default function CustomTextField(props) {
    //return true if there is an alphabetical character in the fild, else false (we want numbers only!)
	const checkFieldError = (field) => {
		return (field.match(/[a-z]/i) !== null);
	}
    
    return(
        <React.Fragment>
            <TextField 
                id={props.id}
                label={props.label}
                onChange={props.onChange}
                margin="none"
                error={checkFieldError(props.field)}
                helperText={checkFieldError(props.field) ? 'Numbers only!' : ''}
            />
            <FormHelperText>(wei)</FormHelperText>
        </React.Fragment>
    );
}
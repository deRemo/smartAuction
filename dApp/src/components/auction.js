import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';

const useStyles = makeStyles(theme => ({
	root: {
		flexGrow: 1,
	},
	
	paper: {
        height: 140,
        width: 300,
    	textAlign: 'center',
        color: "theme.palette.text.secondary",
        background: "white",
    },
    
    button:{
		margin: theme.spacing(1),
	},
}));

export default function Auction(props) {
    const classes = useStyles();
    
    return(
        <React.Fragment>
            <Paper className={classes.paper}>
                <p>{props.creation_block}</p>
                <TextField 
                    id="Bid" 
                    label="Bid"
                    className={classes.textField}
                    margin="none"
				/>
                <Button variant="contained" className={classes.button}>Bid!</Button>
			</Paper>
        </React.Fragment>
    );
}
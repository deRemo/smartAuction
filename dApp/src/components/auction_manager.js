import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';

import Auction from "./auction";

const useStyles = makeStyles(() => ({
	root: {
		flexGrow: 1,
	},
}));

export default function AuctionManager(props) {
    const classes = useStyles();
    
    return(
        <React.Fragment>
            <Grid container className={classes.root} spacing={2} direction="row" justify="flex-start" alignItems="center">
                {props.auctions.map(addr => (
                    <Grid key={addr} item>
                       <Auction creation_block={addr} />
                    </Grid>
                ))}
            </Grid>
        </React.Fragment>
    );
}
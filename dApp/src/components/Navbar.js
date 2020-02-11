import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
}));

export default function NavBar(props) {
    const classes = useStyles();
    
    const [value, setValue] = React.useState(2);
    function handleChange(event, newValue) {
        setValue(newValue);
    }

    return (
        <div className={classes.root}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" className={classes.title}>
                        {props.currentBlock}
                    </Typography>
                    <Typography variant="h6" className={classes.title}>
                        You: {props.account}
                    </Typography>
                    <Tabs value={value} onChange={handleChange} aria-label="tabs">
                        <Tab label="Bidder"  />
                        <Tab label="Seller"  />
                        <Tab label="Auctioneer" />
                    </Tabs>
                </Toolbar>
            </AppBar>
        </div>
    );
}
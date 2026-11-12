import React, { useState, useEffect, useContext } from 'react';
import { Card, CardHeader, CardContent, Typography, Grid, Divider } from '@material-ui/core';

import { ExpenseTrackerContext } from '../../context/context';
import useStyles from './styles';
import Form from './Form/Form';
import List from './List/List';
import InfoCard from '../InfoCard';

const ExpenseTracker = () => {
  const classes = useStyles();
  const { balance, storageError } = useContext(ExpenseTrackerContext);

  return (
    <Card className={classes.root}>
      <CardHeader title="Entrate e spese" subheader="Federico Santorsola" />
      <CardContent>
        <Typography align="center" variant="h5">Saldo {new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(balance)}</Typography>
        <Typography variant="subtitle1" style={{ lineHeight: '1.5em', marginTop: '20px' }}>
          <InfoCard />
        </Typography>
        <Divider className={classes.divider} />
        {storageError && <p role="alert">{storageError}</p>}<Form />
      </CardContent>
      <CardContent className={classes.cartContent}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <List />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ExpenseTracker;

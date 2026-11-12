import React from 'react';
import { Card, CardHeader, CardContent, Typography } from '@material-ui/core';
import { Doughnut } from 'react-chartjs-2';

import useStyles from './styles';
import useTransactions from '../../useTransactions';

const DetailsCard = ({ title, subheader }) => {
  const { total, chartData } = useTransactions(title);
  const classes = useStyles();

  return (
    <Card className={title === 'Income' ? classes.income : classes.expense}>
      <CardHeader title={title === 'Income' ? 'Entrate' : 'Spese'} subheader={subheader} />
      <CardContent>
        <Typography variant="h5">{new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(total)}</Typography>
        {total > 0 ? <Doughnut data={chartData} options={{legend:{position:'bottom'}, maintainAspectRatio:true}} /> : <p>Nessun movimento da mostrare.</p>}
      </CardContent>
    </Card>
  );
};

export default DetailsCard;

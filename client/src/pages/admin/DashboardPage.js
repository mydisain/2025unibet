import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';

// Import the AdminTimeslotView component
import AdminTimeslotView from '../../components/admin/AdminTimeslotView';

const DashboardPage = () => {
  const { t } = useTranslation();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t('dashboard')}
      </Typography>

      <Grid container spacing={3}>
        {/* Main Timeslot View */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('timeslot_view', 'Timeslot View')}
            </Typography>
            <AdminTimeslotView />
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title={t('today_bookings', "Today's Bookings")} />
            <CardContent>
              <Typography variant="h3" align="center">
                {/* This would be connected to real data in a full implementation */}
                0
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title={t('available_karts', 'Available Karts')} />
            <CardContent>
              <Typography variant="h3" align="center">
                {/* This would be connected to real data in a full implementation */}
                9
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title={t('total_bookings', 'Total Bookings')} />
            <CardContent>
              <Typography variant="h3" align="center">
                {/* This would be connected to real data in a full implementation */}
                0
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


    </Container>
  );
};

export default DashboardPage;

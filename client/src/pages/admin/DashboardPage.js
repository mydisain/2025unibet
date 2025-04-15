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
            <AdminTimeslotView />
          </Paper>
        </Grid>
      </Grid>


    </Container>
  );
};

export default DashboardPage;

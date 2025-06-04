import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';

const AdminBookingsDialog = ({ 
  open, 
  onClose, 
  selectedTimeslot,
  timeslotBookings, 
  loading, 
  error 
}) => {
  const { t } = useTranslation();

  // Helper function to format timeslot for display
  const formatTimeslot = (startTime, endTime) => {
    return `${startTime} - ${endTime}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {selectedTimeslot && (
          <Typography variant="h6">
            {t('bookings_for_timeslot', 'Broneeringud ajavahemikule')} {formatTimeslot(selectedTimeslot.startTime, selectedTimeslot.endTime)}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        ) : (
          <Box>
            {timeslotBookings.length > 0 ? (
              timeslotBookings.map((booking, index) => (
                <Paper key={booking._id} sx={{ p: 2, mb: 3, backgroundColor: '#f8f8f8' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>
                        {booking.customerName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        <strong>{t('email', 'E-post')}:</strong> {booking.customerEmail}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        <strong>{t('phone', 'Telefon')}:</strong> {booking.customerPhone}
                      </Typography>
                      {booking.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          <strong>{t('notes', 'Märkused')}:</strong> {booking.notes}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom>
                        {t('booked_timeslots', 'Broneeritud ajad')}:
                      </Typography>
                      {booking.timeslots && booking.timeslots.length > 0 ? (
                        <Box>
                          {booking.timeslots.map((ts, tsIndex) => (
                            <Box 
                              key={tsIndex} 
                              sx={{ 
                                mb: 1, 
                                p: 1, 
                                backgroundColor: selectedTimeslot && ts.startTime === selectedTimeslot.startTime ? '#e3f2fd' : '#f5f5f5',
                                borderRadius: 1
                              }}
                            >
                              <Typography variant="body2" fontWeight="bold">
                                {formatTimeslot(ts.startTime, ts.endTime)}
                              </Typography>
                              {ts.karts && ts.karts.length > 0 ? (
                                <Box sx={{ pl: 2 }}>
                                  {ts.karts.map((kart, kartIndex) => (
                                    <Typography key={kartIndex} variant="body2">
                                      {kart.name}: {kart.quantity} {t('units', 'tk')}
                                    </Typography>
                                  ))}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  {t('no_karts_selected', 'Karte pole valitud')}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {t('no_timeslots_found', 'Ajavahemikke ei leitud')}
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              ))
            ) : (
              <Alert severity="info" sx={{ my: 2 }}>
                {t('no_bookings_for_timeslot', 'Selle ajavahemiku jaoks pole broneeringuid')}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t('close', 'Sulge')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminBookingsDialog;

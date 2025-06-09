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
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip
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
  
  // Group bookings by client for this timeslot
  const groupBookingsByClient = (bookings) => {
    const groupedBookings = {};
    
    bookings.forEach(booking => {
      // Create a unique key for each client
      const clientKey = `${booking.customerEmail}-${booking.customerPhone}`;
      
      if (!groupedBookings[clientKey]) {
        groupedBookings[clientKey] = {
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          notes: booking.notes,
          bookingIds: [booking._id],
          allTimeslots: [...booking.timeslots]
        };
      } else {
        groupedBookings[clientKey].bookingIds.push(booking._id);
        groupedBookings[clientKey].allTimeslots = [
          ...groupedBookings[clientKey].allTimeslots,
          ...booking.timeslots
        ];
      }
    });
    
    return Object.values(groupedBookings);
  };

  // Get all client bookings grouped by client
  const clientBookings = timeslotBookings.length > 0 ? groupBookingsByClient(timeslotBookings) : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle>
        {selectedTimeslot && (
          <Typography variant="h6">
            {t('bookings_for_timeslot', 'Broneeringud ajavahemikule')} {formatTimeslot(selectedTimeslot.startTime, selectedTimeslot.endTime)}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
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
            {clientBookings.length > 0 ? (
              clientBookings.map((client, index) => (
                <Paper key={index} sx={{ p: 3, mb: 3, backgroundColor: '#f8f8f8', borderLeft: '4px solid #2196f3' }}>
                  {/* Client Name - prominently displayed */}
                  <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
                    {client.customerName}
                  </Typography>
                  
                  {/* Client Contact Details */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <strong>{t('email', 'E-post')}:</strong>&nbsp;{client.customerEmail}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <strong>{t('phone', 'Telefon')}:</strong>&nbsp;{client.customerPhone}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {client.notes && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>{t('notes', 'Märkused')}:</strong> {client.notes}
                      </Typography>
                    </Box>
                  )}
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {/* Client Rides */}
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    {t('rides', 'Sõidud')}:
                  </Typography>
                  
                  <List>
                    {client.allTimeslots && client.allTimeslots.length > 0 ? (
                      client.allTimeslots.map((ts, tsIndex) => (
                        <ListItem 
                          key={tsIndex} 
                          sx={{ 
                            mb: 1, 
                            p: 2, 
                            backgroundColor: selectedTimeslot && ts.startTime === selectedTimeslot.startTime ? '#e3f2fd' : '#f5f5f5',
                            borderRadius: 1,
                            display: 'block'
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {formatTimeslot(ts.startTime, ts.endTime)}
                            </Typography>
                            <Chip 
                              size="small" 
                              label={t('ride', 'Sõit') + ' ' + (tsIndex + 1)}
                              color="primary" 
                              variant="outlined"
                            />
                          </Box>
                          
                          {ts.karts && ts.karts.length > 0 ? (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                                {t('selected_karts', 'Valitud kardid')}:
                              </Typography>
                              <Grid container spacing={1}>
                                {ts.karts.map((kart, kartIndex) => (
                                  <Grid item xs={12} sm={6} key={kartIndex}>
                                    <Paper 
                                      sx={{ 
                                        p: 1, 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        backgroundColor: kart.quantity > 1 ? '#e8f5e9' : '#fff'
                                      }}
                                    >
                                      <Typography variant="body2">
                                        {kart.name}
                                      </Typography>
                                      <Typography variant="body2" fontWeight="bold">
                                        {kart.quantity} {t('units', 'tk')}
                                      </Typography>
                                    </Paper>
                                  </Grid>
                                ))}
                              </Grid>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {t('no_karts_selected', 'Karte pole valitud')}
                            </Typography>
                          )}
                        </ListItem>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t('no_timeslots_found', 'Ajavahemikke ei leitud')}
                      </Typography>
                    )}
                  </List>
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
        <Button onClick={onClose} variant="contained">
          {t('close', 'Sulge')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminBookingsDialog;
